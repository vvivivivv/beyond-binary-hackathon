import { scanPage } from "./domScanner";

// Listen for messages from the Side Panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "SCAN_PAGE") {
    const data = scanPage();
    sendResponse(data); // Send the JSON back to the Side Panel
  }
  return true; // Keeps the message channel open
});