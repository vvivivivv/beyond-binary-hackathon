import React from 'react';
import { Mic, MicOff, Square, Play, FastForward, Rewind } from 'lucide-react';

const VoiceInterface = ({ speech, onCommand, pageTitle }) => {
  const { speak, stopSpeaking, isSpeaking, toggleListening, isListening, rate, setRate } = speech;

  return (
    <div style={{ padding: '15px', background: '#e8f0fe', borderRadius: '10px', border: '1px solid #1a73e8' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ color: '#1a73e8' }}>Voice Control</strong>
        <span style={{ fontSize: '12px', fontWeight: 'bold', color: isListening ? '#d93025' : '#5f6368' }}>
          {isListening ? "Listening..." : "Idle"}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        {/* Toggle listening */}
        <button 
            onClick={() => toggleListening(onCommand)}
            style={{ 
                flex: 2, padding: '12px', 
                background: isListening ? '#d93025' : '#1a73e8', 
                color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer',
                animation: isListening ? 'pulse 1.5s infinite' : 'none'
            }}
            >
            {isListening ? "Ears Open (Listening)" : "Turn On Voice Control"}
        </button>

        {/* Read current status */}
        <button 
          onClick={() => speak(pageTitle ? `Current page: ${pageTitle}` : "No page scanned yet.")}
          title="Repeat Title"
          style={{ flex: 1, padding: '12px', background: '#1a73e8', border: '1px solid #1a73e8', borderRadius: '8px' }}
        >
          <Play size={20} color="#ffffff" />
        </button>

        {/* Stop speech */}
        <button 
          onClick={stopSpeaking}
          disabled={!isSpeaking}
          title="Stop Reading"
          style={{ 
            flex: 1, padding: '12px', 
            background: '#3c4043', color: '#1a', border: 'none', borderRadius: '8px',
            opacity: isSpeaking ? 1 : 0.5 
          }}
        >
          <Square size={20} />
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '12px', color: '#1a73e8' }}>
        <button 
           style={{ background: 'none', border: 'none', cursor: 'pointer' }}
           onClick={() => setRate(prev => Math.max(0.5, prev - 0.2))}
        >
          <Rewind size={18} color='#1a73e8'/>
        </button>
        <span style={{ fontSize: '13px', fontWeight: '500' }}>Speed: {rate.toFixed(1)}x</span>
        <button 
           style={{ background: 'none', border: 'none', cursor: 'pointer' }}
           onClick={() => setRate(prev => Math.min(2, prev + 0.2))}
        >
          <FastForward size={18} color='#1a73e8'/>
        </button>
      </div>
    </div>
  );
};

export default VoiceInterface;