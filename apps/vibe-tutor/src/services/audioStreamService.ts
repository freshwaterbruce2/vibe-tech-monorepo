/**
 * Audio Stream Service - Hybrid audio streaming for radio
 * Uses @mediagrid/capacitor-native-audio on Android/iOS for background playback
 * Falls back to HTML5 Audio on web for compatibility
 */

import { logger } from '../utils/logger';
import { BLAKE_CONFIG } from '@/config';
import { Capacitor } from '@capacitor/core';
import type { RadioStation } from '../types';

// @mediagrid/capacitor-native-audio types (matching actual plugin API)
interface MediaGridAudioPlugin {
  create(params: {
    audioId: string;
    audioSource: string;
    friendlyTitle: string;
    useForNotification: boolean;
    artworkSource?: string;
    isBackgroundMusic?: boolean;
    loop?: boolean;
  }): Promise<{ success: boolean }>;
  initialize(params: { audioId: string }): Promise<{ success: boolean }>;
  play(params: { audioId: string }): Promise<void>;
  pause(params: { audioId: string }): Promise<void>;
  stop(params: { audioId: string }): Promise<void>;
  destroy(params: { audioId: string }): Promise<void>;
  setVolume(params: { audioId: string; volume: number }): Promise<void>;
  changeAudioSource(params: { audioId: string; source: string }): Promise<void>;
  isPlaying(params: { audioId: string }): Promise<{ isPlaying: boolean }>;
  onAudioReady(params: { audioId: string }, callback: () => void): Promise<{ callbackId: string }>;
  onPlaybackStatusChange(
    params: { audioId: string },
    callback: (result: { status: 'playing' | 'paused' | 'stopped' }) => void,
  ): Promise<{ callbackId: string }>;
}

// Import native audio plugin dynamically
let NativeAudio: MediaGridAudioPlugin | null = null;

// Consistent audio ID for the single radio stream
const RADIO_AUDIO_ID = 'radio-stream';

// Helper to extract error message from unknown error
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export interface RadioStatus {
  isPlaying: boolean;
  station: RadioStation | null;
  error: string | null;
}

export type RadioStatusCallback = (status: RadioStatus) => void;

class AudioStreamService {
  private audio: HTMLAudioElement | null = null;
  private currentStation: RadioStation | null = null;
  private _isPlaying = false;
  private statusCallback: RadioStatusCallback | null = null;
  private lastError: string | null = null;
  private isNativeMode = false;
  private isInitialized = false;
  private nativeCreated = false;

  constructor() {
    // Initialize HTML5 Audio immediately (synchronous fallback)
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.audio.crossOrigin = 'anonymous';
    this.setupListeners();

    // Try native audio async (non-blocking)
    void this.init();
  }

  /**
   * Initialize the service with platform detection
   */
  private async init(): Promise<void> {
    if (this.isInitialized) return;

    // Try to load native audio plugin on native platforms
    if (Capacitor.isNativePlatform()) {
      try {
        const module = await import('@mediagrid/capacitor-native-audio');
        NativeAudio = module.AudioPlayer as unknown as MediaGridAudioPlugin;
        this.isNativeMode = true;
      } catch (error) {
        logger.warn('[AudioStream] Native audio not available, using HTML5:', error);
        this.isNativeMode = false;
      }
    }

    this.isInitialized = true;
  }

  /**
   * Ensure initialization before operations
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }
  }

  /**
   * Setup audio event listeners (HTML5 only)
   */
  private setupListeners(): void {
    if (!this.audio) return;

    this.audio.addEventListener('play', () => {
      this._isPlaying = true;
      this.lastError = null;
      this.notifyStatusChange();
    });

    this.audio.addEventListener('pause', () => {
      this._isPlaying = false;
      this.notifyStatusChange();
    });

    this.audio.addEventListener('ended', () => {
      this._isPlaying = false;
      this.notifyStatusChange();
    });

    this.audio.addEventListener('error', () => {
      this._isPlaying = false;

      const error = this.audio?.error;
      let errorMessage = 'Failed to play radio station';

      if (error) {
        switch (error.code) {
          case error.MEDIA_ERR_ABORTED:
            errorMessage = 'Playback aborted. Please try again.';
            break;
          case error.MEDIA_ERR_NETWORK:
            errorMessage = 'Network error. Check your internet connection.';
            break;
          case error.MEDIA_ERR_DECODE:
            errorMessage = 'Stream format not supported. Try another station.';
            break;
          case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'Stream not available. Station may be offline.';
            break;
          default:
            errorMessage = error.message ?? 'Unknown error occurred';
        }
      }

      this.lastError = errorMessage;
      this.notifyStatusChange();
      logger.error('[AudioStream] HTML5 Audio error:', errorMessage, error);
    });

    this.audio.addEventListener('waiting', () => {
    });

    this.audio.addEventListener('canplay', () => {
    });
  }

  /**
   * Subscribe to status updates
   */
  public onStatusChange(callback: RadioStatusCallback): void {
    this.statusCallback = callback;
    this.notifyStatusChange();
  }

