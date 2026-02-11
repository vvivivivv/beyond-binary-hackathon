import React, { useState, useRef, useEffect } from 'react';
import { useSpeech } from './hooks/useSpeech';
import VoiceInterface from './components/multimodal/VoiceInterface';
import { VOICE_COMMANDS } from '../utils/constants';
import { summarizeText, askQuestion } from '../lib/huggingface';
import { getLocalDescription } from './visionEngine';
import UserProfile from './components/profile/UserProfile';

function App() {
  const [userProfile, setUserProfile] = useState(null);
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [targetTabId, setTargetTabId] = useState(null);
  const [summary, setSummary] = useState("");
  const [imgIndex, setImgIndex] = useState(-1);
  const [progress, setProgress] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);

  
  const speech = useSpeech();  
  const lastReadRef = useRef("");

  useEffect(() => {
    chrome.storage.sync.get(['userProfile'], (result) => {
      if (result.userProfile) {
        setUserProfile(result.userProfile);
        applyTheme(result.userProfile);
      }
    });
  }, []);
  
  const applyTheme = (profile) => {
    if (!profile) return;
    const { preferences } = profile;
    const root = document.documentElement;

    root.style.fontSize = `${preferences.fontSize}px`; 
    
    root.style.setProperty('--base-font-size', `${preferences.fontSize}px`);
    
    const contrastStyles = {
      normal: { bg: '#ffffff', text: '#333333', accent: '#1a73e8', border: '#dddddd' },
      high: { bg: '#ffffff', text: '#000000', accent: '#0000ee', border: '#000000' },
      maximum: { bg: '#ffffff', text: '#000000', accent: '#d93025', border: '#000000' }
    };

    const style = contrastStyles[preferences.contrast] || contrastStyles.normal;
    root.style.setProperty('--bg-main', style.bg);
    root.style.setProperty('--text-main', style.text);
    root.style.setProperty('--accent-main', style.accent);
    root.style.setProperty('--border-main', style.border);

    if (preferences.speechRate) speech.setRate(preferences.speechRate);

    applyToWebpage(profile);
  };

  const applyToWebpage = async (profile) => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (!tab?.id || tab.url?.startsWith('chrome://')) return;

      const { fontSize, contrast } = profile.preferences;

      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (fs, cont) => {
          const id = 'universal-assist-styles';
          let styleTag = document.getElementById(id);
          if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = id;
            document.head.appendChild(styleTag);
          }

          let css = '';
          if (fs > 16) {
            css += `html { font-size: ${100 + (fs - 16) * 3}% !important; }`;
          }

          if (cont === 'high') {
            css += `html { filter: contrast(120%) !important; }`;
          } else if (cont === 'maximum') {
            css += `html { filter: contrast(180%) brightness(105%) !important; }`;
          }

          styleTag.innerHTML = css;
        },
        args: [fontSize, contrast]
      }).catch(err => console.warn("Injection blocked on this page."));
    } catch (e) {
      console.error("Messaging error:", e);
    }
  };

  const handleProfileChange = (newProfile) => {
    setUserProfile(newProfile);
    applyTheme(newProfile);
    chrome.runtime.sendMessage({ action: 'profileUpdated', profile: newProfile });
  };

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

  // Load initial page data
  useEffect(() => {
    // Request page data from content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: 'getPageData' },
          (response) => {
            if (response?.data) {
              setPageData(response.data);
            }
            setIsLoading(false);
          }
        );
      } else {
        setIsLoading(false);
      }
    });

    // Listen for page updates
    const messageListener = (message) => {
      if (message.action === 'pageDataUpdated') {
        setPageData(message.data);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    return () => chrome.runtime.onMessage.removeListener(messageListener);
  }, []);

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

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <p>Loading accessibility interface...</p>
      </div>
    );
  }

  const mainContainerStyle = {
    padding: '1rem',
    fontFamily: 'sans-serif',
    minHeight: '100vh',
    backgroundColor: 'var(--bg-main)',
    color: 'var(--text-main)',
    transition: 'all 0.2s ease',
    height: '100vh',
    overflowY: 'auto',
    boxSizing: 'border-box'
  };


  if (showProfile) {
    return (
      <div style={mainContainerStyle}>
        <button
          onClick={() => setShowProfile(false)}
          style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--accent-main)', marginBottom: '1rem', fontWeight: 'bold', fontSize: '1em' }}
        >
          ← Back to Assist
        </button>
        <UserProfile onProfileChange={handleProfileChange} />
      </div>
    );
  }

  // Main interface
  return (
    <div style={mainContainerStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h1 style={{ fontSize: '1.2em', margin: 0, color: 'var(--accent-main)' }}>Universal Assist</h1>
        <button onClick={() => window.open(chrome.runtime.getURL('permissions.html'))} style={{ fontSize: '0.7em' }}>Setup Mic</button>
      </div>

      {/* PROFILE BUTTON */}
      <button
        onClick={() => setShowProfile(true)}
        style={{ padding: '0.8em', width: '100%', marginBottom: '10px', background: 'var(--accent-main)', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9em' }}
      >
        ⚙️ User Profile
      </button>

      {/* INTERPRET PAGE BUTTON */}
      <button
        onClick={handleScan}
        disabled={loading}
        style={{ padding: '1em', width: '100%', cursor: 'pointer', marginBottom: '10px', background: 'var(--accent-main)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1em', opacity: loading ? 0.7 : 1 }}
      >
        {loading ? (progress || "Scanning...") : "Interpret Page"}
      </button>

      <VoiceInterface speech={speech} onCommand={handleVoiceCommand} pageTitle={pageData?.title} />

      {/* AI SUMMARY BOX */}
      {summary && (
        <div style={{ 
          marginTop: '1em', padding: '1em', 
          background: '#fef7e0', borderLeft: '0.4em solid var(--accent-main)', 
          borderRadius: '8px', border: '1px solid var(--border-main)',boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          <h4 style={{ margin: '0 0 0.5em 0', fontSize: '0.7em', color: 'var(--text-main)', textTransform: 'uppercase' }}>
            Agent Interpretation
          </h4>
          <p style={{ margin: 0, fontSize: '0.9em', lineHeight: '1.4', color: '#3c4043' }}>
            {summary}
          </p>
          <button 
            onClick={() => speakAndTrack(summary)} 
            style={{ marginTop: '0.8em', fontSize: '0.7em', background: 'var(--bg-main)', color: 'var(--text-main)', border: '1px solid var(--accent-main)', borderRadius: '4px', cursor: 'pointer', padding: '2px 8px' }}
          >
            🔊 Repeat
          </button>
        </div>
      )}

      {/* PAGE DATA */}
      {pageData && (
        <div style={{ marginTop: '1.5em' }}>
          <h2 style={{ fontSize: '1.1rem', borderBottom: '2px solid var(--accent-main)', paddingBottom: '0.3em', color: 'var(--text-main)' }}>{pageData.title}</h2>
          
          <section>
            <h3 style={{ fontSize: '0.9em', color: 'var(--accent-main)' }}>Page Structure</h3>
            <ul style={{ background: '#f4f4f4', padding: '0.8em', border: '1px solid var(--border-main)', color: 'var(--text-main)', fontSize: '0.8em', listStyle: 'none' }}>
              {pageData.headings.map((h, i) => (
                <li key={i} style={{ marginBottom: '0.4em' }}>
                  <strong>[{h.level}]</strong> {h.text}
                </li>
              ))}
            </ul>
          </section>

          <section style={{ marginTop: '1em' }}>
            <h3 style={{ fontSize: '0.9em', color: 'var(--accent-main)' }}>Main Content</h3>
            <div style={{ background: 'var(--bg-main)', padding: '0.8em', borderRadius: '8px', fontSize: '0.8em', border: '1px solid var(--border-main)', maxHeight: '150px', overflowY: 'auto', color: 'var(--text-main)' }}>
              {pageData.mainText.map((txt, i) => <p key={i} style={{ marginBottom: '0.6em' }}>{txt}</p>)}
            </div>
          </section>

          <section style={{ marginTop: '1em' }}>
            <h3 style={{ fontSize: '0.9em', color: 'var(--accent-main)' }}>Images Analysis ({pageData.images.length})</h3>
            <div style={{ fontSize: '0.8em', color: 'var(--text-main)'}}>
            {pageData.images.map((img, i) => (
              <div key={i} style={{ borderBottom: '1px solid var(--border-main)', padding: '0.8em 0' }}>
                <div style={{ color: img.isAccessible ? 'green' : 'var(--text-main)', fontWeight: 'bold' }}>
                  {img.alt}
                </div>
                {img.aiInterpretedText && (
                  <div style={{ fontSize: '0.9em', color: '#555', marginTop: '0.3em', fontStyle: 'italic' }}>
                    🤖 Detected: {img.aiInterpretedText}
                  </div>
                )}
              </div>
            ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;