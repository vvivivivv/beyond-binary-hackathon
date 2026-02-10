export const scanPage = () => {
  // Look for real tags or big bold spans
  let headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, [role='heading']")).map(h => ({
    level: h.tagName,
    text: h.innerText.trim()
  })).filter(h => h.text.length > 0);

  // If 0 headings found, infer them from style
  if (headings.length === 0) {
    headings = Array.from(document.querySelectorAll("span, div, b, strong"))
      .filter(el => {
        const style = window.getComputedStyle(el);
        const size = parseFloat(style.fontSize);
        const weight = style.fontWeight;
        return size > 20 || (size > 16 && (weight === 'bold' || parseInt(weight) >= 600));
      })
      .slice(0, 5)
      .map(h => ({ level: "Inferred", text: h.innerText.trim() }))
      .filter(h => h.text.length > 1 && h.text.length < 50);
  }

  // Extract main content (paras, body text)
  const mainText = Array.from(document.querySelectorAll("p, div.content, article, section"))
    .map(p => p.innerText.trim())
    .filter(text => text.length > 50)
    .slice(0, 10); // Limit to top 10 blocks to avoid overload

  const images = Array.from(document.querySelectorAll("img")).map(img => ({
    src: img.src,
    alt: img.alt || "Missing Description",
    isAccessible: !!img.alt && img.alt.trim().length > 0
  })).filter(img => img.src && img.src.startsWith('http'));

  return {
    title: document.title,
    headings,
    mainText,
    images,
    url: window.location.href
  };
};