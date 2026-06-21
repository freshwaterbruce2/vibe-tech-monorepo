"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";

export interface WordCoordinate {
  word: string;
  start: number;
  end: number;
  confidence?: number;
}

export interface ReadyPlayerMeAvatarProps {
  modelUrl: string;
  audioSrc?: string;
  subtitles?: WordCoordinate[];
  isRealTime?: boolean;
  onRenderCrash?: () => void;
}

// Map of spoken phonemes/words to Oculus viseme target parameters
const VISEME_MAPPING: Record<string, string> = {
  a: "viseme_aa",
  e: "viseme_E",
  i: "viseme_I",
  o: "viseme_O",
  u: "viseme_U",
  p: "viseme_PP",
  b: "viseme_PP",
  m: "viseme_PP",
  f: "viseme_FF",
  v: "viseme_FF",
  t: "viseme_DD",
  d: "viseme_DD",
  s: "viseme_SS",
  z: "viseme_SS",
  c: "viseme_CH",
  j: "viseme_CH",
  th: "viseme_TH",
};

/**
 * Custom hook to safely rewrite Ready Player Me GLB URLs to force morph target generation.
 */
function useSecureModelUrl(modelUrl: string): string {
  return useMemo(() => {
    if (!modelUrl) return "";
    try {
      const url = new URL(modelUrl);
      if (!url.searchParams.has("morphTargets")) {
        url.searchParams.set("morphTargets", "Oculus Visemes,mouthSmile,eyeBlinkLeft,eyeBlinkRight");
      }
      return url.toString();
    } catch {
      if (modelUrl.includes("readyplayer.me") && !modelUrl.includes("?")) {
        return `${modelUrl}?morphTargets=Oculus%20Visemes,mouthSmile,eyeBlinkLeft,eyeBlinkRight`;
      }
      return modelUrl;
    }
  }, [modelUrl]);
}

/**
 * Internal Model component that handles glTF loading, blendshape bindings,
 * and frames-driven mouth/eye movements.
 */
interface ModelProps {
  url: string;
  lipSyncValue: { viseme: string; intensity: number };
  mouthOpenScalar: number;
}

