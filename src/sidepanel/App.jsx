import React, { useState } from 'react';
import { getLocalDescription } from './visionEngine'; // Import the new engine

function App() {
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");

// Inside your App component
// ... keep imports

  const handleScan = async () => {
    if (loading) return; 
    setLoading(true);
    setPageData(null); 
    setProgress("Scanning page structure...");
    
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.tabs.sendMessage(tab.id, { action: "SCAN_PAGE" }, async (response) => {
      if (chrome.runtime.lastError || !response) {
          setLoading(false);
          setProgress("Error: Please refresh the webpage.");
          return;
      }

      setPageData(response);
      
      const imagesToProcess = [...response.images];
      
      // IMPORTANT: Process images sequentially so memory doesn't overflow
      for (let i = 0; i < imagesToProcess.length; i++) {
          const currentImg = imagesToProcess[i];
          
          if (!currentImg.isAccessible) {
              setProgress(`Interpreting image ${i + 1}/${imagesToProcess.length}...`);
              
              // Call our two-step Vision Engine
              const semanticInfo = await getLocalDescription(currentImg.src);
              
              // Update only this image in the state array
              setPageData(prev => {
                  const updatedList = [...prev.images];
                  updatedList[i] = { ...updatedList[i], aiInterpretedText: semanticInfo };
                  return { ...prev, images: updatedList };
              });
          }
      }
      
      setProgress("");
      setLoading(false);
    });
  };

// ... rest of file

  return (
    <div style={{ padding: '1rem', fontFamily: 'sans-serif' }}>
      <h1>Universal Assist</h1>
      <button onClick={handleScan} disabled={loading} style={{ padding: '10px', width: '100%', cursor: 'pointer' }}>
        {loading ? (progress || "Scanning...") : "Interpret Page"}
      </button>

      {pageData && (
        <div style={{ marginTop: '20px' }}>
          <h2>{pageData.title}</h2>
          
          <section>
            <h3>Headings Found ({pageData.headings.length})</h3>
            <ul style={{ background: '#f4f4f4', padding: '10px', borderRadius: '5px' }}>
              {pageData.headings.map((h, i) => (
                <li key={i}><strong>{h.level}:</strong> {h.text}</li>
              ))}
            </ul>
          </section>

          <section>
            <h3>Images Analysis</h3>
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