  /**
   * Notify subscribers of status change
   */
  private notifyStatusChange(): void {
    if (this.statusCallback) {
      this.statusCallback({
        isPlaying: this._isPlaying,
        station: this.currentStation,
        error: this.lastError,
      });
    }
  }

  /**
   * Build a proxied stream URL for HTML5 Audio on Android (WebView CSP bypass).
   * Native audio does NOT need proxying — it plays direct URLs.
   */
  private getProxiedUrl(streamUrl: string): string {
    if (Capacitor.getPlatform() === 'android') {
      const apiBase = window.__API_URL__ ?? BLAKE_CONFIG.apiEndpoint;
      return `${apiBase}/api/radio/stream?url=${encodeURIComponent(streamUrl)}`;
    }
    return streamUrl;
  }

  /**
   * Apply proxy to an array of stream URLs (Android HTML5 only)
   */
  private getProxiedUrls(urls: string[]): string[] {
    return urls.map((url) => this.getProxiedUrl(url));
  }

  /**
   * Play a radio station (uses native or HTML5 based on platform)
   */
  public async play(station: RadioStation): Promise<void> {
    await this.ensureInitialized();

    try {
      // Stop current playback if any
      await this.stop();

      // Reset error state
      this.lastError = null;

      // Update current station
      this.currentStation = station;
      this.notifyStatusChange();

      // Build URL lists
      const directUrls = [station.streamUrl, ...(station.fallbackUrls ?? [])];

      // Use appropriate playback method
      if (this.isNativeMode && NativeAudio) {
        // Native audio uses DIRECT URLs (no proxy needed — not WebView)
        await this.playNativeWithUrls(station, directUrls);
      } else {
        // HTML5 on Android needs proxied URLs; on web, direct is fine
        const proxiedUrls = this.getProxiedUrls(directUrls);
        await this.playHTML5Fallback(station, proxiedUrls);
      }

    } catch (error) {
      logger.error('[AudioStream] Failed to play radio:', error);

      const errorMsg = getErrorMessage(error);
      const errorName = error instanceof Error ? error.name : '';
      let errorMessage = 'Failed to start playback';

      if (errorName === 'NotAllowedError') {
        errorMessage = 'Playback blocked. Please interact with the page first.';
      } else if (errorName === 'NotSupportedError') {
        errorMessage = 'Stream format not supported.';
      } else if (errorMsg) {
        errorMessage = errorMsg;
      }

      this.lastError = errorMessage;
      this._isPlaying = false;
      this.notifyStatusChange();

      throw new Error(errorMessage);
    }
  }

