// src/lib/tesseract.js
import { createWorker } from 'tesseract.js';

export const performOCR = async (imageSource, onProgress) => {
  const workerPath = chrome.runtime.getURL('tesseract-worker.min.js');
  const corePath = chrome.runtime.getURL('tesseract-core-lstm.js');

  // 1. Create the worker object
  const worker = await createWorker('eng', 1, {
    workerPath: workerPath,
    corePath: corePath,
    workerBlobURL: false, // MANDATORY for Chrome Extensions
    logger: m => {
      if (m.status === 'recognizing' && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });

  try {
    // 2. Actually perform the recognition
    const { data: { text } } = await worker.recognize(imageSource);
    
    // 3. Clean up
    await worker.terminate();
    return text.trim();
  } catch (error) {
    console.error("Tesseract Error inside lib:", error);
    // Try to terminate even if it failed to avoid memory leaks
    try { await worker.terminate(); } catch (e) {}
    throw error;
  }
};