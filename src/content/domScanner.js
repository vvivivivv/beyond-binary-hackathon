export const scanPage = () => {
  const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4")).map(h => ({
    level: h.tagName,
    text: h.innerText.trim()
  })).filter(h => h.text.length > 0);

  const images = Array.from(document.querySelectorAll("img")).map(img => ({
    src: img.src,
    alt: img.alt || "⚠️ Missing Alt Text",
    isAccessible: !!img.alt
  })).filter(img => img.src.startsWith('http'));

  const links = Array.from(document.querySelectorAll("a")).map(a => ({
    text: a.innerText.trim(),
    href: a.href
  })).filter(l => l.text.length > 0 && l.href.startsWith('http')).slice(0, 10); // Limit to 10 for now

  const pageData = {
    title: document.title,
    headings,
    images,
    links,
    url: window.location.href
  };

  console.log("🚀 Semantic Mirror Scanned:", pageData);
  return pageData;
};