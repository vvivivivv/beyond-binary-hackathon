import React, { useState, useEffect } from 'react';
import { User, Volume2, Eye, Hand, Brain, Save, Settings } from 'lucide-react';

const UserProfile = ({ onProfileChange }) => {
  const [profile, setProfile] = useState({
    disabilityType: 'none',
    inputModes: {
      voice: false,
      text: true,
      camera: false,
      touch: false
    },
    outputModes: {
      speech: false,
      visual: true
    },
    preferences: {
      fontSize: 16,
      contrast: 'normal',
      colorScheme: 'light',
      speechRate: 1.0,
      speechVolume: 1.0,
      autoAdjust: false
    }
  });

  const [showSettings, setShowSettings] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');

  // Load profile from Chrome storage on mount
  useEffect(() => {
    chrome.storage.sync.get(['userProfile'], (result) => {
      if (result.userProfile) {
        setProfile(result.userProfile);
        onProfileChange?.(result.userProfile);
      }
    });
  }, []);

  // Save profile to Chrome storage
  const saveProfile = () => {
    chrome.storage.sync.set({ userProfile: profile }, () => {
      setSaveStatus('Profile saved successfully!');
      onProfileChange?.(profile);
      setTimeout(() => setSaveStatus(''), 3000);
    });
  };

  // Update profile when disability type changes
  const handleDisabilityTypeChange = (type) => {
    const updatedProfile = { ...profile, disabilityType: type };

    // Auto-configure based on disability type
    switch (type) {
      case 'blind':
        updatedProfile.inputModes = { voice: true, text: false, camera: false, touch: true };
        updatedProfile.outputModes = { speech: true, visual: false };
        updatedProfile.preferences.speechRate = 1.2;
        break;
      case 'low-vision':
        updatedProfile.inputModes = { voice: true, text: true, camera: false, touch: true };
        updatedProfile.outputModes = { speech: true, visual: true };
        updatedProfile.preferences.fontSize = 20;
        updatedProfile.preferences.contrast = 'high';
        break;
      case 'deaf':
        updatedProfile.inputModes = { voice: false, text: true, camera: true, touch: true };
        updatedProfile.outputModes = { speech: false, visual: true };
        break;
      case 'motor-impaired':
        updatedProfile.inputModes = { voice: true, text: false, camera: true, touch: false };
        updatedProfile.outputModes = { speech: true, visual: true };
        break;
      case 'cognitive':
        updatedProfile.inputModes = { voice: true, text: true, camera: false, touch: true };
        updatedProfile.outputModes = { speech: true, visual: true };
        updatedProfile.preferences.speechRate = 0.8;
        updatedProfile.preferences.fontSize = 18;
        break;
      case 'temporary':
        updatedProfile.inputModes = { voice: true, text: true, camera: false, touch: true };
        updatedProfile.outputModes = { speech: true, visual: true };
        break;
      default:
        updatedProfile.inputModes = { voice: false, text: true, camera: false, touch: false };
        updatedProfile.outputModes = { speech: false, visual: true };
    }

    setProfile(updatedProfile);
  };

  const toggleInputMode = (mode) => {
    setProfile({
      ...profile,
      inputModes: {
        ...profile.inputModes,
        [mode]: !profile.inputModes[mode]
      }
    });
  };

  const toggleOutputMode = (mode) => {
    setProfile({
      ...profile,
      outputModes: {
        ...profile.outputModes,
        [mode]: !profile.outputModes[mode]
      }
    });
  };

  const updatePreference = (key, value) => {
    setProfile({
      ...profile,
      preferences: {
        ...profile.preferences,
        [key]: value
      }
    });
  };

  return (
    <div className="user-profile">
      <div className="profile-header">
        <User size={24} />
        <h2>Accessibility Profile</h2>
        <button 
          className="settings-toggle"
          onClick={() => setShowSettings(!showSettings)}
          aria-label="Toggle settings"
        >
          <Settings size={20} />
        </button>
      </div>

      {/* Disability Type Selection */}
      <div className="profile-section">
        <h3>Select Your Profile</h3>
        <div className="profile-options">
          {[
            { value: 'none', label: 'None / Default', icon: User },
            { value: 'blind', label: 'Blind', icon: Eye },
            { value: 'low-vision', label: 'Low Vision', icon: Eye },
            { value: 'deaf', label: 'Deaf / Hard of Hearing', icon: Volume2 },
            { value: 'motor-impaired', label: 'Motor Impaired', icon: Hand },
            { value: 'cognitive', label: 'Cognitive / Learning', icon: Brain },
            { value: 'temporary', label: 'Temporary Difficulty', icon: Hand }
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              className={`profile-option ${profile.disabilityType === value ? 'active' : ''}`}
              onClick={() => handleDisabilityTypeChange(value)}
              aria-pressed={profile.disabilityType === value}
            >
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {showSettings && (
        <>
          {/* Input Modes */}
          <div className="profile-section">
            <h3>Input Methods</h3>
            <div className="mode-toggles">
              {[
                { key: 'voice', label: 'Voice Commands', icon: Volume2 },
                { key: 'text', label: 'Text Input', icon: Settings },
                { key: 'camera', label: 'Camera / Gestures', icon: Eye },
                { key: 'touch', label: 'Large Touch Targets', icon: Hand }
              ].map(({ key, label, icon: Icon }) => (
                <label key={key} className="mode-toggle">
                  <input
                    type="checkbox"
                    checked={profile.inputModes[key]}
                    onChange={() => toggleInputMode(key)}
                  />
                  <Icon size={18} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Output Modes */}
          <div className="profile-section">
            <h3>Output Methods</h3>
            <div className="mode-toggles">
              {[
                { key: 'speech', label: 'Text-to-Speech', icon: Volume2 },
                { key: 'visual', label: 'Visual Display', icon: Eye }
              ].map(({ key, label, icon: Icon }) => (
                <label key={key} className="mode-toggle">
                  <input
                    type="checkbox"
                    checked={profile.outputModes[key]}
                    onChange={() => toggleOutputMode(key)}
                  />
                  <Icon size={18} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Preferences */}
          <div className="profile-section">
            <h3>Preferences</h3>
            
            {/* Font Size */}
            <div className="preference-control">
              <label htmlFor="fontSize">Font Size: {profile.preferences.fontSize}px</label>
              <input
                id="fontSize"
                type="range"
                min="12"
                max="32"
                value={profile.preferences.fontSize}
                onChange={(e) => updatePreference('fontSize', parseInt(e.target.value))}
              />
            </div>

            {/* Contrast */}
            <div className="preference-control">
              <label htmlFor="contrast">Contrast</label>
              <select
                id="contrast"
                value={profile.preferences.contrast}
                onChange={(e) => updatePreference('contrast', e.target.value)}
              >
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="maximum">Maximum</option>
              </select>
            </div>

            {/* Color Scheme */}
            <div className="preference-control">
              <label htmlFor="colorScheme">Color Scheme</label>
              <select
                id="colorScheme"
                value={profile.preferences.colorScheme}
                onChange={(e) => updatePreference('colorScheme', e.target.value)}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="high-contrast">High Contrast</option>
              </select>
            </div>

            {/* Speech Rate */}
            {profile.outputModes.speech && (
              <div className="preference-control">
                <label htmlFor="speechRate">Speech Rate: {profile.preferences.speechRate}x</label>
                <input
                  id="speechRate"
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={profile.preferences.speechRate}
                  onChange={(e) => updatePreference('speechRate', parseFloat(e.target.value))}
                />
              </div>
            )}

            {/* Speech Volume */}
            {profile.outputModes.speech && (
              <div className="preference-control">
                <label htmlFor="speechVolume">Speech Volume: {Math.round(profile.preferences.speechVolume * 100)}%</label>
                <input
                  id="speechVolume"
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={profile.preferences.speechVolume}
                  onChange={(e) => updatePreference('speechVolume', parseFloat(e.target.value))}
                />
              </div>
            )}

            {/* Auto Adjust */}
            <div className="preference-control">
              <label>
                <input
                  type="checkbox"
                  checked={profile.preferences.autoAdjust}
                  onChange={(e) => updatePreference('autoAdjust', e.target.checked)}
                />
                Auto-adjust based on environment
              </label>
            </div>
          </div>
        </>
      )}

      {/* Save Button */}
      <button className="save-button" onClick={saveProfile}>
        <Save size={20} />
        Save Profile
      </button>

      {saveStatus && <div className="save-status">{saveStatus}</div>}
    </div>
  );
};

export default UserProfile;