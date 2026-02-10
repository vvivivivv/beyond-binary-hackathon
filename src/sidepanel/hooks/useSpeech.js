import { useState, useCallback, useRef } from 'react';

export const useSpeech = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [rate, setRate] = useState(1.0);
  
  const shouldBeListening = useRef(false); 
  const recognitionRef = useRef(null);

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    console.log("Audio queue cleared.");
  }, []);

  const speak = useCallback((text) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    
    utterance.onstart = () => setIsSpeaking(true);
    
    utterance.onend = () => {
        console.log("Finished speaking");
        setIsSpeaking(false);
    };
    utterance.onerror = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);

    const timeout = Math.max(2000, text.length * 100); 
    setTimeout(() => setIsSpeaking(false), timeout);
  }, [rate]);

  const toggleListening = (onResult) => {
    if (isListening) {
      shouldBeListening.current = false;
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      shouldBeListening.current = true;
    };

    recognition.onend = () => {
      if (shouldBeListening.current) {
        setTimeout(() => {
            if (shouldBeListening.current) recognition.start();
        }, 100);
      } else {
        setIsListening(false);
      }
    };

    recognition.onresult = (event) => {
      const command = event.results[0][0].transcript.toLowerCase();
      console.log("Continuous Command:", command);
      onResult(command);
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech') return;
      console.error("Speech Error:", event.error);
      setIsListening(false);
      shouldBeListening.current = false;
    };

    recognition.start();
  };

  return {
    speak,
    stopSpeaking,
    isSpeaking,
    toggleListening,
    isListening,
    setRate,
    rate
  };
};