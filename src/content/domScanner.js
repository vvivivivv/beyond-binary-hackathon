export const scanPage = async () => {
  // Headings
  let headings = Array.from(
    document.querySelectorAll("h1, h2, h3, h4, [role='heading']")
  )
    .map(h => ({
      level: h.tagName,
      text: h.innerText.trim()
    }))
    .filter(h => h.text.length > 0);

  // Infer headings if none found
  if (headings.length === 0) {
    headings = Array.from(document.querySelectorAll("span, div, b, strong"))
      .filter(el => {
        const style = window.getComputedStyle(el);
        const size = parseFloat(style.fontSize);
        const weight = style.fontWeight;
        return size > 20 || (size > 16 && parseInt(weight) >= 600);
      })
      .slice(0, 5)
      .map(h => ({ level: "Inferred", text: h.innerText.trim() }))
      .filter(h => h.text.length > 1 && h.text.length < 50);
  }

  // Main text
  const mainText = Array.from(
    document.querySelectorAll("p, div.content, article, section")
  )
    .map(p => p.innerText.trim())
    .filter(text => text.length > 50)
    .slice(0, 10);

  // Images + AI interpretation + OCR candidates
  const imageElements = Array.from(document.querySelectorAll("img")).filter(
    img =>
      img.src &&
      img.src.startsWith("http") &&
      img.width > 20
  );

  const images = await Promise.all(
    imageElements.map(async (img) => {
      const hasAlt = !!img.alt && img.alt.trim().length >= 5;
      let aiDescription = null;

      if (!hasAlt) {
        try {
          const response = await chrome.runtime.sendMessage({
            action: "PROCESS_IMAGE",
            payload: { imageUri: img.src }
          });
          aiDescription = response?.description || null;
        } catch {
          aiDescription = "AI description unavailable.";
        }
        const isLargeEnough = img.width > 50 && img.height > 50;
        return {
      id: `img-${index}`,
      src: img.src,
      alt: img.alt || aiDescription || "⚠️ Missing Alt Text",
      isAccessible: hasAlt,
      aiDescription,
      isOCRCandidate: isLargeEnough && img.src.startsWith('http'),
      dimensions: { width: img.width, height: img.height }
      }};

    const pdfs = Array.from(document.querySelectorAll('a[href$=".pdf"], a[href*="pdf"]'))
    .map((pdf, index) => ({
      id: `pdf-${index}`,
      text: pdf.innerText.trim() || "Unnamed PDF Document",
      href: pdf.href
    }));

    const links = Array.from(document.querySelectorAll("a"))
    .filter(a => !a.href.toLowerCase().endsWith('.pdf'))
    .map(a => ({
      text: a.innerText.trim(),
      href: a.href
    }))
    .filter(l => l.text.length > 0 && l.href.startsWith('http'))
    .slice(0, 15);

      return {
        src: img.src,
        alt: hasAlt ? img.alt : "⚠️ Missing Alt Text",
        isAccessible: hasAlt,
        aiInterpretedText: aiDescription
      };
    })
  );

  return {
    title: document.title,
    headings,
    mainText,
    images,
    pdfs,
    links,
    url: window.location.href,
    timestamp: Date.now()
  };
};