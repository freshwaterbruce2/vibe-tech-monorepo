/**
 * Sound Effects System using Web Audio API
 * Provides toggleable sound effects for various game events
 */

class SoundEffectsManager {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.3;

  constructor() {
    // Load sound preference from localStorage
    const savedEnabled = localStorage.getItem("soundEnabled");
    this.enabled = savedEnabled !== 'false';

    const savedVolume = localStorage.getItem("soundVolume");
    if (savedVolume) {
      this.volume = parseFloat(savedVolume);
    }
  }

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  /**
   * Play a success sound (quest completion, achievement unlock)
   */
  playSuccess() {
    if (!this.enabled) return;

    const ctx = this.getAudioContext();
    const now = ctx.currentTime;

    // Create oscillator for a pleasant ascending tone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Ascending notes: C5 -> E5 -> G5
    osc.frequency.setValueAtTime(523.25, now);
    osc.frequency.setValueAtTime(659.25, now + 0.1);
    osc.frequency.setValueAtTime(783.99, now + 0.2);

    osc.type = 'sine';

    // Envelope
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(this.volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  /**
   * Play a coin sound (earning coins)
   */
  playCoin() {
    if (!this.enabled) return;

    const ctx = this.getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Quick high-pitched blip
    osc.frequency.setValueAtTime(1000, now);
    osc.frequency.exponentialRampToValueAtTime(1500, now + 0.05);

    osc.type = 'square';

    gain.gain.setValueAtTime(this.volume * 0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  /**
   * Play a purchase sound (spending coins)
   */
  playPurchase() {
    if (!this.enabled) return;

    const ctx = this.getAudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    // Descending tone
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.15);

    osc.type = 'triangle';

    gain.gain.setValueAtTime(this.volume * 0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  /**
   * Play an achievement unlock sound (special celebration)
   */
  playAchievement() {
    if (!this.enabled) return;

    const ctx = this.getAudioContext();
    const now = ctx.currentTime;

    // Create a fanfare with multiple oscillators
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      const delay = i * 0.1;
      const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5

      osc.frequency.setValueAtTime(frequencies[i]!, now + delay);
      osc.type = 'sine';

      gain.gain.setValueAtTime(0, now + delay);
      gain.gain.linearRampToValueAtTime(this.volume * 0.4, now + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.5);

      osc.start(now + delay);
      osc.stop(now + delay + 0.5);
    }
  }

  /**
   * Play a level up sound
   */
  playLevelUp() {
    if (!this.enabled) return;

    const ctx = this.getAudioContext();
    const now = ctx.currentTime;

    // Ascending arpeggio
    const notes = [261.63, 329.63, 392.0, 523.25]; // C4, E4, G4, C5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      const delay = i * 0.08;
      osc.frequency.setValueAtTime(freq, now + delay);
      osc.type = 'sine';

      gain.gain.setValueAtTime(this.volume * 0.5, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.3);

      osc.start(now + delay);
      osc.stop(now + delay + 0.3);
    });
  }

  /**
   * Toggle sound effects on/off
   */
  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem("soundEnabled", String(this.enabled));
    return this.enabled;
  }

  /**
   * Set volume (0.0 to 1.0)
   */
  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem("soundVolume", String(this.volume));
  }

  /**
   * Get current enabled state
   */
  isEnabled() {
    return this.enabled;
  }

  /**
   * Get current volume
   */
  getVolume() {
    return this.volume;
  }
}

// Export singleton instance
export const soundEffects = new SoundEffectsManager();
