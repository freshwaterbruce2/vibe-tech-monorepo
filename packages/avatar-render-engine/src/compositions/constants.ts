import { z } from 'zod';
import { videoScriptSchema } from '../schema';

export const avatarVideoCompositionId = 'AvatarVideo';

export const avatarVideoSchema = z.object({
  script: videoScriptSchema,
  audioUrl: z.string().url(),
  bRollUrls: z.array(z.string().url()),
});
