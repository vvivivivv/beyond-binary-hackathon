export const scanPage = async () => {
  // 1. Get headings
  const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4")).map(h => ({
    level: h.tagName,
    text: h.innerText.trim()
  })).filter(h => h.text.length > 0);

  // 2. Get images
  const imageElements = Array.from(document.querySelectorAll("img")).filter(img => 
    img.src.startsWith('http') && img.width > 20 // Ignore tiny icons
  );

  const images = await Promise.all(imageElements.map(async (img) => {
    const isMissingAlt = !img.alt || img.alt.length < 5;
    let aiDescription = null;

    if (isMissingAlt) {
      try {
        // Just send the URL. The background script will handle the bypass.
        const response = await chrome.runtime.sendMessage({
          action: "PROCESS_IMAGE",
          payload: { imageUri: img.src }
        });
        aiDescription = response?.description;
      } catch (err) {
        aiDescription = "Processing error.";
      }
    }

    return {
      src: img.src,
      alt: img.alt || "⚠️ Missing Alt Text",
      isAccessible: !!img.alt && !isMissingAlt,
      aiInterpretedText: aiDescription
    };
  }));

  return {
    title: document.title,
    headings,
    images,
    url: window.location.href
  };
};