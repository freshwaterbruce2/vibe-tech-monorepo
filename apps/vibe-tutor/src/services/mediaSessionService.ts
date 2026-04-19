/**
 * Media Session Service - Provides lock screen and notification controls
 * Implements 2025 PWA best practices for audio playback
 *
 * Features:
 * - Lock screen controls (iOS 15+, Android)
 * - Notification tray playback controls
 * - Desktop media key support (Chrome/Edge/Firefox)
 * - Album art display in system UI
 *
 * Browser Support:
 * - Chrome/Edge 73+ (Android, Desktop, ChromeOS)
 * - Safari 15+ (iOS 15+, macOS)
 * - Firefox 82+ (Desktop, Android)
 */

import type { LocalTrack } from '../types';
import { logger } from '../utils/logger';

class MediaSessionService {
  private isSupported: boolean;
  private lastPositionUpdate = 0;

  constructor() {
    this.isSupported = 'mediaSession' in navigator;

    if (this.isSupported) {
    } else {
      logger.warn('⚠️ Media Session API not supported on this browser');
    }
  }

  /**
   * Update media session metadata (track info, album art)
   */
  public updateMetadata(track: LocalTrack): void {
    if (!this.isSupported) return;

    try {
      // Create metadata with track information
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.name ?? 'Unknown Track',
        artist: track.metadata?.artist ?? 'Unknown Artist',
        album: track.metadata?.album ?? 'Vibe-Tutor Music',
        artwork: [
          // Multiple sizes for different devices
          {
            src: track.albumArt ?? '/vite.svg', // Fallback to app icon
            sizes: '96x96',
            type: 'image/png'
          },
          {
            src: track.albumArt ?? '/vite.svg',
            sizes: '128x128',
            type: 'image/png'
          },
          {
            src: track.albumArt ?? '/vite.svg',
            sizes: '256x256',
            type: 'image/png'
          },
          {
            src: track.albumArt ?? '/vite.svg',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      });

    } catch (error) {
      logger.error('❌ Failed to update Media Session metadata:', error);
    }
  }

  /**
   * Register action handlers for media controls
   *
   * Supported actions:
   * - play, pause: Basic playback
   * - nexttrack, previoustrack: Skip tracks
   * - seekto: Scrub to specific time
   * - seekforward, seekbackward: Skip ±10 seconds
   */
  public registerActionHandlers(handlers: {
    play?: () => Promise<void> | void;
    pause?: () => void;
    nexttrack?: () => Promise<void> | void;
    previoustrack?: () => Promise<void> | void;
    seekto?: (details: MediaSessionActionDetails) => void;
    seekbackward?: () => void;
    seekforward?: () => void;
  }): void {
    if (!this.isSupported) return;

    try {
      // Basic playback controls
      if (handlers.play) {
        navigator.mediaSession.setActionHandler('play', () => {
          void handlers.play?.();
        });
      }

      if (handlers.pause) {
        navigator.mediaSession.setActionHandler('pause', handlers.pause);
      }

      // Track navigation
      if (handlers.nexttrack) {
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          void handlers.nexttrack?.();
        });
      }

      if (handlers.previoustrack) {
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          void handlers.previoustrack?.();
        });
      }

      // Seek controls
      if (handlers.seekto) {
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          handlers.seekto?.(details);
        });
      }

      if (handlers.seekbackward) {
        navigator.mediaSession.setActionHandler('seekbackward', handlers.seekbackward);
      }

      if (handlers.seekforward) {
        navigator.mediaSession.setActionHandler('seekforward', handlers.seekforward);
      }

    } catch (error) {
      logger.error('❌ Failed to register Media Session handlers:', error);
    }
  }

  /**
   * Update playback state (playing, paused, none)
   *
   * States:
   * - 'playing': Track is currently playing
   * - 'paused': Track is paused
   * - 'none': No active playback
   */
  public updatePlaybackState(state: 'none' | 'paused' | 'playing'): void {
    if (!this.isSupported) return;

    try {
      navigator.mediaSession.playbackState = state;
    } catch (error) {
      logger.error('❌ Failed to update Media Session playback state:', error);
    }
  }

  /**
   * Update position state (for progress bar in lock screen/notification)
   *
   * @param position Current playback position in seconds
   * @param duration Total track duration in seconds
   * @param playbackRate Current playback speed (1.0 = normal)
   */
  public updatePositionState(position: number, duration: number, playbackRate = 1.0): void {
    if (!this.isSupported) return;

    // Check if setPositionState is supported (iOS 15.4+, Chrome 81+)
    if (!('setPositionState' in navigator.mediaSession)) {
      return;
    }

    try {
      // Validate inputs
      if (isNaN(position) || isNaN(duration) || duration <= 0) {
        return;
      }

      navigator.mediaSession.setPositionState({
        duration: Math.max(0, duration),
        playbackRate: Math.max(0.5, Math.min(2.0, playbackRate)),
        position: Math.max(0, Math.min(position, duration))
      });

      // Only log occasionally (every 5 seconds) to avoid spam
      const now = Date.now();
      if (now - this.lastPositionUpdate > 5000) {
        this.lastPositionUpdate = now;
      }
    } catch {
      // Silently fail - position updates are not critical
    }
  }

  /**
   * Clear media session (call when stopping playback or app closes)
   */
  public clear(): void {
    if (!this.isSupported) return;

    try {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
    } catch (error) {
      logger.error('❌ Failed to clear Media Session:', error);
    }
  }

  /**
   * Check if Media Session API is supported
   */
  public get supported(): boolean {
    return this.isSupported;
  }
}

// Export singleton instance
export const mediaSession = new MediaSessionService();
