import React, { useState, useEffect } from 'react';
import { User, Volume2, Eye, Hand, Brain, Save, Info, CheckCircle } from 'lucide-react';

const UserProfile = ({ onProfileChange }) => {
  const [profile, setProfile] = useState({
    disabilityType: 'none',
    inputModes: {
      voice: false,
      text: true,
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
      autoAdjust: false
    }
  });

  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    chrome.storage.sync.get(['userProfile'], (result) => {
      if (result.userProfile) {
        setProfile(result.userProfile);
      }
    });
  }, []);

  const updateAndNotify = (updatedProfile) => {
    setProfile(updatedProfile);
    onProfileChange(updatedProfile);
  };

  const saveProfile = () => {
    chrome.storage.sync.set({ userProfile: profile }, () => {
      setShowPopup(true);
      onProfileChange?.(profile);
      setTimeout(() => setShowPopup(false), 3000);
    });
  };

  const handleDisabilityTypeChange = (type) => {
    const updatedProfile = { ...profile, disabilityType: type };
    updatedProfile.preferences.contrast = 'normal';
    updatedProfile.preferences.speechRate = 1.0;

    switch (type) {
      case 'blind':
        updatedProfile.inputModes = { voice: true, text: false, touch: true };
        updatedProfile.outputModes = { speech: true, visual: false };
        updatedProfile.preferences.speechRate = 1.2;
        break;
      case 'low-vision':
        updatedProfile.inputModes = { voice: true, text: true, touch: true };
        updatedProfile.outputModes = { speech: true, visual: true };
        updatedProfile.preferences.fontSize = 20;
        updatedProfile.preferences.contrast = 'high';
        break;
      case 'deaf':
        updatedProfile.inputModes = { voice: false, text: true, touch: true };
        updatedProfile.outputModes = { speech: false, visual: true };
        break;
      case 'motor-impaired':
        updatedProfile.inputModes = { voice: true, text: false, touch: false };
        updatedProfile.outputModes = { speech: true, visual: true };
        break;
      case 'cognitive':
        updatedProfile.inputModes = { voice: true, text: true, touch: true };
        updatedProfile.outputModes = { speech: true, visual: true };
        updatedProfile.preferences.speechRate = 0.8;
        updatedProfile.preferences.fontSize = 18;
        break;
      case 'temporary':
        updatedProfile.inputModes = { voice: true, text: true, touch: true };
        updatedProfile.outputModes = { speech: true, visual: true };
        break;
      default:
        updatedProfile.inputModes = { voice: false, text: true, touch: false };
        updatedProfile.outputModes = { speech: false, visual: true };
        updatedProfile.preferences.contrast = 'normal';
        updatedProfile.preferences.fontSize = 16;
    }
    updateAndNotify(updatedProfile);
  };

  const toggleInputMode = (mode) => {
    const updated = { ...profile, inputModes: { ...profile.inputModes, [mode]: !profile.inputModes[mode] } };
    updateAndNotify(updated);
  };

  const toggleOutputMode = (mode) => {
    const updated = { ...profile, outputModes: { ...profile.outputModes, [mode]: !profile.outputModes[mode] } };
    updateAndNotify(updated);
  };

  const updatePref = (key, val) => {
    const updated = { ...profile, preferences: { ...profile.preferences, [key]: val } };
    updateAndNotify(updated);
  };

  return (
    // FIX: Added height and overflow to allow scrolling when font is large
    <div style={{ 
      height: '80vh', 
      overflowY: 'auto', 
      paddingRight: '10px',
      color: 'var(--text-main)' 
    }}>
      {/* POPUP OVERLAY */}
      {showPopup && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex',
          justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{
            background: 'white', padding: '2em', borderRadius: '12px',
            textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            minWidth: '200px', border: '2px solid var(--accent-main)'
          }}>
            <CheckCircle size={48} color="green" style={{ marginBottom: '0.5em' }} />
            <h2 style={{ margin: '0 0 0.5em 0', color: '#333', fontSize: '1.5em' }}>Saved!</h2>
            <p style={{ color: '#666', marginBottom: '1em', fontSize: '1em' }}>Settings updated successfully.</p>
            <button 
              onClick={() => setShowPopup(false)}
              style={{
                background: 'var(--accent-main)', color: 'white', border: 'none',
                padding: '0.5em 1.5em', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1em'
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5em' }}>
        <h2 style={{ margin: 0, fontSize: '1.5em' }}>Accessibility Profile</h2>
        <button 
          onClick={saveProfile} 
          style={{ display: 'flex', alignItems: 'center', gap: '0.5em', background: 'var(--accent-main)', color: 'white', border: 'none', borderRadius: '6px', padding: '0.5em 1em', cursor: 'pointer', fontSize: '0.9em' }}
        >
          <Save size={18} /> Save
        </button>
      </div>

      {/* Select Profile Grid */}
      <div style={{ marginBottom: '1.5em' }}>
        <h3 style={{ fontSize: '1.1em', marginBottom: '0.8em', color: 'var(--accent-main)' }}>Select Your Profile</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8em' }}>
          {[
            { value: 'none', label: 'Default', icon: User },
            { value: 'blind', label: 'Blind', icon: Eye },
            { value: 'low-vision', label: 'Low Vision', icon: Eye },
            { value: 'deaf', label: 'Deaf', icon: Volume2 },
            { value: 'motor-impaired', label: 'Motor', icon: Hand },
            { value: 'cognitive', label: 'Cognitive', icon: Brain },
            { value: 'temporary', label: 'Temporary', icon: Info }
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => handleDisabilityTypeChange(value)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.6em', padding: '0.8em',
                borderRadius: '8px', border: profile.disabilityType === value ? '2px solid var(--accent-main)' : '1px solid var(--border-main)',
                background: profile.disabilityType === value ? 'rgba(26, 115, 232, 0.1)' : 'var(--bg-main)',
                color: 'var(--text-main)', cursor: 'pointer', textAlign: 'left', fontSize: '0.9em'
              }}
            >
              <Icon size={18} />
              <span style={{ fontWeight: profile.disabilityType === value ? 'bold' : 'normal' }}>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Input / Output Checklist */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1em', marginBottom: '1.5em' }}>
        <div>
          <h3 style={{ fontSize: '1em', color: 'var(--accent-main)', marginBottom: '0.5em' }}>Input Methods</h3>
          {['voice', 'text', 'touch'].map(mode => (
            <label key={mode} style={{ display: 'flex', alignItems: 'center', gap: '0.5em', marginBottom: '0.5em', fontSize: '0.9em' }}>
              <input type="checkbox" checked={profile.inputModes[mode]} onChange={() => toggleInputMode(mode)} />
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </label>
          ))}
        </div>
        <div>
          <h3 style={{ fontSize: '1em', color: 'var(--accent-main)', marginBottom: '0.5em' }}>Output Methods</h3>
          {['speech', 'visual'].map(mode => (
            <label key={mode} style={{ display: 'flex', alignItems: 'center', gap: '0.5em', marginBottom: '0.5em', fontSize: '0.9em' }}>
              <input type="checkbox" checked={profile.outputModes[mode]} onChange={() => toggleOutputMode(mode)} />
              {mode === 'speech' ? 'Speech' : 'Visual'}
            </label>
          ))}
        </div>
      </div>

      {/* Sliders */}
      <div style={{ paddingBottom: '2em' }}>
        <h3 style={{ fontSize: '1.1em', color: 'var(--accent-main)', marginBottom: '0.8em' }}>Preferences</h3>
        
        <div style={{ marginBottom: '1em' }}>
          <label style={{ display: 'block', fontSize: '0.9em', marginBottom: '0.3em' }}>Font Size: {profile.preferences.fontSize}px</label>
          <input type="range" min="12" max="32" value={profile.preferences.fontSize} onChange={(e) => updatePref('fontSize', parseInt(e.target.value))} style={{ width: '100%' }} />
        </div>

        <div style={{ marginBottom: '1em' }}>
          <label style={{ display: 'block', fontSize: '0.9em', marginBottom: '0.3em' }}>Contrast Level</label>
          <select value={profile.preferences.contrast} onChange={(e) => updatePref('contrast', e.target.value)} style={{ width: '100%', padding: '0.5em', borderRadius: '4px', border: '1px solid var(--border-main)', fontSize: '0.9em' }}>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="maximum">Maximum</option>
          </select>
        </div>

        <div style={{ marginBottom: '1em' }}>
          <label style={{ display: 'block', fontSize: '0.9em', marginBottom: '0.3em' }}>Speech Rate: {profile.preferences.speechRate}x</label>
          <input type="range" min="0.5" max="2.0" step="0.1" value={profile.preferences.speechRate} onChange={(e) => updatePref('speechRate', parseFloat(e.target.value))} style={{ width: '100%' }} />
        </div>
        
        <button 
          onClick={saveProfile} 
          style={{ width: '100%', padding: '1em', background: 'var(--accent-main)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1em', cursor: 'pointer', marginTop: '1em' }}
        >
          Save All Changes
        </button>
      </div>
    </div>
  );
};

export default UserProfile;