import React, { useState } from 'react';
import { useSpeech } from './hooks/useSpeech';
import VoiceInterface from './components/multimodal/VoiceInterface';
import { VOICE_COMMANDS } from '../utils/constants';

function App() {
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [targetTabId, setTargetTabId] = useState(null);
  const [summary, setSummary] = useState("");
  const [imgIndex, setImgIndex] = useState(-1);
  
  const speech = useSpeech();  

  const runCommandOnPage = async (func, arg = null) => {
    let tabId = targetTabId;
    if (!tabId) {
      console.log("Tab ID lost, searching for active tab...");
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (tab) {
        tabId = tab.id;
        setTargetTabId(tab.id);
      }
    }

    if (!tabId) {
      console.error("No target tab found. Please click the webpage once.");
      speech.speak("I can't find the webpage. Please click on the page once.");
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
      chrome.tabs.sendMessage(tab.id, { action: "SCAN_PAGE" }, (response) => {
        if (chrome.runtime.lastError || !response) {
          console.warn("Scan message failed, but tab ID is locked.");
          speech.speak("I've connected to the page, but I'm having trouble reading the content. Try refreshing the webpage.");
        } else {
          setPageData(response);
          setImgIndex(-1);
          speech.speak(`Scanned ${response.title}.`);
        }
        setLoading(false);
      });
    }
    else {
      setLoading(false);
      speech.speak("Please click on the webpage first so I know which tab to scan.");
    }
  };
  
  const handleVoiceCommand = (command) => {
    const text = command.toLowerCase();

    // Stop command
    if (VOICE_COMMANDS.STOP.some(word => text.includes(word))) {
      speech.stopSpeaking();
      console.log("Action: STOP");
      return; 
    }

    const isNav = text.includes("top") || text.includes("bottom") || text.includes("image");

    if (speech.isSpeaking && !isNav) {
      console.log("Busy speaking, ignoring non-nav command.");
      return;
    }

    const isIntent = (cmdList) => cmdList && cmdList.some(word => text.includes(word));

    // Navigation commands
    if (isIntent(VOICE_COMMANDS.NAV_TOP)) {
      speech.stopSpeaking(); 
      console.log("Action: NAV_TOP");
      speech.speak("Going to top.");
      runCommandOnPage(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }
    
    else if (isIntent(VOICE_COMMANDS.NAV_BOTTOM)) {
      speech.stopSpeaking();
      console.log("Action: NAV_BOTTOM");
      speech.speak("Going to bottom.");
      runCommandOnPage(() => {
        window.scrollTo({ 
            top: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight), 
            behavior: 'smooth' 
        });
      });
    }

  else if (text.includes("image") || text.includes("picture")) {
      if (!pageData || pageData.images.length === 0) {
        speech.speak("No images found on this page.");
        return;
      }

      speech.stopSpeaking();

      setImgIndex((prevIndex) => {
        const newIdx = (prevIndex + 1) % pageData.images.length;
        const currentImg = pageData.images[newIdx];

        speech.speak(`Image ${newIdx + 1}: ${currentImg.isAccessible ? currentImg.alt : "Missing description"}`);

        runCommandOnPage((imgSrc) => {
          const target = document.querySelector(`img[src="${imgSrc}"]`);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target.style.outline = "8px solid #1a73e8";
            target.style.outlineOffset = "5px";
            target.style.borderRadius = "4px";
            setTimeout(() => (target.style.outline = "none"), 3000);
          }
        }, currentImg.src);

        return newIdx;
      });
    }

    // Information commands (only process if not already speaking to avoid loops)
    else if (!speech.isSpeaking) {
        if (isIntent(VOICE_COMMANDS.READ_HEADINGS)) {
            if (!pageData) return speech.speak("Scan the page first.");
            speech.speak("The headings are: " + pageData.headings.map(h => h.text).join(", "));
        }
        else if (isIntent(VOICE_COMMANDS.READ_IMAGES)) {
            if (!pageData) return speech.speak("Scan the page first.");
            speech.speak(`Found ${pageData.images.length} images.`);
        }
    }
  };

  return (
    <div style={{ padding: '1rem', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <h1 style={{ fontSize: '1.2rem', margin: 0 }}>Universal Assist</h1>
        <button 
          onClick={() => window.open(chrome.runtime.getURL('permissions.html'))}
          style={{ fontSize: '10px', cursor: 'pointer' }}
        >
          Setup Mic
        </button>
      </div>
      
      <button 
        onClick={handleScan} 
        disabled={loading} 
        style={{ padding: '10px', width: '100%', cursor: 'pointer', marginBottom: '10px', background: '#1a73e8', color: 'white', border: 'none', borderRadius: '5px' }}
      >
        {loading ? "Processing..." : "Interpret Page"}
      </button>

      <VoiceInterface speech={speech} onCommand={handleVoiceCommand} pageTitle={pageData?.title} />

      {pageData && (
        <div style={{ marginTop: '20px' }}>
          <h2 style={{ fontSize: '1.1rem', borderBottom: '2px solid #1a73e8' }}>{pageData.title}</h2>
          
          <section>
            <h3>Headings ({pageData.headings.length})</h3>
            <ul style={{ background: '#f4f4f4', padding: '10px', borderRadius: '5px', fontSize: '13px' }}>
              {pageData.headings.map((h, i) => <li key={i}><strong>{h.level}:</strong> {h.text}</li>)}
            </ul>
          </section>

          <section style={{ marginTop: '15px' }}>
            <h3>Image Analysis ({pageData.images.length})</h3>
            <div style={{ fontSize: '13px' }}>
              {pageData.images.map((img, i) => (
                <div key={i} style={{ 
                  borderBottom: '1px solid #ddd', 
                  padding: '5px 0', 
                  color: img.isAccessible ? '#1e8e3e' : '#d93025',
                  background: imgIndex === i ? '#fff3cd' : 'transparent' // Highlight current image in list
                }}>
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