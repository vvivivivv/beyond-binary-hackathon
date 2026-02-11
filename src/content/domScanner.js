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

  // Images + AI interpretation
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
      }

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
    url: window.location.href
  };
};