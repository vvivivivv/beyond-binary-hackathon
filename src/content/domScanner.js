// src/content/domScanner.js

export const scanPage = () => {
  // 1. Headings (Existing)
  const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4"))
    .map(h => ({
      level: h.tagName,
      text: h.innerText.trim()
    }))
    .filter(h => h.text.length > 0);

  // 2. Images (Enhanced for OCR)
  const images = Array.from(document.querySelectorAll("img"))
    .map((img, index) => {
      // Determine if image is large enough to likely contain readable text
      const isLargeEnough = img.width > 50 && img.height > 50;
      
      return {
        id: `img-${index}`,
        src: img.src,
        alt: img.alt || "⚠️ Missing Alt Text",
        isAccessible: !!img.alt,
        // New: Meta-data for OCR processing
        isOCRCandidate: isLargeEnough && img.src.startsWith('http'),
        dimensions: { width: img.width, height: img.height }
      };
    })
    .filter(img => img.src.startsWith('http'));

  // 3. PDFs (New - Targeted for Feature 3 OCR)
  const pdfs = Array.from(document.querySelectorAll('a[href$=".pdf"], a[href*="pdf"]'))
    .map((pdf, index) => ({
      id: `pdf-${index}`,
      text: pdf.innerText.trim() || "Unnamed PDF Document",
      href: pdf.href
    }));

  // 4. Links (Existing - filtered to remove PDFs for cleaner UI)
  const links = Array.from(document.querySelectorAll("a"))
    .filter(a => !a.href.toLowerCase().endsWith('.pdf')) // Don't duplicate PDFs in the general links
    .map(a => ({
      text: a.innerText.trim(),
      href: a.href
    }))
    .filter(l => l.text.length > 0 && l.href.startsWith('http'))
    .slice(0, 15); // Increased limit slightly

  const pageData = {
    title: document.title,
    headings,
    images,
    links,
    pdfs, // New entry for Feature 3
    url: window.location.href,
    timestamp: Date.now()
  };

  console.log("🚀 Semantic Mirror Scanned (including Visual Candidates):", pageData);
  return pageData;
};