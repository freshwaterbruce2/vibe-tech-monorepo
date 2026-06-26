"use client";

import { useRef, useState } from "react";
import { Avatar2D } from "./Avatar2D";
import { Avatar3D } from "./Avatar3D";
import { AvatarErrorBoundary } from "./AvatarErrorBoundary";
import { useLipSync } from "./useLipSync";

export interface AvatarPlayerProps {
  modelUrl: string;
  audioUrl: string;
  riveUrl?: string;
}

/**
 * Only bind audio/model sources that use a safe scheme. `audioUrl` is user-
 * supplied, so block `javascript:`/`vbscript:` and other unexpected schemes
 * before it reaches the element src; anything unsafe yields an empty src.
 */
function sanitizeMediaUrl(rawUrl: string): string {
  if (!rawUrl) return "";
  if (rawUrl.startsWith("blob:") || /^data:audio\//i.test(rawUrl)) return rawUrl;
  try {
    const parsed = new URL(rawUrl, "http://localhost");
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? rawUrl : "";
  } catch {
    return "";
  }
}

export function AvatarPlayer({ modelUrl, audioUrl, riveUrl }: AvatarPlayerProps) {
  const [use2D, setUse2D] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { weights, isPlaying } = useLipSync(audioRef);

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      void audio.play();
    }
  };

  const avatar2D = <Avatar2D riveUrl={riveUrl} weights={weights} />;
  const safeAudioUrl = sanitizeMediaUrl(audioUrl);

  return (
    <div className="space-y-4">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-black">
        {use2D ? (
          avatar2D
        ) : (
          <AvatarErrorBoundary fallback={avatar2D}>
            <Avatar3D
              modelUrl={modelUrl}
              weights={weights}
              onContextLost={() => setUse2D(true)}
            />
          </AvatarErrorBoundary>
        )}
      </div>

      <audio
        ref={audioRef}
        src={safeAudioUrl}
        crossOrigin="anonymous"
        className="w-full"
        controls
      />

      <div className="flex items-center gap-4">
        <button
          onClick={togglePlayback}
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
        >
          {isPlaying ? "Pause" : "Play"}
        </button>
        <button
          onClick={() => setUse2D((prev) => !prev)}
          className="rounded-md border border-input bg-background px-4 py-2"
        >
          {use2D ? "Switch to 3D" : "Switch to 2D Fallback"}
        </button>
        <span className="text-xs text-muted-foreground">
          Visemes: O {weights.viseme_O.toFixed(2)} · A {weights.viseme_aa.toFixed(2)} · E{" "}
          {weights.viseme_E.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
