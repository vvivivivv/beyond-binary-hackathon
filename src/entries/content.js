// src/entries/content.js
import { scanPage } from '../content/domScanner';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "SCAN_PAGE") {
    // Calling the async function and then sending response
    scanPage().then(data => {
      sendResponse(data);
    });
    return true; // Keep channel open for async response
  }
});