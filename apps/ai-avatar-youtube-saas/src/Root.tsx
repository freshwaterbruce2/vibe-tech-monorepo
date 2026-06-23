import { ComponentType } from 'react';
import { Composition } from 'remotion';
import { AvatarVideo } from '@vibetech/avatar-render-engine';
import {
  avatarVideoCompositionId,
  avatarVideoSchema,
} from '@vibetech/avatar-render-engine/constants';

export const Root = () => {
  return (
    <Composition
      // Registers the target ID (e.g., "ShortsAvatarComposition") recognized by the Celery task
      id={avatarVideoCompositionId}
      component={AvatarVideo as ComponentType<any>}
      // Setup default timeline bounds (e.g., 30 seconds at 30 fps)
      fps={30}
      width={1080}
      height={1920}
      durationInFrames={900}
      // Enforce strict schema validation for the Celery payload props
      schema={avatarVideoSchema}
      defaultProps={{
        script: {
          title: 'VibeTech Automation',
          description: 'Automated render',
          tags: ['automation'],
          segments: [
            {
              id: 'seg-1',
              narration:
                'Welcome to VibeTech! This is your automated AI avatar pipeline in action.',
              visualQuery: 'technology background',
              durationSeconds: 5.5,
            },
          ],
        },
        audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
        bRollUrls: [
          'https://videos.pexels.com/video-files/example_pexels_clip_1080p.mp4',
        ],
      }}
    />
  );
};
