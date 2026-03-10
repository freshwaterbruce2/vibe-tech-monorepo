import { appStore } from '../utils/electronStore';

/**
 * Adaptive Audio Engine
 * Provides scene-aware soundscapes with preloading, crossfade, and ducking
 * Integrates with Pomodoro timer and sensory settings
 */

export type AudioScene = 'focus' | 'break' | 'wind-down' | 'off';

export interface AudioTrack {
  id: string;
  name: string;
  url: string;
  scene: AudioScene;
  duration: number; // seconds
  loopable: boolean;
}

// Curated adaptive soundscapes (short loops for low bandwidth)
export const ADAPTIVE_TRACKS: AudioTrack[] = [
  {
    id: 'focus-lofi-1',
    name: 'Lofi Focus Beat',
    url: '/audio/focus-lofi.mp3',
    scene: 'focus',
    duration: 120,
    loopable: true,
  },
  {
    id: 'focus-ambient-1',
    name: 'Ambient Concentration',
    url: '/audio/focus-ambient.mp3',
    scene: 'focus',
    duration: 180,
    loopable: true,
  },
  {
    id: 'break-upbeat-1',
    name: 'Upbeat Break',
    url: '/audio/break-upbeat.mp3',
    scene: 'break',
    duration: 90,
    loopable: true,
  },
  {
    id: 'break-nature-1',
    name: 'Nature Sounds',
    url: '/audio/break-nature.mp3',
    scene: 'break',
    duration: 120,
    loopable: true,
  },
  {
    id: 'wind-down-calm-1',
    name: 'Calm Wind Down',
    url: '/audio/wind-down-calm.mp3',
    scene: 'wind-down',
    duration: 180,
    loopable: true,
  },
];

export interface AudioEngineState {
  currentScene: AudioScene;
  isPlaying: boolean;
  volume: number;
  currentTrack: AudioTrack | null;
  preloadedTracks: Map<string, HTMLAudioElement>;
}

class AdaptiveAudioEngine {
  private state: AudioEngineState;
  private primaryAudio: HTMLAudioElement | null = null;
  private secondaryAudio: HTMLAudioElement | null = null;
  private fadeInterval: number | null = null;
  private duckedVolume = 1.0;
  private isDucking = false;

  constructor() {
    this.state = {
      currentScene: 'off',
      isPlaying: false,
      volume: 0.5,
      currentTrack: null,
      preloadedTracks: new Map(),
    };

    this.loadSettings();
  }

  private loadSettings(): void {
    try {
      const settings = appStore.get<{ volume?: number; lastScene?: string }>(
        'adaptive-audio-settings',
      );
      if (settings) {
        this.state.volume = settings.volume ?? 0.5;
        this.state.currentScene = (settings.lastScene as typeof this.state.currentScene) ?? 'off';
      }
    } catch (error) {
      console.warn('Failed to load audio settings:', error);
    }
  }

  private saveSettings(): void {
    try {
      appStore.set(
        'adaptive-audio-settings',
        JSON.stringify({
          volume: this.state.volume,
          lastScene: this.state.currentScene,
        }),
      );
    } catch (error) {
      console.error('Failed to save audio settings:', error);
    }
  }

  /**
   * Preload tracks for a scene
   */
  async preloadScene(scene: AudioScene): Promise<void> {
    if (scene === 'off') return;

    const tracks = ADAPTIVE_TRACKS.filter((t) => t.scene === scene);

    for (const track of tracks) {
      if (!this.state.preloadedTracks.has(track.id)) {
        const audio = new Audio();
        audio.src = track.url;
        audio.preload = 'auto';
        audio.loop = track.loopable;

        // Wait for enough data to be loaded
        await new Promise<void>((resolve) => {
          audio.addEventListener('canplaythrough', () => resolve(), { once: true });
          audio.addEventListener(
            'error',
            () => {
              console.warn(`Failed to preload ${track.name}`);
              resolve();
            },
            { once: true },
          );
        });

        this.state.preloadedTracks.set(track.id, audio);
      }
    }
  }

  /**
   * Switch to a scene with crossfade
   */
  async switchScene(scene: AudioScene, immediate = false): Promise<void> {
    // Check sensory preferences
    const sensoryPrefs = this.getSensoryPreferences();
    if (!sensoryPrefs.soundEnabled) {
      this.stop();
      return;
    }

    if (scene === 'off') {
      this.stop();
      return;
    }

    // Preload scene tracks if not already loaded
    await this.preloadScene(scene);

    // Select a track from the scene
    const sceneTracks = ADAPTIVE_TRACKS.filter((t) => t.scene === scene);
    if (sceneTracks.length === 0) {
      console.warn(`No tracks found for scene: ${scene}`);
      return;
    }

    // Pick a random track from the scene
    const track = sceneTracks[Math.floor(Math.random() * sceneTracks.length)];
    if (!track) return;
    const audio = this.state.preloadedTracks.get(track.id);

    if (!audio) {
      console.warn(`Track not preloaded: ${track.id}`);
      return;
    }

    this.state.currentScene = scene;
    this.state.currentTrack = track ?? null;

    if (immediate || !this.primaryAudio || !this.state.isPlaying) {
      // Direct switch
      this.primaryAudio = audio;
      audio.volume = this.state.volume;
      await audio.play();
      this.state.isPlaying = true;
    } else {
      // Crossfade
      await this.crossfade(audio);
    }

    this.saveSettings();
  }

