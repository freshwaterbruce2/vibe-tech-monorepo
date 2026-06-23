import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
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

export const AvatarVideo = ({
  script,
  audioUrl,
  bRollUrls,
}: AvatarVideoProps) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const currentTime = frame / fps;

  let activeSegmentIndex = -1;
  let elapsed = 0;
  for (let i = 0; i < script.segments.length; i++) {
    const segment = script.segments[i];
    if (!segment) continue;
    const start = elapsed;
    elapsed += segment.durationSeconds;
    if (currentTime >= start && currentTime < elapsed) {
      activeSegmentIndex = i;
      break;
    }
  }

  const segment =
    activeSegmentIndex >= 0 ? script.segments[activeSegmentIndex] : null;
  const bRollUrl = bRollUrls[activeSegmentIndex] ?? bRollUrls[0];

  const resolvedBRollUrl =
    bRollUrl && bRollUrl.startsWith('/') ? staticFile(bRollUrl) : bRollUrl;
  const resolvedAudioUrl =
    audioUrl && audioUrl.startsWith('/') ? staticFile(audioUrl) : audioUrl;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0a0a0a',
        color: '#ffffff',
        fontFamily: 'sans-serif',
      }}
    >
      {resolvedBRollUrl && (
        <Video
          src={resolvedBRollUrl}
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

      <Audio src={resolvedAudioUrl} />
    </AbsoluteFill>
  );
};


