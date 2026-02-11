import React from 'react';
import { Mic, MicOff, Square, Play, FastForward, Rewind } from 'lucide-react';

const VoiceInterface = ({ speech, onCommand, pageTitle }) => {
  const { speak, stopSpeaking, isSpeaking, toggleListening, isListening, rate, setRate } = speech;

  // Pulse animation for listening state
  const pulseKeyframes = `
    @keyframes voicePulse {
      0% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.02); opacity: 0.8; }
      100% { transform: scale(1); opacity: 1; }
    }
  `;

  return (
    <div style={{ 
      padding: '1em', 
      background: 'rgba(0,0,0,0.03)', // Subtle tint that works in any contrast
      borderRadius: '10px', 
      border: '2px solid var(--border-main)',
      color: 'var(--text-main)',
      marginBottom: '1em'
    }}>
      <style>{pulseKeyframes}</style>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8em' }}>
        <strong style={{ color: 'var(--accent-main)', fontSize: '1em' }}>Voice Control</strong>
        <span style={{ 
          fontSize: '0.85em', 
          fontWeight: 'bold', 
          color: isListening ? 'var(--accent-main)' : 'var(--text-main)',
          textTransform: 'uppercase'
        }}>
          {isListening ? "● Listening" : "Idle"}
        </span>
      </div>

      <div style={{ 
        display: 'flex', 
        gap: '0.6em', 
        flexWrap: 'wrap' // Ensures buttons stack if font size is too large
      }}>
        {/* Toggle listening */}
        <button 
            onClick={() => toggleListening(onCommand)}
            style={{ 
                flex: '2 1 150px',
                padding: '0.8em', 
                background: isListening ? 'var(--text-main)' : 'var(--accent-main)', 
                color: isListening ? 'var(--bg-main)' : '#ffffff', 
                border: 'none', 
                borderRadius: '8px', 
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.9em',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5em',
                animation: isListening ? 'voicePulse 1.5s infinite' : 'none',
                boxShadow: isListening ? '0 0 10px var(--accent-main)' : 'none'
            }}
            >
            {isListening ? <Mic size={20} /> : <MicOff size={20} />}
            {isListening ? "Listening..." : "Enable Voice"}
        </button>

        {/* Read current status */}
        <button 
          onClick={() => speak(pageTitle ? `Current page: ${pageTitle}` : "No page scanned yet.")}
          title="Repeat Title"
          style={{ 
            flex: '1 1 50px', 
            padding: '0.8em', 
            background: 'var(--accent-main)', 
            border: 'none', 
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Play size={20} color="#ffffff" />
        </button>

        {/* Stop speech */}
        <button 
          onClick={stopSpeaking}
          disabled={!isSpeaking}
          title="Stop Reading"
          style={{ 
            flex: '1 1 50px', 
            padding: '0.8em', 
            background: 'var(--text-main)', 
            color: 'var(--bg-main)', 
            border: 'none', 
            borderRadius: '8px',
            cursor: !isSpeaking ? 'default' : 'pointer',
            opacity: isSpeaking ? 1 : 0.3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Square size={20} fill="currentColor" />
        </button>
      </div>

      {/* Speed Controls */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        gap: '1.2em', 
        marginTop: '1em', 
        borderTop: '1px solid var(--border-main)',
        paddingTop: '0.8em'
      }}>
        <button 
           style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5em' }}
           onClick={() => setRate(prev => Math.max(0.5, prev - 0.2))}
        >
          <Rewind size={22} color='var(--accent-main)'/>
        </button>
        
        <span style={{ fontSize: '0.95em', fontWeight: 'bold' }}>
          Speed: {rate.toFixed(1)}x
        </span>
        
        <button 
           style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.5em' }}
           onClick={() => setRate(prev => Math.min(2, prev + 0.2))}
        >
          <FastForward size={22} color='var(--accent-main)'/>
        </button>
      </div>
    </div>
  );
};

export default VoiceInterface;