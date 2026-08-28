"use client";

import React, { useMemo, useState } from "react";
import { Player } from "@remotion/player";
import { AvatarPreview, SubtitleCue } from "@/components/remotion/AvatarPreview";

export default function PreviewPage() {
  const [avatarUrl, setAvatarUrl] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [duration, setDuration] = useState(5);
  const [subtitlesJson, setSubtitlesJson] = useState("[]");

  const fps = 30;
  const durationInFrames = Math.max(1, Math.round(duration * fps));

  const subtitles = useMemo<SubtitleCue[]>(() => {
    try {
      const parsed = JSON.parse(subtitlesJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [subtitlesJson]);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Avatar Preview</h1>
      <p className="text-muted-foreground">
        Preview your avatar, audio, and burned-in subtitles at 30 fps. This same
        React composition drives the server-side render worker.
      </p>

      <div className="space-y-3">
        <input
          type="url"
          placeholder="Avatar image URL"
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
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
          type="number"
          min={1}
          max={300}
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value))}
          className="w-full rounded-md border border-input bg-background px-3 py-2"
        />
        <textarea
          placeholder='Subtitles JSON: [{"start":0,"end":2,"text":"Hello"}]'
          value={subtitlesJson}
          onChange={(e) => setSubtitlesJson(e.target.value)}
          rows={4}
          className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
        />
      </div>

      {avatarUrl && (
        <div className="rounded-lg border border-border overflow-hidden">
          <Player
            component={AvatarPreview}
            inputProps={{
              avatarUrl,
              audioUrl,
              durationInSeconds: duration,
              subtitles,
            }}
            durationInFrames={durationInFrames}
            compositionWidth={1920}
            compositionHeight={1080}
            fps={fps}
            controls
            style={{ width: "100%" }}
          />
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        The render worker uses FFmpeg to loop the avatar image, burn these
        subtitles, and mux the ElevenLabs audio with lossless video stream copy.
      </p>
    </div>
  );
}
