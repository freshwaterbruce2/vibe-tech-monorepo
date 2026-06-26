import type { ReactNode } from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

export interface AvatarPreviewProps {
  avatarUrl: string;
  audioUrl: string;
  durationInSeconds: number;
  subtitles?: SubtitleCue[];
  title?: string;
  outroText?: string;
}

const INTRO_SECONDS = 1.5;
const OUTRO_SECONDS = 1.5;

export const AvatarPreview = ({
  avatarUrl,
  audioUrl,
  durationInSeconds,
  subtitles = [],
  title = "VibeTech Avatar",
  outroText = "Subscribe for more",
}: AvatarPreviewProps) => {
  const { fps } = useVideoConfig();
  const introFrames = Math.round(INTRO_SECONDS * fps);
  const outroFrames = Math.round(OUTRO_SECONDS * fps);
  const totalFrames = Math.max(1, Math.round(durationInSeconds * fps));
  const mainEndFrame = Math.max(introFrames, totalFrames - outroFrames);

  return (
    <AbsoluteFill className="bg-black">
      <Sequence from={0} durationInFrames={totalFrames}>
        <Img
          src={avatarUrl || staticFile("avatar-placeholder.png")}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </Sequence>

      {audioUrl && (
        <Sequence from={0} durationInFrames={totalFrames}>
          <Audio src={audioUrl} startFrom={0} />
        </Sequence>
      )}

      <Sequence from={0} durationInFrames={introFrames}>
        <CenterCard>{title}</CenterCard>
      </Sequence>

      <Sequence from={introFrames} durationInFrames={mainEndFrame - introFrames}>
        <SubtitleOverlay cues={subtitles} />
      </Sequence>

      <Sequence from={mainEndFrame} durationInFrames={totalFrames - mainEndFrame}>
        <CenterCard>{outroText}</CenterCard>
      </Sequence>
    </AbsoluteFill>
  );
};

function SubtitleOverlay({ cues }: { cues: SubtitleCue[] }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;
  const active = cues.find((cue) => cue.start <= time && cue.end > time);

  if (!active) return null;

  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        paddingBottom: "10%",
      }}
    >
      <div
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.6)",
          color: "#ffffff",
          padding: "12px 24px",
          borderRadius: "8px",
          fontFamily: "Arial, sans-serif",
          fontSize: "42px",
          fontWeight: 700,
          textAlign: "center",
          textShadow: "2px 2px 4px rgba(0,0,0,0.8)",
          maxWidth: "80%",
          lineHeight: 1.3,
        }}
      >
        {active.text}
      </div>
    </AbsoluteFill>
  );
}

function CenterCard({ children }: { children: ReactNode }) {
  return (
    <AbsoluteFill
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.45)",
      }}
    >
      <h2
        style={{
          color: "#ffffff",
          fontFamily: "Arial, sans-serif",
          fontSize: "64px",
          fontWeight: 800,
          textAlign: "center",
          textShadow: "3px 3px 6px rgba(0,0,0,0.9)",
          padding: "0 48px",
        }}
      >
        {children}
      </h2>
    </AbsoluteFill>
  );
}
