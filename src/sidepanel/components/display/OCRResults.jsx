import React, { useState, useEffect, useCallback } from 'react';
import { performOCR } from '../../../lib/tesseract'; 
import { convertPdfToImage } from '../../../lib/pdfEngine'; // Import the PDF conversion utility
import { Loader2, AlertCircle, FileType, CheckCircle2, Image as ImageIcon } from 'lucide-react';

const OCRResults = ({ images, pdfs }) => {
  const [ocrData, setOcrData] = useState({}); // Stores results by ID: { id: "OCR Text" }
  const [processing, setProcessing] = useState(new Set()); // Tracks items currently being processed

  const processItem = useCallback(async (item) => {
    const id = item.id;
    if (processing.has(id)) return; // Don't process if already working on it

    setProcessing(prev => new Set(prev).add(id));
    setOcrData(prev => ({ ...prev, [id]: "Reading text..." })); // Set initial loading state

    try {
      let text = "";
      if (item.href) { // It's a PDF (identified by href)
        console.log(`[OCRResults] Starting PDF conversion for: ${item.href}`);
        const imageData = await convertPdfToImage(item.href);
        console.log(`[OCRResults] PDF converted to image data. Running OCR...`);
        text = await performOCR(imageData);
        console.log(`[OCRResults] OCR for PDF completed: ${text.substring(0, 50)}...`);
      } else if (item.src) { // It's an Image (identified by src)
        console.log(`[OCRResults] Starting OCR for image: ${item.src}`);
        text = await performOCR(item.src);
        console.log(`[OCRResults] OCR for image completed: ${text.substring(0, 50)}...`);
      }

      setOcrData(prev => ({ ...prev, [id]: text.trim() || "No readable text found." }));
    } // Inside OCRResults.jsx try/catch
     catch (err) {
      console.error("Full Error Object:", err); // Look at this in the Inspect console!
      const errorMessage = err instanceof Error ? err.message : String(err);
      setOcrData(prev => ({ ...prev, [id]: `Error: ${errorMessage}` }));
      } finally {
      setProcessing(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [processing]); // useCallback dependency

  useEffect(() => {
    // Combine all potential OCR candidates
    const candidates = [
      ...images.filter(img => img.isOCRCandidate), // Only process images marked as OCR candidates
      ...pdfs
    ];

    candidates.forEach((item) => {
      const id = item.id || item.src || item.href; // Ensure item has an ID
      if (!ocrData[id] && !processing.has(id)) { // Only process if not already done or in progress
        processItem({ ...item, id: id }); // Pass item with a guaranteed ID
      }
    });
  }, [images, pdfs, ocrData, processing, processItem]); // Dependencies for useEffect

  const allCandidates = [...images.filter(img => img.isOCRCandidate), ...pdfs];

  if (allCandidates.length === 0 && !processing.size) {
    return <p style={{ fontSize: '0.8rem', color: '#666' }}>No OCR-ready content found on this page.</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {allCandidates.map((item) => {
        const id = item.id || item.src || item.href;
        const isDone = ocrData[id] && !processing.has(id);
        const isWorking = processing.has(id);
        const extractedText = ocrData[id] || (isWorking ? "Reading text..." : "Waiting to process...");

        return (
          <div key={id} style={{ 
            background: '#fff', border: '1px solid #e2e8f0', 
            borderRadius: '6px', padding: '10px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {item.href ? <FileType size={12}/> : <ImageIcon size={12}/>} 
                {item.href ? 'DOCUMENT' : 'IMAGE SCAN'}
              </span>
              {isWorking && <Loader2 size={14} className="animate-spin" style={{ color: '#2563eb' }} />}
              {isDone && <CheckCircle2 size={14} style={{ color: '#22c55e' }} />}
            </div>

            <div style={{ fontSize: '0.85rem', color: '#334155', maxHeight: '100px', overflowY: 'auto', fontStyle: isDone ? 'normal' : 'italic' }}>
              {extractedText}
            </div>

            {isDone && (
              <button 
                onClick={() => alert(`Sending to AI Summarizer: "${extractedText.substring(0, 50)}..."`)}
                style={{ marginTop: '8px', fontSize: '0.7rem', color: '#2563eb', border: 'none', background: 'none', cursor: 'pointer', padding: 0, fontWeight: 'bold' }}
              >
                Summarize Content →
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default OCRResults;