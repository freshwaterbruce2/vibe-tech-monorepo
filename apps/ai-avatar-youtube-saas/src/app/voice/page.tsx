"use client";

import React, { useState } from "react";
import { synthesizeVoicePreview } from "@/app/actions/voice";

export default function VoicePage() {
  const [voiceId, setVoiceId] = useState("");
  const [text, setText] = useState(
    "Welcome to VibeTech. Today we're turning ideas into studio-grade videos in seconds.",
  );
  const [model, setModel] = useState<"eleven_flash_v2_5" | "eleven_multilingual_v2">(
    "eleven_flash_v2_5",
  );
  const [speed, setSpeed] = useState(1.0);
  const [sampleRate, setSampleRate] = useState<16000 | 24000>(24000);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handlePreview() {
    setLoading(true);
    try {
      const { audioBase64, mimeType } = await synthesizeVoicePreview({
        text,
        voiceId,
        model,
        speed,
        sampleRate,
      });
      setAudioUrl(`data:${mimeType};base64,${audioBase64}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Voice Settings</h1>
      <p className="text-muted-foreground">
        Preview ElevenLabs voices. Flash v2.5 is sub-75ms and half-cost for drafts;
        Multilingual v2 is used for final renders.
      </p>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Voice ID</span>
        <input
          value={voiceId}
          onChange={(e) => setVoiceId(e.target.value)}
          placeholder="ElevenLabs Voice UID"
          className="w-full rounded-md border border-input bg-background px-3 py-2"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Model</span>
        <select
          value={model}
          onChange={(e) =>
            setModel(e.target.value as "eleven_flash_v2_5" | "eleven_multilingual_v2")
          }
          className="w-full rounded-md border border-input bg-background px-3 py-2"
        >
          <option value="eleven_flash_v2_5">Eleven Flash v2.5 (draft / preview)</option>
          <option value="eleven_multilingual_v2">Eleven Multilingual v2 (final render)</option>
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Sample script</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          className="w-full rounded-md border border-input bg-background px-3 py-2"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Speed ({speed.toFixed(2)})</span>
        <input
          type="range"
          min={0.7}
          max={1.2}
          step={0.05}
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          className="w-full"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Audio Sample Rate</span>
        <select
          value={sampleRate}
          onChange={(e) => setSampleRate(Number(e.target.value) as 16000 | 24000)}
          className="w-full rounded-md border border-input bg-background px-3 py-2"
        >
          <option value={16000}>16 kHz mono</option>
          <option value={24000}>24 kHz stereo</option>
        </select>
      </label>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-md border p-3">
          <p className="text-xs text-muted-foreground">Stability</p>
          <p className="text-lg font-semibold">0.50</p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-xs text-muted-foreground">Similarity</p>
          <p className="text-lg font-semibold">0.75</p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-xs text-muted-foreground">Style Exaggeration</p>
          <p className="text-lg font-semibold">0.00</p>
        </div>
      </div>

      <button
        onClick={() => void handlePreview()}
        disabled={loading || !voiceId}
        className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground font-medium disabled:opacity-50"
      >
        {loading ? "Synthesizing..." : "Preview Voice"}
      </button>

      {audioUrl && (
        <audio controls src={audioUrl} className="w-full">
          <track kind="captions" />
        </audio>
      )}

      <p className="text-sm text-muted-foreground">
        Emotional cues like [laughs] are stripped server-side so the model
        interprets the direction without reading it aloud.
      </p>
    </div>
  );
}
