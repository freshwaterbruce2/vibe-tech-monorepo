import { useCallback, useEffect, useRef } from 'react';

type SoundType = 'pop' | 'success' | 'error' | 'victory' | 'levelUp';

export function useGameAudio() {
  const audioContext = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Initialize lazily to respect browser auto-play policies
    const initAudio = () => {
      if (!audioContext.current) {
        audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    };
    
    // Add listeners to initialize on first interaction
    window.addEventListener('click', initAudio, { once: true });
    window.addEventListener('touchstart', initAudio, { once: true });

    return () => {
      window.removeEventListener('click', initAudio);
      window.removeEventListener('touchstart', initAudio);
    };
  }, []);

  const playTone = useCallback((frequency: number, type: OscillatorType, duration: number, volume: number = 0.1) => {
    if (!audioContext.current) return;
    try {
      if (audioContext.current.state === 'suspended') {
        audioContext.current.resume();
      }
      
      const oscillator = audioContext.current.createOscillator();
      const gainNode = audioContext.current.createGain();

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, audioContext.current.currentTime);

      gainNode.gain.setValueAtTime(volume, audioContext.current.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.current.currentTime + duration);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.current.destination);

      oscillator.start();
      oscillator.stop(audioContext.current.currentTime + duration);
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  }, []);

  const playSound = useCallback((type: SoundType) => {
    if (!audioContext.current) return;

    switch (type) {
      case 'pop':
        // Short, high-pitched pluck (Sine wave)
        playTone(600, 'sine', 0.1, 0.2);
        setTimeout(() => playTone(800, 'sine', 0.15, 0.1), 30);
        break;
      case 'success':
        // Ascending major third
        playTone(523.25, 'sine', 0.2, 0.2); // C5
        setTimeout(() => playTone(659.25, 'sine', 0.3, 0.2), 100); // E5
        break;
      case 'error':
        // Low, slightly dissonant thud
        playTone(150, 'triangle', 0.3, 0.3);
        setTimeout(() => playTone(140, 'triangle', 0.3, 0.3), 100);
        break;
      case 'victory':
      case 'levelUp':
        // Fanfare (C major arpeggio)
        playTone(523.25, 'square', 0.15, 0.1); // C5
        setTimeout(() => playTone(659.25, 'square', 0.15, 0.1), 150); // E5
        setTimeout(() => playTone(783.99, 'square', 0.15, 0.1), 300); // G5
        setTimeout(() => playTone(1046.50, 'square', 0.4, 0.15), 450); // C6
        break;
    }
  }, [playTone]);

  return { playSound };
}
