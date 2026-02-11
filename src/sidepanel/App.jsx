import React, { useState, useRef } from 'react';
import { useSpeech } from './hooks/useSpeech';
import VoiceInterface from './components/multimodal/VoiceInterface';
import { VOICE_COMMANDS } from '../utils/constants';
import { summarizeText, askQuestion } from '../lib/huggingface';
import { getLocalDescription } from './visionEngine';

function App() {
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [targetTabId, setTargetTabId] = useState(null);
  const [summary, setSummary] = useState("");
  const [imgIndex, setImgIndex] = useState(-1);
  const [progress, setProgress] = useState("");
  
  const speech = useSpeech();  
  const lastReadRef = useRef("");

  const speakAndTrack = (text) => {
    lastReadRef.current = text;
    speech.speak(text);
  };

  const runCommandOnPage = async (func, arg = null) => {
    let tabId = targetTabId;
    if (!tabId) {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (tab) {
        tabId = tab.id;
        setTargetTabId(tab.id);
      }
    }
    if (!tabId) {
      console.error("No target tab found. Please click the webpage once.");
      speakAndTrack("I can't find the webpage. Please click on the page once.");
      return;
    }

    const injection = {
      target: { tabId: tabId },
      func: func,
    };

    if (arg !== null) {
      injection.args = [arg];
    }

    try{
      await chrome.scripting.executeScript(injection);
      console.log("Script executed on tab:", targetTabId);
    }
    catch (error) {
      console.error("Navigation error:", error);
    }
  };

  const handleScan = async () => {
    if (loading) return;
    setLoading(true);
    setSummary("");
    setPageData(null);
    setProgress("Connecting to page...");

    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });

    if (!tab) {
      setLoading(false);
      speakAndTrack("Please click on the webpage first so I can find it.");
      return;
    }

    setTargetTabId(tab.id);

    const processImages = async (response) => {
      setPageData(response);
      setImgIndex(-1);
      speakAndTrack(`Scanned ${response.title}. Structure is ready. Analyzing images.`);

      const imagesToProcess = [...response.images];
      
      for (let i = 0; i < imagesToProcess.length; i++) {
        const currentImg = imagesToProcess[i];
        
        if (!currentImg.isAccessible) {
          setProgress(`Analyzing image ${i + 1}/${imagesToProcess.length}...`);
          
          try {
            const semanticInfo = await getLocalDescription(currentImg.src);
            
            setPageData(prev => {
              const updatedImages = [...prev.images];
              updatedImages[i] = { 
                ...updatedImages[i], 
                aiInterpretedText: semanticInfo,
                alt: `[AI Analysis]: ${semanticInfo}` 
              };
              return { ...prev, images: updatedImages };
            });
          } catch (err) {
            console.error("Vision error for image", i, err);
          }
        }
      }
      setProgress("");
      setLoading(false);
      speakAndTrack("Page interpretation complete.");
    };

    chrome.tabs.sendMessage(tab.id, { action: "SCAN_PAGE" }, async (response) => {
      if (chrome.runtime.lastError || !response) {
        console.warn("Content script missing. Injecting manually...");
        setProgress("Injecting assistive logic...");

        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["content.js"]
          });

          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, { action: "SCAN_PAGE" }, (res) => {
              if (res) {
                processImages(res);
              } else {
                setLoading(false);
                setProgress("Error: Cannot reach page.");
                speakAndTrack("I'm having trouble connecting. Please refresh the webpage.");
              }
            });
          }, 600);
        } catch (err) {
          setLoading(false);
          setProgress("Permission denied.");
          speakAndTrack("I cannot access this specific page. Try a standard website.");
        }
      } else {
        processImages(response);
      }
    });
  };

  const handleSearch = async (query) => {
    if (!pageData || !pageData.mainText) return;
    setLoading(true);
    setSummary(`Searching for "${query}" and interpreting context...`);
    speakAndTrack(`Searching for ${query}`);

    // Scroll and highlight with a temporary outline (No HTML modification)
    // Deterministic find for exact text matches
    runCommandOnPage((textToFind) => {
      window.getSelection().removeAllRanges();
      const found = window.find(textToFind, false, false, true, false, true, false);
      
      if (found) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const parentEl = range.startContainer.parentElement;
          
          const originalOutline = parentEl.style.outline;
          const originalBg = parentEl.style.backgroundColor;
          
          parentEl.style.outline = "5px solid #f9ab00";
          parentEl.style.outlineOffset = "4px";
          parentEl.style.transition = "outline 0.3s ease";
          parentEl.style.backgroundColor = "rgba(249, 171, 0, 0.2)";
          parentEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

          // Remove highlight after 4 seconds (Agent is temporary)
          setTimeout(() => {
            parentEl.style.outline = originalOutline;
            parentEl.style.backgroundColor = originalBg;
            window.getSelection().removeAllRanges();
          }, 4000);
        }
      }
    }, query);

    // AI Fallback (questions)
    try {
      const fullText = pageData.mainText.join(" ");
      const answer = await askQuestion(query, fullText);
      
      if (answer && answer.length > 0) {
        speakAndTrack(`AI Interpretation: ${answer}`);
        setSummary(`I found "${query}" on the page. AI Context: ${answer}`);      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSummarize = async () => {
    if (!pageData || !pageData.mainText || pageData.mainText.length === 0) {
      return speakAndTrack("There is no content found to summarize.");
    }
    
    setSummary("A.I. is analyzing the page... please wait.");
    setLoading(true);
    speakAndTrack("Generating a summary of the main content.");

    try {
      const textToAI = pageData.mainText.join(" ");
      
      const result = await summarizeText(textToAI);
      
      setSummary(result);
      speakAndTrack("Here is a summary of the page: " + result);
    } catch (err) {
      console.error(err);
      setSummary("The AI engine is currently warming up. Try again in 10 seconds.");
    } finally {
      setLoading(false);
    }
  };

  const handleVoiceCommand = (command) => {
    const text = command.toLowerCase();
    const isIntent = (cmdList) => cmdList && cmdList.some(word => text.includes(word));

    if (isIntent(VOICE_COMMANDS.STOP)) {
      speech.stopSpeaking();
      lastReadRef.current = "";
      return; 
    }

    if (isIntent(VOICE_COMMANDS.SUMMARISE) || text === "summarize") {
      handleSummarize();
      return;
    }

    if (isIntent(VOICE_COMMANDS.SPEED_UP) || isIntent(VOICE_COMMANDS.SLOW_DOWN)) {
      const isUp = isIntent(VOICE_COMMANDS.SPEED_UP);
      const newRate = isUp 
        ? Math.min(speech.rate + 0.4, 3.0) 
        : Math.max(speech.rate - 0.4, 0.5);
      
      speech.setRate(newRate);
      console.log("New Speed:", newRate);

      if (lastReadRef.current) {
        setTimeout(() => {
          speakAndTrack(lastReadRef.current);
        }, 50);
      } else {
        speakAndTrack(isUp ? "Faster" : "Slower");
      }
      return;
    }

    const isAction = text.includes("top") || text.includes("bottom") || text.includes("image") || 
                     text.includes("read") || text.includes("body") || text.includes("content") || 
                     text.includes("headings") || text.includes("summary") || text.includes("find") || 
                     text.includes("search") || text.includes("faster") || text.includes("slower");
    
    if (speech.isSpeaking && !isAction) return;

    // Navigation logic
    if (isIntent(VOICE_COMMANDS.NAV_TOP)) {
      speakAndTrack("Going to top.");
      runCommandOnPage(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }

    else if (isIntent(VOICE_COMMANDS.NAV_BOTTOM)) {
      speakAndTrack("Going to bottom.");
      runCommandOnPage(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
    }

    else if (text.includes("image") || text.includes("picture")) {
      if (!pageData || pageData.images.length === 0) return speakAndTrack("No images found.");
      
      setImgIndex((prevIndex) => {
        const newIdx = (prevIndex + 1) % pageData.images.length;
        const currentImg = pageData.images[newIdx];

        speakAndTrack(`Image ${newIdx + 1}: ${currentImg.alt}`);

        runCommandOnPage((targetSrc) => {
          const allImgs = Array.from(document.querySelectorAll('img'));
          const target = allImgs.find(img => img.src === targetSrc);
          
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target.style.outline = "8px solid #1a73e8";
            target.style.outlineOffset = "5px";
            setTimeout(() => (target.style.outline = "none"), 3000);
          }
        }, currentImg.src);

        return newIdx;
      });
    }

    else if (isIntent(VOICE_COMMANDS.READ_HEADINGS)) {
      if (!pageData) return speakAndTrack("Scan the page first.");
      speakAndTrack("The headings are: " + pageData.headings.map(h => h.text).join(", "));
    }

    else if (isIntent(VOICE_COMMANDS.READ_CONTENT) || text.includes("body")) {
      if (!pageData || !pageData.mainText || pageData.mainText.length === 0) return speakAndTrack("No content found.");
      speakAndTrack("Reading content: " + pageData.mainText.join(". "));
    }

    else if (text.includes("find") || text.includes("search") || isIntent(VOICE_COMMANDS.SEARCH)) {
      const query = text.replace("find", "").replace("search", "").replace("where is", "").replace("show me", "").trim();
      if (query.length > 0) handleSearch(query);
    }
  };

  return (
    <div style={{ padding: '1rem', fontFamily: 'sans-serif', color: '#333' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <h1 style={{ fontSize: '1.2rem', margin: 0, color: '#1a73e8' }}>Universal Assist</h1>
        <button onClick={() => window.open(chrome.runtime.getURL('permissions.html'))} style={{ fontSize: '10px' }}>Setup Mic</button>
      </div>
      
      <button onClick={handleScan} disabled={loading} style={{ padding: '12px', width: '100%', cursor: 'pointer', marginBottom: '10px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>
        {loading ? "Scanning..." : "Interpret Page"}
      </button>

      <VoiceInterface speech={speech} onCommand={handleVoiceCommand} pageTitle={pageData?.title} />

      {/* AI SUMMARY BOX */}
      {summary && (
        <div style={{ 
          marginTop: '15px', padding: '12px', 
          background: '#fef7e0', borderLeft: '5px solid #f9ab00', 
          borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          <h4 style={{ margin: '0 0 5px 0', fontSize: '11px', color: '#b06000', textTransform: 'uppercase' }}>
            Agent Interpretation
          </h4>
          <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.4', color: '#3c4043' }}>
            {summary}
          </p>
          <button 
            onClick={() => speakAndTrack(summary)} 
            style={{ marginTop: '8px', fontSize: '10px', background: 'white', border: '1px solid #f9ab00', borderRadius: '4px', cursor: 'pointer', padding: '2px 8px' }}
          >
            🔊 Repeat
          </button>
        </div>
      )}

      {pageData && (
        <div style={{ marginTop: '20px' }}>
          <h2 style={{ fontSize: '1.1rem', borderBottom: '2px solid #1a73e8', paddingBottom: '5px' }}>{pageData.title}</h2>
          
          <section>
            <h3 style={{ fontSize: '14px', color: '#1a73e8' }}>Page Structure</h3>
            <ul style={{ background: '#f4f4f4', padding: '10px', borderRadius: '8px', fontSize: '13px', listStyle: 'none' }}>
              {pageData.headings.map((h, i) => (
                <li key={i} style={{ marginBottom: '5px' }}>
                  <strong>[{h.level}]</strong> {h.text}
                </li>
              ))}
            </ul>
          </section>

          <section style={{ marginTop: '15px' }}>
            <h3 style={{ fontSize: '14px', color: '#1a73e8' }}>Main Content</h3>
            <div style={{ background: '#fff', padding: '10px', borderRadius: '8px', fontSize: '12px', border: '1px solid #eee', maxHeight: '150px', overflowY: 'auto' }}>
              {pageData.mainText.map((txt, i) => <p key={i} style={{ marginBottom: '8px' }}>{txt}</p>)}
            </div>
          </section>

          <section>
            <h3 style={{ fontSize: '14px', color: '#1a73e8' }}>Images Analysis ({pageData.images.length})</h3>
            {pageData.images.map((img, i) => (
              <div key={i} style={{ borderBottom: '1px solid #ddd', padding: '10px 0' }}>
                <div style={{ color: img.isAccessible ? 'green' : '#d93025', fontWeight: 'bold' }}>
                  {img.alt}
                </div>
                {img.aiInterpretedText && (
                  <div style={{ fontSize: '0.9em', color: '#555', marginTop: '4px', fontStyle: 'italic' }}>
                    🤖 Detected: {img.aiInterpretedText}
                  </div>
                )}
              </div>
            ))}
          </section>

        </div>
      )}
    </div>
  );
}

export default App;