import { useState, useCallback, useRef, useEffect } from 'react';

export function useTextToSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Pick a high-quality voice once voices are loaded
  useEffect(() => {
    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return;
      
      // Preference order for professional-sounding English voices
      const preferred = [
        'Google UK English Female',
        'Google US English',
        'Microsoft Zira',
        'Microsoft Jenny',
        'Samantha',
        'Karen',
        'Daniel',
      ];
      
      for (const name of preferred) {
        const match = voices.find(v => v.name.includes(name));
        if (match) {
          voiceRef.current = match;
          return;
        }
      }
      
      // Fallback: first English voice
      const englishVoice = voices.find(v => v.lang.startsWith('en'));
      if (englishVoice) voiceRef.current = englishVoice;
      else voiceRef.current = voices[0];
    };
    
    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
    
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const speak = useCallback((text: string) => {
    if (!text || !window.speechSynthesis) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.92;      // Slightly slower for clarity
    utterance.pitch = 1.0;
    utterance.volume = 0.85;
    
    if (voiceRef.current) {
      utterance.voice = voiceRef.current;
    }
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  return { speak, stop, isSpeaking };
}
