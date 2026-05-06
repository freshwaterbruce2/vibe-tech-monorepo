import { useCallback, useEffect, useRef } from 'react';
import { useGamesHostBridge, type GameSoundType } from '../core/hostBridge';
import { logger } from '../utils/logger';

export function useGameAudio() {
  const { playSound: hostPlaySound } = useGamesHostBridge();
  const audioContext = useRef<AudioContext | null>(null);

  useEffect(() => {
    const initAudio = () => {
      if (audioContext.current || typeof window === 'undefined') return;

      const AudioContextClass =
        window.AudioContext ??
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (!AudioContextClass) return;
      audioContext.current = new AudioContextClass();
    };

    window.addEventListener('click', initAudio, { once: true });
    window.addEventListener('touchstart', initAudio, { once: true });

    return () => {
      window.removeEventListener('click', initAudio);
      window.removeEventListener('touchstart', initAudio);
    };
  }, []);

  const playTone = useCallback(
    (frequency: number, type: OscillatorType, duration: number, volume = 0.1) => {
      if (!audioContext.current) return;

      try {
        if (audioContext.current.state === 'suspended') {
          void audioContext.current.resume().catch(() => {});
        }

        const oscillator = audioContext.current.createOscillator();
        const gainNode = audioContext.current.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, audioContext.current.currentTime);
        gainNode.gain.setValueAtTime(volume, audioContext.current.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          audioContext.current.currentTime + duration,
        );

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.current.destination);
        oscillator.start();
        oscillator.stop(audioContext.current.currentTime + duration);
      } catch (error) {
        logger.warn('Audio play failed', error);
      }
    },
    [],
  );

  const playSound = useCallback(
    (type: GameSoundType) => {
      if (hostPlaySound) {
        hostPlaySound(type);
        return;
      }

      if (!audioContext.current) return;

      switch (type) {
        case 'pop':
          playTone(600, 'sine', 0.1, 0.2);
          setTimeout(() => playTone(800, 'sine', 0.15, 0.1), 30);
          break;
        case 'success':
          playTone(523.25, 'sine', 0.2, 0.2);
          setTimeout(() => playTone(659.25, 'sine', 0.3, 0.2), 100);
          break;
        case 'error':
          playTone(150, 'triangle', 0.3, 0.3);
          setTimeout(() => playTone(140, 'triangle', 0.3, 0.3), 100);
          break;
        case 'levelUp':
        case 'victory':
          playTone(523.25, 'square', 0.15, 0.1);
          setTimeout(() => playTone(659.25, 'square', 0.15, 0.1), 150);
          setTimeout(() => playTone(783.99, 'square', 0.15, 0.1), 300);
          setTimeout(() => playTone(1046.5, 'square', 0.4, 0.15), 450);
          break;
      }
    },
    [hostPlaySound, playTone],
  );

  return { playSound };
}
