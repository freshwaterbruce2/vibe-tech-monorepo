/* ---------- Music Notes Game — Web Audio API Sounds ---------- */

const FREQ_MAP: Record<string, number> = {
  C: 261.63, 'C#': 277.18, Db: 277.18,
  D: 293.66, 'D#': 311.13, Eb: 311.13,
  E: 329.63,
  F: 349.23, 'F#': 369.99, Gb: 369.99,
  G: 392.0, 'G#': 415.3, Ab: 415.3,
  A: 440.0, 'A#': 466.16, Bb: 466.16,
  B: 493.88,
};

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  audioCtx ??= new AudioContext();
  return audioCtx;
}

/** Play a musical tone for the given note label. */
export function playTone(label: string, duration = 0.35): void {
  try {
    const ctx = getCtx();
    const freq = FREQ_MAP[label];
    if (!freq) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    /* silent fail on unsupported */
  }
}

/** Rising two-note chime for correct answers. */
export function playCorrect(): void {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    /* */
  }
}

/** Low buzz for wrong answers. */
export function playWrong(): void {
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 180;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {
    /* */
  }
}
