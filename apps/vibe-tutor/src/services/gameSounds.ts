import { appStore } from '../utils/electronStore';
import { logger } from '../utils/logger';

/**
 * Game Sound Effects System
 *
 * Modular audio system for Brain Games.
 * Respects sensory preferences and provides fallbacks.
 */

// Sound effect types
export type SoundEffect =
  | 'word-found'
  | 'game-complete'
  | 'wrong-selection'
  | 'hint-used'
  | 'level-up'
  | 'achievement';

// Audio context for Web Audio API
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  audioContext ??= new (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  )();
  return audioContext;
}

/**
 * Check if sounds are enabled in sensory preferences
 */
function areSoundsEnabled(): boolean {
  try {
    const sensoryPrefs = appStore.get<Record<string, unknown>>('sensory-prefs') ?? {};
    return sensoryPrefs.soundEnabled !== false;
  } catch {
    return true; // Default to enabled
  }
}

/**
 * Play a simple tone using Web Audio API
 */
function playTone(frequency: number, duration: number, type: OscillatorType = 'sine'): void {
  if (!areSoundsEnabled()) return;

  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    // Envelope for smooth sound
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration / 1000);
  } catch (error) {
    logger.warn('Audio playback failed:', error);
  }
}

/**
 * Play success chord (major triad)
 */
function playSuccessChord(): void {
  playTone(523.25, 200); // C5
  setTimeout(() => playTone(659.25, 200), 50); // E5
  setTimeout(() => playTone(783.99, 300), 100); // G5
}

/**
 * Play error sound (descending notes)
 */
function playErrorSound(): void {
  playTone(400, 100, 'square');
  setTimeout(() => playTone(300, 150, 'square'), 100);
}

/**
 * Play notification beep
 */
function playBeep(): void {
  playTone(800, 100);
}

/**
 * Play victory fanfare
 */
function playVictoryFanfare(): void {
  const notes = [
    { freq: 523.25, delay: 0 }, // C5
    { freq: 659.25, delay: 150 }, // E5
    { freq: 783.99, delay: 300 }, // G5
    { freq: 1046.5, delay: 450 }, // C6
  ];

  notes.forEach((note) => {
    setTimeout(() => playTone(note.freq, 200), note.delay);
  });
}

/**
 * Play level up sound
 */
function playLevelUp(): void {
  const notes = [261.63, 329.63, 392.0, 523.25]; // C4-E4-G4-C5
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 100), i * 80);
  });
}

/**
 * Main sound effect player
 */
export function playSound(effect: SoundEffect): void {
  if (!areSoundsEnabled()) return;

  switch (effect) {
    case 'word-found':
      playSuccessChord();
      break;
    case 'game-complete':
      playVictoryFanfare();
      break;
    case 'wrong-selection':
      playErrorSound();
      break;
    case 'hint-used':
      playBeep();
      break;
    case 'level-up':
      playLevelUp();
      break;
    case 'achievement':
      playVictoryFanfare();
      break;
    default:
      playBeep();
  }
}

/**
 * Initialize audio context (call on user interaction)
 */
export function initializeAudio(): void {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
  } catch (error) {
    logger.warn('Audio initialization failed:', error);
  }
}
