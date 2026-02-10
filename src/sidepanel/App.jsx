import React, { useState, useRef } from 'react';
import { useSpeech } from './hooks/useSpeech';
import VoiceInterface from './components/multimodal/VoiceInterface';
import { VOICE_COMMANDS } from '../utils/constants';
import { LucideStepBack } from 'lucide-react';

function App() {
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [targetTabId, setTargetTabId] = useState(null);
  const [summary, setSummary] = useState("");
  const [imgIndex, setImgIndex] = useState(-1);
  
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
    setLoading(true);
    setSummary("");
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });

    if (tab){
      setTargetTabId(tab.id);
      chrome.tabs.sendMessage(tab.id, { action: "SCAN_PAGE" }, async (response) => {
        if (chrome.runtime.lastError || !response) {
          try {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ["content.js"]
            });
            setTimeout(() => {
              chrome.tabs.sendMessage(tab.id, { action: "SCAN_PAGE" }, (res) => {
                if (res) {
                  setPageData(res);
                  speakAndTrack(`Connection restored. Scanned ${res.title}`);
                }
              });
            }, 500);
          } catch (err) {
            speakAndTrack("Cannot access this page.");
          }
        } else {
          setPageData(response);
          setImgIndex(-1);
          speakAndTrack(`Scanned ${response.title}.`);
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
      speakAndTrack("Please click on the webpage first.");
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
                     text.includes("headings") || text.includes("summary") || text.includes("faster") || text.includes("slower");
    
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

    else if (text.includes("image") || isIntent(VOICE_COMMANDS.READ_IMAGES)) {
      if (!pageData || pageData.images.length === 0) return speakAndTrack("No images found.");
      setImgIndex((prev) => {
        const newIdx = (prev + 1) % pageData.images.length;
        const currentImg = pageData.images[newIdx];
        speakAndTrack(`Image ${newIdx + 1}: ${currentImg.alt}`);
        runCommandOnPage((src) => {
          const target = document.querySelector(`img[src="${src}"]`);
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

    else if (isIntent(VOICE_COMMANDS.SUMMARIZE)) {
      handleSummarize();
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

      {pageData && (
        <div style={{ marginTop: '20px' }}>
          <h2 style={{ fontSize: '1.1rem', borderBottom: '2px solid #1a73e8' }}>{pageData.title}</h2>
          
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

          <section style={{ marginTop: '15px' }}>
            <h3 style={{ fontSize: '14px', color: '#1a73e8' }}>Image Analysis ({pageData.images.length})</h3>
            <div style={{ fontSize: '12px' }}>
              {pageData.images.map((img, i) => (
                <div key={i} style={{ borderBottom: '1px solid #eee', padding: '8px 0', color: img.isAccessible ? '#1e8e3e' : '#d93025', background: imgIndex === i ? '#fff3cd' : 'transparent' }}>
                  {img.isAccessible ? `✓ ${img.alt}` : `⚠ Missing: ${img.alt}`}
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