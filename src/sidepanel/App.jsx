import React, { useState, useEffect } from 'react';
import UserProfile from './components/profile/UserProfile';
import SimplifiedView from './components/display/SimplifiedView';
//import GestureCamera from './components/multimodal/GestureCamera';
//import VoiceInterface from './components/multimodal/VoiceInterface';
import { Menu, X } from 'lucide-react';

function App() {
  const [userProfile, setUserProfile] = useState(null);
  const [pageData, setPageData] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [currentView, setCurrentView] = useState('simplified');
  const [isLoading, setIsLoading] = useState(true);

  // Load initial page data
  useEffect(() => {
    // Request page data from content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: 'getPageData' },
          (response) => {
            if (response?.data) {
              setPageData(response.data);
            }
            setIsLoading(false);
          }
        );
      } else {
        setIsLoading(false);
      }
    });

    // Listen for page updates
    const messageListener = (message) => {
      if (message.action === 'pageDataUpdated') {
        setPageData(message.data);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);
    return () => chrome.runtime.onMessage.removeListener(messageListener);
  }, []);

  // Apply theme based on user profile
  useEffect(() => {
    if (userProfile) {
      const root = document.documentElement;
      
      // Apply font size
      root.style.setProperty('--base-font-size', `${userProfile.preferences.fontSize}px`);
      
      // Apply color scheme
      root.setAttribute('data-theme', userProfile.preferences.colorScheme);
      
      // Apply contrast
      root.setAttribute('data-contrast', userProfile.preferences.contrast);
    }
  }, [userProfile]);

  const handleProfileChange = (newProfile) => {
    setUserProfile(newProfile);
    
    // Notify background script of profile change
    chrome.runtime.sendMessage({
      action: 'profileUpdated',
      profile: newProfile
    });
  };

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="spinner"></div>
        <p>Loading accessibility interface...</p>
      </div>
    );
  }

  return (
    <div className="app-container" data-touch-mode={userProfile?.inputModes.touch}>
      {/* Header */}
      <header className="app-header">
        <h1>Accessibility Assistant</h1>
        <button
          className="profile-toggle"
          onClick={() => setShowProfile(!showProfile)}
          aria-label="Toggle profile settings"
          aria-expanded={showProfile}
        >
          {showProfile ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Profile Panel (Collapsible) */}
      {showProfile && (
        <div className="profile-panel">
          <UserProfile
            onProfileChange={setUserProfile}
            onClose={() => setShowProfile(false)}
          />
        </div>
      )}

      {/* Main Content Area */}
      <main className="app-main">
        {/* View Selector */}
        <nav className="view-selector" role="tablist">
          <button
            role="tab"
            aria-selected={currentView === 'simplified'}
            onClick={() => setCurrentView('simplified')}
            className={currentView === 'simplified' ? 'active' : ''}
          >
            Simplified View
          </button>
        </nav>

        {/* Content Display */}
        <div className="content-area">
          {currentView === 'simplified' && pageData && (
            <SimplifiedView 
              data={pageData} 
              profile={userProfile}
            />
          )}
          
          {!pageData && currentView === 'simplified' && (
            <div className="no-data">
              <h2>Welcome to Accessibility Assistant</h2>
              <p>Click the menu icon above to configure your accessibility profile.</p>
            </div>
          )}
        </div>
      </main>

      {/*{userProfile?.inputModes.voice && (
        <VoiceInterface profile={userProfile} />
      )}

      {userProfile?.inputModes.camera && (
        <GestureCamera profile={userProfile} />
      )}*/}


      {/* Status Bar */}
      <footer className="app-footer">
        <div className="status-indicators">
          {userProfile?.inputModes.voice && (
            <span className="indicator voice-active" title="Voice input ready">
              🎤
            </span>
          )}
          {userProfile?.inputModes.camera && (
            <span className="indicator camera-active" title="Camera ready">
              📷
            </span>
          )}
          {userProfile?.outputModes.speech && (
            <span className="indicator speech-active" title="Speech output active">
              🔊
            </span>
          )}
        </div>
        <span className="profile-name">
          {userProfile?.disabilityType !== 'none' && userProfile?.disabilityType
            ? userProfile.disabilityType.replace('-', ' ').toUpperCase()
            : 'Default Profile'}
        </span>
      </footer>
    </div>
  );
}

export default App;