  /**
   * Crossfade between current and new track
   */
  private async crossfade(newAudio: HTMLAudioElement, duration = 2000): Promise<void> {
    if (!this.primaryAudio) {
      this.primaryAudio = newAudio;
      newAudio.volume = this.state.volume;
      await newAudio.play();
      return;
    }

    const oldAudio = this.primaryAudio;
    this.secondaryAudio = newAudio;

    // Start new track at 0 volume
    newAudio.volume = 0;
    await newAudio.play();

    // Crossfade
    const steps = 50;
    const stepDuration = duration / steps;

    for (let i = 0; i <= steps; i++) {
      await new Promise((resolve) => setTimeout(resolve, stepDuration));

      const progress = i / steps;
      oldAudio.volume = this.state.volume * (1 - progress);
      newAudio.volume = this.state.volume * progress;
    }

    // Cleanup old audio
    oldAudio.pause();
    oldAudio.currentTime = 0;
    this.primaryAudio = newAudio;
    this.secondaryAudio = null;
  }

  /**
   * Duck audio (reduce volume temporarily, e.g., for TTS)
   */
  duck(targetVolume = 0.2, duration = 500): void {
    if (!this.primaryAudio || this.isDucking) return;

    this.isDucking = true;
    this.duckedVolume = this.primaryAudio.volume;

    const steps = 20;
    const stepDuration = duration / steps;
    const volumeDelta = (this.duckedVolume - targetVolume) / steps;

    let currentStep = 0;
    this.fadeInterval = window.setInterval(() => {
      if (!this.primaryAudio) {
        this.clearFadeInterval();
        return;
      }

      currentStep++;
      this.primaryAudio.volume = Math.max(
        targetVolume,
        this.duckedVolume - volumeDelta * currentStep,
      );

      if (currentStep >= steps) {
        this.clearFadeInterval();
      }
    }, stepDuration);
  }

  /**
   * Restore audio volume after ducking
   */
  unduck(duration = 500): void {
    if (!this.primaryAudio || !this.isDucking) return;

    const targetVolume = this.duckedVolume;
    const currentVolume = this.primaryAudio.volume;
    const steps = 20;
    const stepDuration = duration / steps;
    const volumeDelta = (targetVolume - currentVolume) / steps;

    let currentStep = 0;
    this.fadeInterval = window.setInterval(() => {
      if (!this.primaryAudio) {
        this.clearFadeInterval();
        return;
      }

      currentStep++;
      this.primaryAudio.volume = Math.min(targetVolume, currentVolume + volumeDelta * currentStep);

      if (currentStep >= steps) {
        this.clearFadeInterval();
        this.isDucking = false;
      }
    }, stepDuration);
  }

  private clearFadeInterval(): void {
    if (this.fadeInterval !== null) {
      clearInterval(this.fadeInterval);
      this.fadeInterval = null;
    }
  }

  /**
   * Set volume
   */
  setVolume(volume: number): void {
    this.state.volume = Math.max(0, Math.min(1, volume));
    if (this.primaryAudio && !this.isDucking) {
      this.primaryAudio.volume = this.state.volume;
    }
    this.saveSettings();
  }

  /**
   * Play/resume
   */
  async play(): Promise<void> {
    if (this.primaryAudio && !this.state.isPlaying) {
      await this.primaryAudio.play();
      this.state.isPlaying = true;
    }
  }

  /**
   * Pause
   */
  pause(): void {
    if (this.primaryAudio && this.state.isPlaying) {
      this.primaryAudio.pause();
      this.state.isPlaying = false;
    }
  }

  /**
   * Stop and reset
   */
  stop(): void {
    if (this.primaryAudio) {
      this.primaryAudio.pause();
      this.primaryAudio.currentTime = 0;
    }
    if (this.secondaryAudio) {
      this.secondaryAudio.pause();
      this.secondaryAudio.currentTime = 0;
    }
    this.state.isPlaying = false;
    this.state.currentScene = 'off';
    this.state.currentTrack = null;
    this.clearFadeInterval();
  }

  /**
   * Get current state
   */
  getState(): AudioEngineState {
    return { ...this.state };
  }

  /**
   * Get sensory preferences
   */
  private getSensoryPreferences(): { soundEnabled: boolean } {
    try {
      const prefs = appStore.get<{ soundEnabled?: boolean }>('sensory-prefs');
      if (prefs) {
        return { soundEnabled: prefs.soundEnabled !== false };
      }
    } catch (error) {
      console.warn('Failed to load sensory preferences:', error);
    }
    return { soundEnabled: true };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stop();
    this.state.preloadedTracks.clear();
  }
}

// Export singleton
export const adaptiveAudio = new AdaptiveAudioEngine();
