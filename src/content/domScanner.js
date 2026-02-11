export const scanPage = async () => {
  try {
    // Scan Headings
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

    // Scan Main text
    const mainText = Array.from(
      document.querySelectorAll("p, div.content, article, section")
    )
      .map(p => p.innerText.trim())
      .filter(text => text.length > 50)
      .slice(0, 10);

    // Scan PDFs
    const pdfs = Array.from(document.querySelectorAll('a[href$=".pdf"], a[href*="pdf"]'))
      .map((pdf, index) => ({
        id: `pdf-${index}`,
        text: pdf.innerText.trim() || "Unnamed PDF Document",
        href: pdf.href
      }));

    // Scan Links (filtering out PDFs)
    const links = Array.from(document.querySelectorAll("a"))
      .filter(a => !a.href.toLowerCase().endsWith('.pdf'))
      .map(a => ({
        text: a.innerText.trim(),
        href: a.href
      }))
      .filter(l => l.text.length > 0 && l.href.startsWith('http'))
      .slice(0, 15);

    // Scan Images + OCR Detection
    const imageElements = Array.from(document.querySelectorAll("img")).filter(
      img => img.src && img.src.startsWith("http") && img.width > 20
    );

    const images = await Promise.all(
      imageElements.map(async (img, index) => {
        const hasAlt = !!img.alt && img.alt.trim().length >= 5;
        let aiDescription = null;

        // Only ask for AI description if alt text is missing
        if (!hasAlt) {
          try {
            const response = await chrome.runtime.sendMessage({
              action: "PROCESS_IMAGE",
              payload: { imageUri: img.src }
            });
            aiDescription = response?.description || null;
          } catch (e) {
            aiDescription = "AI description unavailable.";
          }
        }

        const isLargeEnough = img.width > 50 && img.height > 50;

        return {
          id: `img-${index}`,
          src: img.src,
          alt: hasAlt ? img.alt : (aiDescription || "⚠️ Missing Alt Text"),
          isAccessible: hasAlt,
          aiInterpretedText: aiDescription,
          isOCRCandidate: isLargeEnough && img.src.startsWith('http'),
          dimensions: { width: img.width, height: img.height }
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
  } catch (error) {
    console.error("DOM Scanner Error:", error);
    return null;
  }
};