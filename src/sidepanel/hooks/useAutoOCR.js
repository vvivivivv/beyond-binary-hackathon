import { useState, useEffect } from 'react';
import { performOCR } from '../../lib/tesseract.js';
import { convertPdfToImages } from '../../lib/pdfEngine.js';

export const useAutoOCR = () => {
  const [results, setResults] = useState([]); // Array of {id, type, text, status}
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    const listener = async (message) => {
      if (message.action === "NEW_PAGE_LOADED") {
        processQueue(message.visuals);
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const processQueue = async (visuals) => {
    setIsScanning(true);
    
    for (const item of visuals) {
      // Add item to state as 'processing'
      setResults(prev => [...prev, { ...item, status: 'processing', ocrText: '' }]);

      try {
        let extractedText = "";

        if (item.type === 'image') {
          extractedText = await performOCR(item.src);
        } else if (item.type === 'pdf') {
          const images = await convertPdfToImages(item.src);
          // OCR the first page of the PDF
          extractedText = await performOCR(images[0]);
        }

        // Update state with result
        setResults(prev => prev.map(res => 
          res.id === item.id 
            ? { ...res, status: 'completed', ocrText: extractedText } 
            : res
        ));
      } catch (err) {
        console.error("OCR failed for", item.id, err);
        setResults(prev => prev.map(res => 
          res.id === item.id ? { ...res, status: 'failed' } : res
        ));
      }
    }
    setIsScanning(false);
  };

  return { results, isScanning };
};