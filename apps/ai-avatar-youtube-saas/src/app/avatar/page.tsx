"use client";

import React, { useState } from "react";
import { AvatarPlayer } from "@/components/avatar/AvatarPlayer";

export default function AvatarPage() {
  const [modelUrl, setModelUrl] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [riveUrl, setRiveUrl] = useState("");

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Interactive Avatar Preview</h1>
      <p className="text-muted-foreground">
        Preview a Ready Player Me 3D avatar with WebAudio lip-sync, or fall back
        to a GPU-accelerated Rive 2D vector mouth.
      </p>

      <div className="space-y-3">
        <input
          type="url"
          placeholder="Ready Player Me .glb URL (morphTargets=ARKit appended automatically)"
          value={modelUrl}
          onChange={(e) => setModelUrl(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2"
        />
        <input
          type="url"
          placeholder="Audio URL"
          value={audioUrl}
          onChange={(e) => setAudioUrl(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2"
        />
        <input
          type="url"
          placeholder="Rive .riv fallback URL (optional)"
          value={riveUrl}
          onChange={(e) => setRiveUrl(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2"
        />
      </div>

      {modelUrl && audioUrl && (
        <AvatarPlayer modelUrl={modelUrl} audioUrl={audioUrl} riveUrl={riveUrl || undefined} />
      )}

      <div className="rounded-md border border-border p-4 text-sm text-muted-foreground">
        <p className="font-medium">How it works</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>WebAudio AnalyserNode runs FFT with 256 bins at 60 FPS.</li>
          <li>Low frequencies (85–150 Hz) drive O/U visemes.</li>
          <li>Mid frequencies (150–200 Hz) drive the A viseme.</li>
          <li>High frequencies (200–255 Hz) drive E/I visemes.</li>
          <li>Linear interpolation smooths weights to eliminate jitter.</li>
          <li>If WebGL context is lost, the player automatically falls back to 2D Rive.</li>
        </ul>
      </div>
    </div>
  );
}
