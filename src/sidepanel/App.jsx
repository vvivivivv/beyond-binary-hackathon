import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSpeech } from './hooks/useSpeech';
import VoiceInterface from './components/multimodal/VoiceInterface';
import { VOICE_COMMANDS } from '../utils/constants';
import { summarizeText, askQuestion } from '../lib/huggingface';
import { getLocalDescription } from './visionEngine';
import { performOCR } from '../lib/tesseract'; 
import { convertPdfToImage } from '../lib/pdfEngine'; 
import UserProfile from './components/profile/UserProfile';
import OCRResults from './components/display/OCRResults';
import { FileText } from 'lucide-react';

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

  // Speech Helper (Simplified and robust from your working version)
  const speakAndTrack = useCallback((text) => {
    if (!text) return;
    lastReadRef.current = text;
    if (speech && typeof speech.speak === 'function') {
      try {
        speech.speak(text);
      } catch (e) {
        console.error("Speech Engine Error:", e);
      }
    }
  }, [speech]);

  // Initial Load: Preferences & Theme
  useEffect(() => {
    chrome.storage.sync.get(['userProfile'], (result) => {
      if (result.userProfile) {
        setUserProfile(result.userProfile);
        applyTheme(result.userProfile);
      }
      setIsLoading(false);
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

    if (preferences.speechRate && speech?.setRate) {
      speech.setRate(preferences.speechRate);
    }
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
          if (fs > 16) css += `html { font-size: ${100 + (fs - 16) * 3}% !important; }`;
          if (cont === 'high') css += `html { filter: contrast(120%) !important; }`;
          else if (cont === 'maximum') css += `html { filter: contrast(180%) brightness(105%) !important; }`;
          styleTag.innerHTML = css;
        },
        args: [fontSize, contrast]
      }).catch(e => console.warn("Injection blocked."));
    } catch (e) { console.error(e); }
  };

  const handleProfileChange = (newProfile) => {
    setUserProfile(newProfile);
    applyTheme(newProfile);
    chrome.runtime.sendMessage({ action: 'profileUpdated', profile: newProfile });
  };

  const runCommandOnPage = async (func, arg = null) => {
    let tabId = targetTabId;
    if (!tabId) {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (tab) { tabId = tab.id; setTargetTabId(tab.id); }
    }
    if (!tabId) {
      speakAndTrack("Please click on the page once.");
      return;
    }
    const injection = { target: { tabId }, func };
    if (arg !== null) injection.args = [arg];
    try { await chrome.scripting.executeScript(injection); } catch (e) { console.error(e); }
  };

  // HTML Scan Result Handling (AI Vision only)
  const processData = async (response) => {
    setPageData(response);
    setLoading(false);
    setProgress("");
    speakAndTrack(`Scanned ${response.title}. Analyzing visual structure.`);

    if (!response.images) return;
    const imagesToProcess = [...response.images];
    for (let i = 0; i < imagesToProcess.length; i++) {
      const currentImg = imagesToProcess[i];
      if (!currentImg.isAccessible) {
        try {
          setProgress(`Analyzing image ${i + 1}/${imagesToProcess.length}...`);
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
        } catch (err) { console.error(err); }
      }
    }
    speakAndTrack("Visual analysis complete.");
    setProgress("");
  };

  const handleScan = async () => {
    if (loading) return;
    setLoading(true);
    setSummary("");
    setPageData(null);
    setProgress("Connecting...");

    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!tab) {
      setLoading(false);
      speakAndTrack("Please click on the webpage first.");
      return;
    }

    setTargetTabId(tab.id);
    const url = (tab.url || "").toLowerCase();

    // Branch 1: PDF Handling (OCR Restricted to here)
    if (url.endsWith('.pdf')) {
      setProgress("Converting PDF document...");
      speakAndTrack("PDF detected. Converting document for extraction.");
      try {
        const pdfImg = await convertPdfToImage(tab.url);
        setProgress("OCR Scanning...");
        const ocrText = await performOCR(pdfImg);
        
        const pdfResponse = {
          title: "PDF Document",
          headings: [{level: "H1", text: "Extracted Text"}],
          images: [{ id: 'pdf-page', src: pdfImg, alt: 'PDF Visual Scan', isOCRCandidate: true, ocrText: ocrText }],
          mainText: [ocrText],
          pdfs: [{ id: url, text: 'PDF Document', src: tab.url }]
        };
        setPageData(pdfResponse);
        speakAndTrack("OCR complete. I have extracted the text.");
      } catch (err) {
        speakAndTrack("I failed to extract text from this PDF.");
      } finally {
        setLoading(false);
        setProgress("");
      }
      return;
    }

    // Branch 2: Standard HTML Handling
    chrome.tabs.sendMessage(tab.id, { action: "SCAN_PAGE" }, async (response) => {
      if (chrome.runtime.lastError || !response) {
        setProgress("Injecting logic...");
        try {
          await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] });
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, { action: "SCAN_PAGE" }, (res) => {
              if (res) processData(res);
              else { setLoading(false); speakAndTrack("I can't reach the page."); }
            });
          }, 600);
        } catch (e) { setLoading(false); }
      } else {
        processData(response);
      }
    });
  };

  const handleSummarize = async () => {
    if (!pageData?.mainText?.length) return speakAndTrack("No content found.");
    setLoading(true);
    setSummary("Analyzing...");
    speakAndTrack("Generating a summary of the content.");
    try {
      const result = await summarizeText(pageData.mainText.join(" "));
      setSummary(result);
      speakAndTrack("Here is the summary: " + result);
    } catch (err) { setSummary("AI Service Error."); }
    setLoading(false);
  };

  const handleSearch = async (query) => {
    if (!pageData || !pageData.mainText) return;
    setLoading(true);
    speakAndTrack(`Searching for ${query}`);
    runCommandOnPage((textToFind) => {
      window.getSelection().removeAllRanges();
      const found = window.find(textToFind, false, false, true, false, true, false);
      if (found) {
        const sel = window.getSelection();
        const parent = sel.getRangeAt(0).startContainer.parentElement;
        parent.style.outline = "5px solid #f9ab00";
        parent.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => parent.style.outline = "none", 4000);
      }
    }, query);

    try {
      const answer = await askQuestion(query, pageData.mainText.join(" "));
      if (answer) {
        setSummary(`I found "${query}". AI context: ${answer}`);
        speakAndTrack(answer);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleVoiceCommand = (command) => {
    const text = command.toLowerCase();
    const isIntent = (list) => list && list.some(word => text.includes(word));

    if (isIntent(VOICE_COMMANDS.STOP)) return speech.stopSpeaking();
    if (isIntent(VOICE_COMMANDS.SUMMARISE) || text.includes("summarize")) return handleSummarize();

    if (isIntent(VOICE_COMMANDS.NAV_TOP)) {
      speakAndTrack("Going to top.");
      return runCommandOnPage(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }
    if (isIntent(VOICE_COMMANDS.NAV_BOTTOM)) {
      speakAndTrack("Going to bottom.");
      return runCommandOnPage(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
    }

    if (text.includes("image") || text.includes("picture")) {
      if (!pageData?.images?.length) return speakAndTrack("No images found.");
      setImgIndex(prev => {
        const next = (prev + 1) % pageData.images.length;
        const img = pageData.images[next];
        speakAndTrack(`Image ${next + 1}: ${img.alt}`);
        runCommandOnPage((src) => {
          const el = Array.from(document.querySelectorAll('img')).find(i => i.src === src);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, img.src);
        return next;
      });
      return;
    }

    if (text.includes("read headings")) {
      const list = pageData.headings.map(h => h.text).join(", ");
      return speakAndTrack(`The headings are: ${list}`);
    }

    if (text.includes("find") || text.includes("search") || isIntent(VOICE_COMMANDS.SEARCH)) {
      const query = text.replace("find", "").replace("search", "").trim();
      if (query) handleSearch(query);
      return;
    }
  };

  if (isLoading) return <div className="app-loading"><div className="spinner"></div><p>Loading...</p></div>;

  const mainContainerStyle = {
    padding: '1rem',
    minHeight: '100vh',
    backgroundColor: 'var(--bg-main)',
    color: 'var(--text-main)',
    fontFamily: 'sans-serif',
    boxSizing: 'border-box'
  };

  if (showProfile) {
    return (
      <div style={mainContainerStyle}>
        <button onClick={() => setShowProfile(false)} style={{ color: 'var(--accent-main)', border: 'none', background: 'none', cursor: 'pointer', marginBottom: '1rem', fontWeight: 'bold' }}>
          ← Back to Assist
        </button>
        <UserProfile onProfileChange={handleProfileChange} />
      </div>
    );
  }

  return (
    <div style={mainContainerStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h1 style={{ fontSize: '1.2em', margin: 0, color: 'var(--accent-main)' }}>Universal Assist</h1>
        <button 
          onClick={() => window.open(chrome.runtime.getURL('permissions.html'))} 
          style={{ fontSize: '0.7em', padding: '4px 8px', cursor: 'pointer' }}
        >
          Setup Mic
        </button>
      </div>

      <button
        onClick={() => setShowProfile(true)}
        style={{ padding: '0.8em', width: '100%', marginBottom: '10px', background: 'var(--accent-main)', color: '#ffffff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
      >
        ⚙️ User Profile
      </button>

      <button
        onClick={handleScan}
        disabled={loading}
        style={{ padding: '1em', width: '100%', cursor: 'pointer', marginBottom: '10px', background: 'var(--accent-main)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', opacity: loading ? 0.7 : 1 }}
      >
        {loading ? (progress || "Scanning...") : "Interpret Page"}
      </button>

      <VoiceInterface speech={speech} onCommand={handleVoiceCommand} pageTitle={pageData?.title} />

      {/* AI SUMMARY BOX */}
      {summary && (
        <div style={{ marginTop: '1em', padding: '1em', background: '#fef7e0', borderLeft: '0.4em solid var(--accent-main)', borderRadius: '8px', border: '1px solid var(--border-main)' }}>
          <p style={{ margin: 0, fontSize: '0.9em', lineHeight: '1.4' }}>{summary}</p>
          <button onClick={() => speakAndTrack(summary)} style={{ marginTop: '0.8em', fontSize: '0.7em', background: 'var(--bg-main)', color: 'white', border: '1px solid var(--accent-main)', borderRadius: '4px', cursor: 'pointer' }}>🔊 Repeat</button>
        </div>
      )}

      {/* Data Display */}
      {pageData && (
        <div style={{ marginTop: '1.5em' }}>
          <h2 style={{ fontSize: '1.1rem', borderBottom: '2px solid var(--accent-main)', paddingBottom: '0.3em' }}>{pageData.title}</h2>
          
          {pageData.pdfs?.length > 0 && (
            <section>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
                <FileText size={18} color="var(--accent-main)"/> Document OCR
              </h3>
              <OCRResults images={pageData.images} pdfs={pageData.pdfs} />
            </section>
          )}

          <section style={{ marginTop: '1.2em' }}>
            <h3 style={{ fontSize: '0.9em', color: 'var(--accent-main)' }}>Page Structure</h3>
            <ul style={{ background: '#f4f4f4', padding: '0.8em', fontSize: '0.8em', listStyle: 'none' }}>
              {pageData.headings?.map((h, i) => (
                <li key={i} style={{ marginBottom: '0.4em' }}><strong>[{h.level}]</strong> {h.text}</li>
              ))}
            </ul>
          </section>

          <section style={{ marginTop: '1.2em' }}>
            <h3 style={{ fontSize: '0.9em', color: 'var(--accent-main)' }}>Main Content</h3>
            <div style={{ background: 'var(--bg-main)', padding: '0.8em', borderRadius: '8px', fontSize: '0.8em', border: '1px solid var(--border-main)', maxHeight: '150px', overflowY: 'auto' }}>
              {pageData.mainText?.map((txt, i) => <p key={i} style={{ marginBottom: '0.6em' }}>{txt}</p>)}
            </div>
          </section>

          <section style={{ marginTop: '1.2em' }}>
            <h3 style={{ fontSize: '0.9em', color: 'var(--accent-main)' }}>Image Analysis ({pageData.images?.length || 0})</h3>
            {pageData.images?.map((img, i) => (
              <div key={i} style={{ borderBottom: '1px solid var(--border-main)', padding: '0.8em 0' }}>
                <div style={{ fontSize: '0.9em', fontWeight: 'bold' }}>{img.alt}</div>
                {img.aiInterpretedText && (
                  <div style={{ fontSize: '0.85em', color: '#1a73e8', marginTop: '0.3em' }}>
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