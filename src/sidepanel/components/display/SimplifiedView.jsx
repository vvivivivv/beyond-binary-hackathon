import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Volume2, Image as ImageIcon, Link as LinkIcon } from 'lucide-react';

const SimplifiedView = ({ data, profile }) => {
  const [expandedSections, setExpandedSections] = useState(new Set());
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentReading, setCurrentReading] = useState(null);

  useEffect(() => {
    if (data && profile?.outputModes.speech) {
      // Auto-generate summary if speech is enabled
      generateSummary();
    }
  }, [data, profile]);

  const generateSummary = async () => {
    if (!data) return;

    setIsLoading(true);
    try {
      // Send message to background script to generate summary
      const response = await chrome.runtime.sendMessage({
        action: 'summarizeContent',
        content: data.mainContent || data.fullText,
        headings: data.headings
      });

      if (response?.summary) {
        setSummary(response.summary);
      }
    } catch (error) {
      console.error('Failed to generate summary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSection = (index) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSections(newExpanded);
  };

  const readAloud = (text, id) => {
    if (!profile?.outputModes.speech) return;

    // Stop current reading
    window.speechSynthesis.cancel();

    if (currentReading === id) {
      setCurrentReading(null);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = profile.preferences.speechRate || 1.0;
    utterance.volume = profile.preferences.speechVolume || 1.0;
    utterance.lang = 'en-US';

    utterance.onstart = () => {
      setCurrentReading(id);
    };

    utterance.onend = () => {
      setCurrentReading(null);
    };

    utterance.onerror = () => {
      setCurrentReading(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  if (!data) {
    return (
      <div className="simplified-view-empty">
        <p>No page data available</p>
      </div>
    );
  }

  return (
    <div className="simplified-view">
      {/* Page Title */}
      {data.title && (
        <div className="page-title-section">
          <h1>{data.title}</h1>
          {profile?.outputModes.speech && (
            <button
              className="read-button"
              onClick={() => readAloud(data.title, 'title')}
              aria-label={currentReading === 'title' ? 'Stop reading' : 'Read title aloud'}
            >
              <Volume2 
                size={20} 
                className={currentReading === 'title' ? 'reading' : ''}
              />
            </button>
          )}
        </div>
      )}

      {/* AI Summary */}
      {(summary || isLoading) && (
        <div className="summary-section">
          <h2>AI Summary</h2>
          {isLoading ? (
            <div className="summary-loading">
              <div className="spinner-small"></div>
              <p>Generating summary...</p>
            </div>
          ) : (
            <>
              <p className="summary-text">{summary}</p>
              {profile?.outputModes.speech && (
                <button
                  className="read-button read-button-inline"
                  onClick={() => readAloud(summary, 'summary')}
                  aria-label={currentReading === 'summary' ? 'Stop reading summary' : 'Read summary aloud'}
                >
                  <Volume2 
                    size={18} 
                    className={currentReading === 'summary' ? 'reading' : ''}
                  />
                  {currentReading === 'summary' ? 'Stop' : 'Read Summary'}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Main Content Sections */}
      {data.sections && data.sections.length > 0 && (
        <div className="content-sections">
          <h2>Page Sections</h2>
          {data.sections.map((section, index) => (
            <div 
              key={index} 
              className={`content-section ${expandedSections.has(index) ? 'expanded' : ''}`}
            >
              <button
                className="section-header"
                onClick={() => toggleSection(index)}
                aria-expanded={expandedSections.has(index)}
              >
                {expandedSections.has(index) ? (
                  <ChevronDown size={20} />
                ) : (
                  <ChevronRight size={20} />
                )}
                <h3>{section.heading || `Section ${index + 1}`}</h3>
                {profile?.outputModes.speech && expandedSections.has(index) && (
                  <button
                    className="read-button-icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      readAloud(section.content, `section-${index}`);
                    }}
                    aria-label="Read section aloud"
                  >
                    <Volume2 
                      size={18} 
                      className={currentReading === `section-${index}` ? 'reading' : ''}
                    />
                  </button>
                )}
              </button>

              {expandedSections.has(index) && (
                <div className="section-content">
                  {section.content && (
                    <div className="section-text">
                      {section.content.split('\n\n').map((paragraph, pIndex) => (
                        <p key={pIndex}>{paragraph}</p>
                      ))}
                    </div>
                  )}

                  {section.list && section.list.length > 0 && (
                    <ul className="section-list">
                      {section.list.map((item, itemIndex) => (
                        <li key={itemIndex}>{item}</li>
                      ))}
                    </ul>
                  )}

                  {section.links && section.links.length > 0 && (
                    <div className="section-links">
                      <h4><LinkIcon size={16} /> Links in this section:</h4>
                      <ul>
                        {section.links.map((link, linkIndex) => (
                          <li key={linkIndex}>
                            <a 
                              href={link.href} 
                              target="_blank" 
                              rel="noopener noreferrer"
                            >
                              {link.text || link.href}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Images */}
      {data.images && data.images.length > 0 && (
        <div className="images-section">
          <h2><ImageIcon size={20} /> Images on Page</h2>
          <div className="images-grid">
            {data.images.map((img, index) => (
              <div key={index} className="image-card">
                <img 
                  src={img.src} 
                  alt={img.alt || `Image ${index + 1}`}
                  loading="lazy"
                />
                {img.alt ? (
                  <p className="image-caption">{img.alt}</p>
                ) : (
                  <p className="image-caption missing-alt">
                    No description available
                    {profile?.outputModes.speech && (
                      <button
                        className="describe-button"
                        onClick={() => {
                          // Request AI image description
                          chrome.runtime.sendMessage({
                            action: 'describeImage',
                            imageUrl: img.src
                          });
                        }}
                      >
                        Get AI Description
                      </button>
                    )}
                  </p>
                )}
                {profile?.outputModes.speech && img.alt && (
                  <button
                    className="read-button-small"
                    onClick={() => readAloud(img.alt, `image-${index}`)}
                    aria-label="Read image description"
                  >
                    <Volume2 
                      size={16} 
                      className={currentReading === `image-${index}` ? 'reading' : ''}
                    />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Links Summary */}
      {data.links && data.links.length > 0 && (
        <div className="links-section">
          <h2><LinkIcon size={20} /> All Links ({data.links.length})</h2>
          <ul className="links-list">
            {data.links.slice(0, 20).map((link, index) => (
              <li key={index}>
                <a 
                  href={link.href} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  {link.text || link.href}
                </a>
              </li>
            ))}
            {data.links.length > 20 && (
              <li className="more-links">
                ...and {data.links.length - 20} more links
              </li>
            )}
          </ul>
        </div>
      )}

      <style jsx>{`
        .simplified-view {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xl);
        }

        .page-title-section {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: var(--spacing-md);
          padding-bottom: var(--spacing-lg);
          border-bottom: 3px solid var(--color-border);
        }

        .page-title-section h1 {
          flex: 1;
          font-size: calc(var(--base-font-size) * 2);
          font-weight: 700;
          line-height: 1.2;
          color: var(--color-text-primary);
        }

        .summary-section {
          background-color: var(--color-bg-accent);
          padding: var(--spacing-lg);
          border-radius: var(--radius-lg);
          border: 2px solid var(--color-primary);
        }

        .summary-section h2 {
          font-size: calc(var(--base-font-size) * 1.5);
          margin-bottom: var(--spacing-md);
          color: var(--color-text-primary);
        }

        .summary-text {
          font-size: calc(var(--base-font-size) * 1.1);
          line-height: 1.8;
          margin-bottom: var(--spacing-md);
          color: var(--color-text-primary);
        }

        .summary-loading {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          padding: var(--spacing-lg);
        }

        .spinner-small {
          width: 24px;
          height: 24px;
          border: 3px solid var(--color-bg-tertiary);
          border-top-color: var(--color-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .content-sections h2,
        .images-section h2,
        .links-section h2 {
          font-size: calc(var(--base-font-size) * 1.5);
          margin-bottom: var(--spacing-md);
          color: var(--color-text-primary);
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
        }

        .content-section {
          border: 2px solid var(--color-border);
          border-radius: var(--radius-md);
          margin-bottom: var(--spacing-md);
          overflow: hidden;
          transition: all var(--transition-normal);
        }

        .content-section.expanded {
          border-color: var(--color-primary);
        }

        .section-header {
          width: 100%;
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          padding: var(--spacing-md) var(--spacing-lg);
          background-color: var(--color-bg-secondary);
          border: none;
          cursor: pointer;
          transition: background-color var(--transition-fast);
          text-align: left;
        }

        .section-header:hover {
          background-color: var(--color-bg-tertiary);
        }

        .section-header h3 {
          flex: 1;
          font-size: calc(var(--base-font-size) * 1.2);
          font-weight: 600;
          color: var(--color-text-primary);
        }

        .section-content {
          padding: var(--spacing-lg);
          background-color: var(--color-bg-primary);
        }

        .section-text p {
          margin-bottom: var(--spacing-md);
          line-height: 1.8;
          color: var(--color-text-primary);
        }

        .section-list {
          padding-left: var(--spacing-xl);
          margin: var(--spacing-md) 0;
        }

        .section-list li {
          margin-bottom: var(--spacing-sm);
          line-height: 1.6;
          color: var(--color-text-primary);
        }

        .section-links {
          margin-top: var(--spacing-lg);
          padding: var(--spacing-md);
          background-color: var(--color-bg-secondary);
          border-radius: var(--radius-md);
        }

        .section-links h4 {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-sm);
          font-size: calc(var(--base-font-size) * 1.1);
          color: var(--color-text-secondary);
        }

        .section-links ul {
          list-style: none;
          padding: 0;
        }

        .section-links li {
          margin-bottom: var(--spacing-xs);
        }

        .section-links a {
          color: var(--color-link);
          text-decoration: underline;
          transition: color var(--transition-fast);
        }

        .section-links a:hover {
          color: var(--color-link-hover);
        }

        .section-links a:visited {
          color: var(--color-link-visited);
        }

        .read-button,
        .read-button-icon,
        .read-button-small {
          background: transparent;
          border: 2px solid var(--color-primary);
          border-radius: var(--radius-md);
          padding: var(--spacing-sm);
          cursor: pointer;
          color: var(--color-primary);
          transition: all var(--transition-fast);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .read-button:hover,
        .read-button-icon:hover,
        .read-button-small:hover {
          background-color: var(--color-primary);
          color: var(--color-bg-primary);
        }

        .read-button-inline {
          padding: var(--spacing-sm) var(--spacing-md);
          gap: var(--spacing-sm);
        }

        .reading {
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .images-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: var(--spacing-lg);
        }

        .image-card {
          border: 2px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: var(--spacing-md);
          background-color: var(--color-bg-secondary);
          position: relative;
        }

        .image-card img {
          width: 100%;
          height: auto;
          border-radius: var(--radius-sm);
          margin-bottom: var(--spacing-sm);
        }

        .image-caption {
          font-size: calc(var(--base-font-size) * 0.9);
          color: var(--color-text-secondary);
          line-height: 1.4;
        }

        .image-caption.missing-alt {
          color: var(--color-warning);
          font-style: italic;
        }

        .describe-button {
          margin-top: var(--spacing-sm);
          padding: var(--spacing-xs) var(--spacing-sm);
          background-color: var(--color-primary);
          color: var(--color-bg-primary);
          border: none;
          border-radius: var(--radius-sm);
          font-size: calc(var(--base-font-size) * 0.85);
          cursor: pointer;
        }

        .links-list {
          list-style: none;
          padding: 0;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: var(--spacing-sm);
        }

        .links-list li {
          padding: var(--spacing-sm);
          background-color: var(--color-bg-secondary);
          border-radius: var(--radius-sm);
        }

        .links-list a {
          color: var(--color-link);
          text-decoration: none;
          transition: color var(--transition-fast);
          word-break: break-word;
        }

        .links-list a:hover {
          color: var(--color-link-hover);
          text-decoration: underline;
        }

        .more-links {
          font-style: italic;
          color: var(--color-text-muted);
        }
      `}</style>
    </div>
  );
};

export default SimplifiedView;