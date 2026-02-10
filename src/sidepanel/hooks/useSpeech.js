import { useState, useCallback, useRef } from 'react';

export const useSpeech = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [rate, setRate] = useState(1.0);
  
  const shouldBeListening = useRef(false); 
  const recognitionRef = useRef(null);

  const speak = useCallback((text) => {
    if (!text) return;

    chrome.tts.stop();

    chrome.tts.speak(text, {
      rate: rate,
      onEvent: (event) => {
        if (event.type === 'start') {
          setIsSpeaking(true);
        }
        if (event.type === 'end' || event.type === 'interrupted' || event.type === 'error') {
          setIsSpeaking(false);
        }
      }
    });
  }, [rate]);

  const stopSpeaking = useCallback(() => {
    chrome.tts.stop();
    setIsSpeaking(false);
  }, []);

  const toggleListening = (onResult) => {
    if (isListening) {
      shouldBeListening.current = false;
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'en-US';
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsListening(true);
      shouldBeListening.current = true;
    };

    recognition.onend = () => {
      if (shouldBeListening.current) {
        setTimeout(() => {
          if (shouldBeListening.current) {
            try { recognition.start(); } catch(e) {}
          }
        }, 300);
      }
    };

    recognition.onresult = (event) => {
      const command = event.results[0][0].transcript.toLowerCase();
      console.log("🎤 Mic Heard:", command);
      onResult(command);
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech') return;
      setIsListening(false);
      shouldBeListening.current = false;
    };

    recognition.start();
  };

  return { speak, stopSpeaking, isSpeaking, toggleListening, isListening, setRate, rate };
};