import { useCallback, useEffect, useRef, useState } from "react";

export interface VisemeWeights {
  viseme_O: number;
  viseme_U: number;
  viseme_aa: number;
  viseme_E: number;
}

const FFT_SIZE = 256;
const SMOOTHING = 0.15;

function emptyWeights(): VisemeWeights {
  return { viseme_O: 0, viseme_U: 0, viseme_aa: 0, viseme_E: 0 };
}

function frequencyToBin(frequency: number, sampleRate: number): number {
  return Math.round((frequency * FFT_SIZE) / sampleRate);
}

function averageMagnitude(data: Uint8Array, startBin: number, endBin: number): number {
  let sum = 0;
  let count = 0;
  for (let i = Math.max(0, startBin); i <= Math.min(data.length - 1, endBin); i++) {
    sum += data[i] ?? 0;
    count++;
  }
  return count === 0 ? 0 : sum / count / 255;
}

function computeTargetWeights(data: Uint8Array, sampleRate: number): VisemeWeights {
  const lowStart = frequencyToBin(85, sampleRate);
  const lowEnd = frequencyToBin(150, sampleRate);
  const midStart = frequencyToBin(150, sampleRate);
  const midEnd = frequencyToBin(200, sampleRate);
  const highStart = frequencyToBin(200, sampleRate);
  const highEnd = frequencyToBin(255, sampleRate);

  const low = averageMagnitude(data, lowStart, lowEnd);
  const mid = averageMagnitude(data, midStart, midEnd);
  const high = averageMagnitude(data, highStart, highEnd);

  return {
    viseme_O: low,
    viseme_U: low * 0.7,
    viseme_aa: mid,
    viseme_E: high,
  };
}

function smoothWeights(current: VisemeWeights, target: VisemeWeights): VisemeWeights {
  const next = { ...current };
  (Object.keys(target) as Array<keyof VisemeWeights>).forEach((key) => {
    next[key] += (target[key] - next[key]) * SMOOTHING;
  });
  return next;
}

type AudioContextClass = typeof AudioContext;

function getAudioContextClass(): AudioContextClass | undefined {
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: AudioContextClass }).webkitAudioContext
  );
}

type AudioGraphResult =
  | { ok: true; ctx: AudioContext; analyser: AnalyserNode; source: MediaElementAudioSourceNode }
  | { ok: false; error: string };

function createAudioGraph(audio: HTMLAudioElement): AudioGraphResult {
  const AudioContextClass = getAudioContextClass();
  if (!AudioContextClass) {
    return { ok: false, error: "WebAudio is not supported" };
  }

  const ctx = new AudioContextClass();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = FFT_SIZE;

  try {
    const source = ctx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(ctx.destination);
    return { ok: true, ctx, analyser, source };
  } catch (err) {
    void ctx.close();
    return { ok: false, error: (err as Error).message };
  }
}

function resetAnimationFrame(rafRef: React.MutableRefObject<number | null>) {
  if (rafRef.current !== null) {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }
}

function setupAudioListeners(
  audio: HTMLAudioElement,
  ctx: AudioContext,
  updateWeights: () => void,
  rafRef: React.MutableRefObject<number | null>,
  setIsPlaying: (playing: boolean) => void,
  setWeights: (w: VisemeWeights) => void,
  weightsRef: React.MutableRefObject<VisemeWeights>
) {
  const handlePlay = () => {
    setIsPlaying(true);
    if (ctx.state === "suspended") {
      void ctx.resume();
    }
    rafRef.current ??= requestAnimationFrame(updateWeights);
  };

  const handlePause = () => {
    setIsPlaying(false);
    resetAnimationFrame(rafRef);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    weightsRef.current = emptyWeights();
    setWeights(emptyWeights());
    resetAnimationFrame(rafRef);
  };

  audio.addEventListener("play", handlePlay);
  audio.addEventListener("pause", handlePause);
  audio.addEventListener("ended", handleEnded);

  return () => {
    audio.removeEventListener("play", handlePlay);
    audio.removeEventListener("pause", handlePause);
    audio.removeEventListener("ended", handleEnded);
  };
}

function processAudioFrame(
  analyser: AnalyserNode,
  audioContext: AudioContext | null,
  currentWeights: VisemeWeights
): VisemeWeights {
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);
  const sampleRate = audioContext?.sampleRate ?? 48000;
  const target = computeTargetWeights(data, sampleRate);
  return smoothWeights(currentWeights, target);
}

function cleanupAudioGraph(
  ctx: AudioContext,
  analyser: AnalyserNode,
  source: MediaElementAudioSourceNode,
  audioContextRef: React.MutableRefObject<AudioContext | null>,
  analyserRef: React.MutableRefObject<AnalyserNode | null>,
  sourceRef: React.MutableRefObject<MediaElementAudioSourceNode | null>,
  rafRef: React.MutableRefObject<number | null>,
  cleanupListeners: () => void
) {
  cleanupListeners();
  resetAnimationFrame(rafRef);
  source.disconnect();
  analyser.disconnect();
  void ctx.close();
  audioContextRef.current = null;
  analyserRef.current = null;
  sourceRef.current = null;
}

function setupAudioGraph(
  audio: HTMLAudioElement,
  audioContextRef: React.MutableRefObject<AudioContext | null>,
  analyserRef: React.MutableRefObject<AnalyserNode | null>,
  sourceRef: React.MutableRefObject<MediaElementAudioSourceNode | null>,
  setError: (e: string | null) => void
): { ctx: AudioContext; analyser: AnalyserNode; source: MediaElementAudioSourceNode } | null {
  const graph = createAudioGraph(audio);
  if (!graph.ok) {
    setError(graph.error);
    return null;
  }

  const { ctx, analyser, source } = graph;
  audioContextRef.current = ctx;
  analyserRef.current = analyser;
  sourceRef.current = source;
  return graph;
}

export function useLipSync(audioRef: React.RefObject<HTMLAudioElement | null>) {
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const weightsRef = useRef<VisemeWeights>(emptyWeights());
  const rafRef = useRef<number | null>(null);
  const [weights, setWeights] = useState<VisemeWeights>(emptyWeights());
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateWeights = useCallback(() => {
    if (!analyserRef.current) return;
    const next = processAudioFrame(
      analyserRef.current,
      audioContextRef.current,
      weightsRef.current
    );
    weightsRef.current = next;
    setWeights(next);
    rafRef.current = requestAnimationFrame(updateWeights);
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const graph = setupAudioGraph(audio, audioContextRef, analyserRef, sourceRef, setError);
    if (!graph) return;

    const cleanupListeners = setupAudioListeners(
      audio,
      graph.ctx,
      updateWeights,
      rafRef,
      setIsPlaying,
      setWeights,
      weightsRef
    );

    return () => {
      cleanupAudioGraph(
        graph.ctx,
        graph.analyser,
        graph.source,
        audioContextRef,
        analyserRef,
        sourceRef,
        rafRef,
        cleanupListeners
      );
    };
  }, [audioRef, updateWeights]);

  return { weights, isPlaying, error };
}