function AvatarModel({ url, lipSyncValue, mouthOpenScalar }: ModelProps) {
  // Use useGLTF from drei to stream model and automatically cache assets
  const { scene } = useGLTF(url);
  const headMeshRef = useRef<THREE.SkinnedMesh | null>(null);

  // Parse and extract the head SkinnedMesh containing Oculus morph targets
  useEffect(() => {
    scene.traverse((child) => {
      if (
        child instanceof THREE.SkinnedMesh &&
        child.morphTargetDictionary &&
        child.morphTargetInfluences
      ) {
        // Ready Player Me structures morphs on the mesh containing "Wolf3D_Head" or "Wolf3D_Avatar"
        if (child.name.includes("Head") || child.name.includes("Avatar")) {
          headMeshRef.current = child;
        }
      }
    });
  }, [scene]);

  // Procedural Eye Blinking parameters
  const blinkStateRef = useRef({
    isBlinking: false,
    timer: 0,
    nextBlinkInterval: Math.random() * 3 + 2, // Blink every 2 to 5 seconds
  });

  useFrame((state, delta) => {
    const mesh = headMeshRef.current;
    if (!mesh || !mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return;

    const dict = mesh.morphTargetDictionary;
    const influences = mesh.morphTargetInfluences;

    // Reset all viseme influences to 0 smoothly before applying new states
    Object.keys(dict).forEach((key) => {
      if (key.startsWith("viseme_")) {
        const index = dict[key];
        if (index !== undefined) {
          influences[index] = THREE.MathUtils.lerp(influences[index] ?? 0, 0, 15 * delta);
        }
      }
    });

    // 1. Process viseme mouth morph targets
    const visemeIndex = lipSyncValue.viseme ? dict[lipSyncValue.viseme] : undefined;
    if (visemeIndex !== undefined) {
      // Normalize values to 0.0 - 1.0 to prevent glTFast mesh distortion
      const normalizedIntensity = THREE.MathUtils.clamp(lipSyncValue.intensity, 0.0, 1.0);
      influences[visemeIndex] = THREE.MathUtils.lerp(
        influences[visemeIndex] ?? 0,
        normalizedIntensity,
        25 * delta // High frequency smoothing to prevent mouth jitter
      );
    }

    // 2. Process general jaw open scalar override
    const jawIndex = dict["jawOpen"];
    if (jawIndex !== undefined) {
      const targetJawOpen = THREE.MathUtils.clamp(mouthOpenScalar, 0.0, 1.0);
      influences[jawIndex] = THREE.MathUtils.lerp(influences[jawIndex] ?? 0, targetJawOpen, 20 * delta);
    }

    // 3. Procedural Eye Blinking Coroutine
    const blink = blinkStateRef.current;
    blink.timer += delta;

    if (!blink.isBlinking && blink.timer >= blink.nextBlinkInterval) {
      blink.isBlinking = true;
      blink.timer = 0;
    }

    const blinkLeftIndex = dict["eyeBlinkLeft"];
    const blinkRightIndex = dict["eyeBlinkRight"];

    if (blink.isBlinking) {
      // Complete blink cycle takes 150ms
      const progress = blink.timer / 0.15;
      if (progress >= 1.0) {
        blink.isBlinking = false;
        blink.timer = 0;
        blink.nextBlinkInterval = Math.random() * 4 + 2.5; // Reset interval
        if (blinkLeftIndex !== undefined) influences[blinkLeftIndex] = 0;
        if (blinkRightIndex !== undefined) influences[blinkRightIndex] = 0;
      } else {
        // Bell curve weight mapping (sinusoidal blink path)
        const weight = Math.sin(progress * Math.PI);
        if (blinkLeftIndex !== undefined) influences[blinkLeftIndex] = weight;
        if (blinkRightIndex !== undefined) influences[blinkRightIndex] = weight;
      }
    } else {
      if (blinkLeftIndex !== undefined) influences[blinkLeftIndex] = 0;
      if (blinkRightIndex !== undefined) influences[blinkRightIndex] = 0;
    }
  });

  return <primitive object={scene} />;
}

export function ReadyPlayerMeAvatar({
  modelUrl,
  audioSrc,
  subtitles = [],
  isRealTime = false,
  onRenderCrash,
}: ReadyPlayerMeAvatarProps) {
  const secureUrl = useSecureModelUrl(modelUrl);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Dynamic animation inputs updated via WebAudio or Whisper schedules
  const [lipSyncState, setLipSyncState] = useState({ viseme: "viseme_sil", intensity: 0.0 });
  const [mouthOpen, setMouthOpen] = useState(0.0);

  // WebAudio API nodes stored in ref to prevent multiple initialization contexts
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // 1. WebGL Context Loss Recovery
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      console.warn("GPU Memory limit reached. WebGL Context Lost!");
      if (onRenderCrash) onRenderCrash();
    };

    canvas.addEventListener("webglcontextlost", handleContextLost);
    return () => {
      canvas.removeEventListener("webglcontextlost", handleContextLost);
    };
  }, [onRenderCrash]);

  // 2. Real-Time WebAudio FFT Microphone Lip-Sync Pipeline
  useEffect(() => {
    if (!isRealTime) {
      // Clean up real-time audio streams if toggled off
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      return;
    }

    const initRealTimeSync = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = stream;

        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioContextClass();
        audioContextRef.current = ctx;

        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256; // Low size to prioritize processing speeds over detail
        source.connect(analyser);
        analyserRef.current = analyser;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const analyzeFrame = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);

          // Standard human speech range frequency spectrum split (85Hz - 255Hz)
          let lowFreq = 0; // O, U
          let midFreq = 0; // A
          let highFreq = 0; // E, I
          let overallEnergy = 0;

          for (let i = 0; i < bufferLength; i++) {
            const value = dataArray[i] ?? 0;
            overallEnergy += value;
            if (i < bufferLength * 0.3) lowFreq += value;
            else if (i < bufferLength * 0.6) midFreq += value;
            else highFreq += value;
          }

          const avgLow = lowFreq / (bufferLength * 0.3);
          const avgMid = midFreq / (bufferLength * 0.3);
          const avgHigh = highFreq / (bufferLength * 0.4);
          const maxEnergy = overallEnergy / bufferLength;

          // Process and map average levels to mouth movements
          if (maxEnergy > 10) {
            // Speech activation threshold
            setMouthOpen(maxEnergy / 255.0); // Normalize jaw open depth

            // Classify frequencies to target specific Oculus visemes
            if (avgLow > avgMid && avgLow > avgHigh) {
              setLipSyncState({ viseme: "viseme_O", intensity: avgLow / 255.0 });
            } else if (avgMid > avgLow && avgMid > avgHigh) {
              setLipSyncState({ viseme: "viseme_aa", intensity: avgMid / 255.0 });
            } else {
              setLipSyncState({ viseme: "viseme_E", intensity: avgHigh / 255.0 });
            }
          } else {
            // Absolute silence
            setMouthOpen(0);
            setLipSyncState({ viseme: "viseme_sil", intensity: 0 });
          }

          rafIdRef.current = requestAnimationFrame(analyzeFrame);
        };

        analyzeFrame();
      } catch (err) {
        console.error("Failed to capture native microphone stream for Real-Time WebGL lip sync:", err);
      }
    };

    initRealTimeSync();

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isRealTime]);

  // 3. Offline Subtitle Timeline Lip-Sync Pipeline
  useEffect(() => {
    if (isRealTime || !audioSrc || subtitles.length === 0) return;

    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const time = audio.currentTime;
      // Fetch the active word at current timestamp
      const activeWord = subtitles.find((w) => time >= w.start && time <= w.end);

      if (activeWord) {
        const cleanWord = activeWord.word.toLowerCase().replace(/[^a-z]/g, "");
        const firstLetter = cleanWord.charAt(0);

        // Map character to viseme target or fallback to a standard aa vowel
        const visemeTarget = VISEME_MAPPING[firstLetter] || "viseme_aa";

        setMouthOpen(0.65); // Apply constant average jaw opening during spoken words
        setLipSyncState({ viseme: visemeTarget, intensity: 0.8 });
      } else {
        // Audio is playing but no word is currently mapped (pause/breath)
        setMouthOpen(0.0);
        setLipSyncState({ viseme: "viseme_sil", intensity: 0.0 });
      }
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [isRealTime, audioSrc, subtitles]);

  return (
    <div className="relative w-full h-full bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* 3D WebGL Canvas Layer */}
      <Canvas
        ref={canvasRef}
        camera={{ position: [0, 1.45, 0.55], fov: 40 }}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        <ambientLight intensity={1.5} />
        <directionalLight position={[2, 2, 2]} intensity={2.0} />
        <pointLight position={[-1, 2, -1]} intensity={0.5} />
        {secureUrl && (
          <AvatarModel
            url={secureUrl}
            lipSyncValue={lipSyncState}
            mouthOpenScalar={mouthOpen}
          />
        )}
      </Canvas>

      {/* Hidden Audio Player for Synchronization */}
      {!isRealTime && audioSrc && (
        <audio
          ref={audioRef}
          src={audioSrc}
          controls
          className="absolute bottom-4 left-4 right-4 z-10 w-[calc(100%-2rem)] opacity-90 filter drop-shadow"
        />
      )}

      {/* Real-time Indicator Overlay */}
      {isRealTime && (
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-slate-950/80 backdrop-blur border border-cyan-500/50 px-3 py-1.5 rounded-full z-10">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[10px] font-bold text-cyan-400 font-mono tracking-wider uppercase">
            Live Lip-Sync Active
          </span>
        </div>
      )}
    </div>
  );
}
