import React, { useState } from 'react';
import OCRResults from './components/display/OCRResults'; // We will create this next
import { Scan, FileText, Layout, Image as ImageIcon } from 'lucide-react'; // Icons for better UI

function App() {
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleScan = async () => {
  setLoading(true);
  
  // 1. Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // 2. Check if it's a PDF or Local File
  const isPdf = tab.url.toLowerCase().endsWith('.pdf') || tab.url.includes('pdf');

  if (isPdf) {
    console.log("PDF detected via URL. Processing directly...");
    setPageData({
      title: "PDF Document",
      headings: [],
      links: [],
      images: [],
      pdfs: [{
              id: tab.url, // URL is naturally unique
              text: 'Current Document',
              href: tab.url
            }]
    });
    setLoading(false);
    return; // Stop here, don't send message
  }

  // 3. Regular Webpage logic
  chrome.tabs.sendMessage(tab.id, { action: "SCAN_PAGE" }, (response) => {
    if (chrome.runtime.lastError) {
      console.warn("Content script not found, likely a protected page.");
      setPageData({
        title: "Web Document",
        headings: [], links: [], images: [],
        pdfs: [{ id: 'fallback', text: 'Document URL', href: tab.url }]
      });
    } else {
      setPageData(response);
    }
    setLoading(false);
  });
};

  return (
    <div style={{ padding: '1rem', fontFamily: 'sans-serif', color: '#333' }}>
      <header style={{ borderBottom: '2px solid #eee', marginBottom: '20px', paddingBottom: '10px' }}>
        <h1 style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Layout size={24} color="#2563eb" /> Universal Assist
        </h1>
        <button 
          onClick={handleScan} 
          disabled={loading} 
          style={{ 
            padding: '12px', width: '100%', cursor: 'pointer', 
            backgroundColor: '#2563eb', color: 'white', border: 'none', 
            borderRadius: '8px', fontWeight: 'bold', display: 'flex', 
            alignItems: 'center', justifyContent: 'center', gap: '8px' 
          }}
        >
          {loading ? "Analyzing Page..." : <><Scan size={18}/> Interpret Page</>}
        </button>
      </header>

      {pageData && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* FEATURE 3: OCR AUTOMATIC PROCESSING SECTION */}
          <section>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
              <FileText size={18} color="#2563eb"/> Visual & Document OCR
            </h3>
            {/* This component will take the images and pdfs and start OCRing them automatically */}
            <OCRResults 
              images={pageData.images.filter(img => img.isOCRCandidate)} 
              pdfs={pageData.pdfs} 
            />
          </section>

          {/* SEMANTIC STRUCTURE SECTION */}
          <section>
            <h3 style={{ fontSize: '1rem' }}>Page Structure</h3>
            <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', fontSize: '0.9rem' }}>
              <p><strong>Headings:</strong> {pageData.headings.length} found</p>
              <p><strong>Links:</strong> {pageData.links.length} found</p>
            </div>
          </section>

          {/* ORIGINAL IMAGES SECTION (ACCESSIBILITY CHECK) */}
          <section>
            <h3 style={{ fontSize: '1rem' }}>Image Accessibility</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {pageData.images.slice(0, 5).map((img, i) => (
                <div key={i} style={{ 
                  fontSize: '0.8rem', padding: '8px', borderRadius: '4px',
                  borderLeft: `4px solid ${img.isAccessible ? '#22c55e' : '#ef4444'}`,
                  background: '#fdfdfd'
                }}>
                  {img.isAccessible ? `✅ ${img.alt}` : `❌ Missing Description`}
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