  /**
   * Play using @mediagrid/capacitor-native-audio with direct (non-proxied) URLs.
   * Uses create → initialize → play pattern per the plugin API.
   */
  private async playNativeWithUrls(station: RadioStation, urlsToTry: string[]): Promise<void> {
    if (!NativeAudio) {
      throw new Error('Native audio not available');
    }

    if (urlsToTry.length === 0) {
      throw new Error('No stream URLs available for this station.');
    }

    for (let i = 0; i < urlsToTry.length; i++) {
      const url = urlsToTry[i]!;
      try {
        // Destroy previous audio source if it exists
        if (this.nativeCreated) {
          try {
            await NativeAudio.destroy({ audioId: RADIO_AUDIO_ID });
          } catch {
            // Ignore destroy errors on stale sources
          }
          this.nativeCreated = false;
        }

        // Create audio source using @mediagrid API
        await NativeAudio.create({
          audioId: RADIO_AUDIO_ID,
          audioSource: url,
          friendlyTitle: station.name,
          useForNotification: true,
          isBackgroundMusic: false,
          loop: false,
        });
        this.nativeCreated = true;

        // Initialize (buffer/prepare)
        await NativeAudio.initialize({ audioId: RADIO_AUDIO_ID });

        // Play
        await NativeAudio.play({ audioId: RADIO_AUDIO_ID });

        this._isPlaying = true;
        this.notifyStatusChange();
        return;
      } catch (error) {
        logger.error(`[AudioStream] Native fail ${i + 1}: ${getErrorMessage(error)}`);

        // Cleanup failed source
        if (this.nativeCreated) {
          try {
            await NativeAudio.destroy({ audioId: RADIO_AUDIO_ID });
          } catch {
            // Ignore cleanup errors
          }
          this.nativeCreated = false;
        }

        // Retry delay before next URL
        if (i < urlsToTry.length - 1) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }

    // All native URLs failed — fallback to HTML5 with proxied URLs
    logger.warn('[AudioStream] All native URLs failed, trying HTML5 fallback');
    const proxiedUrls = this.getProxiedUrls(urlsToTry);
    await this.playHTML5Fallback(station, proxiedUrls);
  }

  private async playHTML5Fallback(_station: RadioStation, urlsToTry: string[]): Promise<void> {
    if (!this.audio) {
      this.audio = new Audio();
      this.audio.preload = 'auto';
      this.audio.crossOrigin = 'anonymous';
      this.setupListeners();
    }

    let lastError: Error | null = null;

    for (let i = 0; i < urlsToTry.length; i++) {
      const url = urlsToTry[i]!;
      try {
        this.audio.src = url;
        this.audio.load();

        await this.audio.play();

        this._isPlaying = true;
        this.notifyStatusChange();
        return;
      } catch (error) {
        const audioError = this.audio?.error;
        let errorMessage = 'Failed to play radio station';

        if (audioError) {
          switch (audioError.code) {
            case audioError.MEDIA_ERR_ABORTED:
              errorMessage = 'Playback aborted. Please try again.';
              break;
            case audioError.MEDIA_ERR_NETWORK:
              errorMessage = 'Network error. Check your internet connection.';
              break;
            case audioError.MEDIA_ERR_DECODE:
              errorMessage = 'Stream format not supported. Try another station.';
              break;
            case audioError.MEDIA_ERR_SRC_NOT_SUPPORTED:
              errorMessage = 'Stream not available. Station may be offline.';
              break;
            default:
              errorMessage = audioError.message ?? 'Unknown error occurred';
          }
        }

        this.lastError = errorMessage;
        this._isPlaying = false;
        this.notifyStatusChange();

        logger.error('[AudioStream] HTML5 Audio error:', errorMessage, audioError);
        lastError = error instanceof Error ? error : new Error(String(error));

        // Try next URL
        if (i < urlsToTry.length - 1) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }
    }

    throw lastError ?? new Error('All streams failed - check internet and try later.');
  }

  /**
   * Stop playback (hybrid)
   */
  public async stop(): Promise<void> {
    try {
      if (this.isNativeMode && NativeAudio && this.nativeCreated) {
        await NativeAudio.stop({ audioId: RADIO_AUDIO_ID });
        await NativeAudio.destroy({ audioId: RADIO_AUDIO_ID });
        this.nativeCreated = false;
      } else if (this.audio) {
        this.audio.pause();
        this.audio.src = '';
      }

      this.currentStation = null;
      this._isPlaying = false;
      this.lastError = null;
      this.notifyStatusChange();
    } catch (error) {
      logger.error('[AudioStream] Stop failed:', error);
      this.currentStation = null;
      this._isPlaying = false;
      this.nativeCreated = false;
      this.notifyStatusChange();
    }
  }

  /**
   * Pause playback (hybrid)
   */
  public async pause(): Promise<void> {
    try {
      if (this.isNativeMode && NativeAudio && this.nativeCreated) {
        await NativeAudio.pause({ audioId: RADIO_AUDIO_ID });
      } else if (this.audio) {
        this.audio.pause();
      }
      this._isPlaying = false;
      this.notifyStatusChange();
    } catch (error) {
      logger.error('[AudioStream] Pause failed:', error);
    }
  }

  /**
   * Resume playback (hybrid)
   */
  public async resume(): Promise<void> {
    try {
      if (this.isNativeMode && NativeAudio && this.nativeCreated) {
        await NativeAudio.play({ audioId: RADIO_AUDIO_ID });
      } else if (this.audio) {
        await this.audio.play();
      }
      this._isPlaying = true;
      this.notifyStatusChange();
    } catch (error) {
      logger.error('[AudioStream] Resume failed:', error);
      this.lastError = 'Failed to resume playback';
      this._isPlaying = false;
      this.notifyStatusChange();
      throw error;
    }
  }

  /**
   * Set volume (0.0 to 1.0) (hybrid)
   */
  public async setVolume(volume: number): Promise<void> {
    const normalizedVolume = Math.max(0, Math.min(1, volume));

    try {
      if (this.isNativeMode && NativeAudio && this.nativeCreated) {
        await NativeAudio.setVolume({
          audioId: RADIO_AUDIO_ID,
          volume: normalizedVolume,
        });
      } else if (this.audio) {
        this.audio.volume = normalizedVolume;
      }
    } catch (error) {
      logger.error('[AudioStream] Set volume failed:', error);
    }
  }

  /**
   * Get volume
   */
  public getVolume(): number {
    if (this.audio) {
      return this.audio.volume;
    }
    return 1.0;
  }

  /**
   * Is playing?
   */
  public isPlaying(): boolean {
    return this._isPlaying;
  }

  /**
   * Get current station
   */
  public getCurrentStation(): RadioStation | null {
    return this.currentStation;
  }

  /**
   * Get last error
   */
  public getError(): string | null {
    return this.lastError;
  }

  /**
   * Is using native audio?
   */
  public isNative(): boolean {
    return this.isNativeMode;
  }

  /**
   * Cleanup
   */
  public async destroy(): Promise<void> {
    await this.stop();
    this.statusCallback = null;

    if (this.audio) {
      this.audio.src = '';
      this.audio = null;
    }
  }
}

// Export singleton instance
export const audioStream = new AudioStreamService();
