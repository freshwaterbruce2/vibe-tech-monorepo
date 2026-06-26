import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  Video,
} from 'remotion';
import type { VideoScript } from '../schema';

export interface AvatarVideoProps {
  script: VideoScript;
  audioUrl: string;
  bRollUrls: string[];
}

export const AvatarVideo: React.FC<AvatarVideoProps> = ({
  script,
  audioUrl,
  bRollUrls,
}) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const currentTime = frame / fps;

  let elapsed = 0;
  const activeSegmentIndex = script.segments.findIndex((segment) => {
    const start = elapsed;
    elapsed += segment.durationSeconds;
    return currentTime >= start && currentTime < elapsed;
  });

  const segment =
    activeSegmentIndex >= 0 ? script.segments[activeSegmentIndex] : null;
  const bRollUrl = bRollUrls[activeSegmentIndex] ?? bRollUrls[0];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0a0a0a',
        color: '#ffffff',
        fontFamily: 'sans-serif',
      }}
    >
      {bRollUrl && (
        <Video
          src={bRollUrl}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.6,
          }}
        />
      )}

      <Sequence from={0}>
        <div
          style={{
            position: 'absolute',
            bottom: 24,
            right: 24,
            width: 240,
            height: 320,
            backgroundColor: 'rgba(0,0,0,0.5)',
            borderRadius: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: 16,
          }}
        >
          <p>Avatar ({segment ? 'speaking' : 'idle'})</p>
        </div>
      </Sequence>

      {segment && (
        <div
          style={{
            position: 'absolute',
            bottom: 48,
            left: 48,
            right: 320,
            fontSize: 32,
            fontWeight: 600,
            textShadow: '0 2px 8px rgba(0,0,0,0.8)',
            textAlign: 'center',
          }}
        >
          {segment.narration}
        </div>
      )}

      <Audio src={audioUrl} />
    </AbsoluteFill>
  );
};

export const avatarVideoCompositionId = 'AvatarVideo';

export const avatarVideoSchema = {
  width: 1920,
  height: 1080,
  fps: 30,
};
