import React, { useState } from 'react';

function App() {
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleScan = async () => {
    setLoading(true);
    
    // 1. Find the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // 2. Send a message to the Content Script in that tab
    chrome.tabs.sendMessage(tab.id, { action: "SCAN_PAGE" }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Error:", chrome.runtime.lastError);
        alert("Please refresh the webpage and try again.");
      } else {
        console.log("Data received in Side Panel:", response);
        setPageData(response);
      }
      setLoading(false);
    });
  };

  return (
    <div style={{ padding: '1rem', fontFamily: 'sans-serif' }}>
      <h1>Universal Assist</h1>
      <button onClick={handleScan} disabled={loading} style={{ padding: '10px', width: '100%', cursor: 'pointer' }}>
        {loading ? "Scanning..." : "Interpret Page"}
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
              <div key={i} style={{ borderBottom: '1px solid #ddd', padding: '5px 0', color: img.isAccessible ? 'green' : 'red' }}>
                {img.alt}
              </div>
            ))}
          </section>
        </div>
      )}
    </div>
  );
}

export default App;