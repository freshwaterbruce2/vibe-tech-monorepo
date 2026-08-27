import { z } from 'zod';

export const videoStatusSchema = z.enum([
  'draft',
  'scripting',
  'sourcing',
  'rendering_audio',
  'rendering_video',
  'muxing',
  'review',
  'publishing',
  'published',
  'failed',
]);

export const avatarTypeSchema = z.enum(['readyPlayerMe', 'rive']);

export const avatarConfigSchema = z.object({
  type: avatarTypeSchema,
  readyPlayerMeUrl: z.string().url().optional(),
  riveStateMachine: z.string().optional(),
  fallbackType: avatarTypeSchema.optional(),
});

export const visemeKeyframeSchema = z.object({
  timeInSeconds: z.number().nonnegative(),
  viseme: z.number().int().min(0).max(10),
  weight: z.number().min(0).max(1),
});

export const scriptSegmentSchema = z.object({
  id: z.string(),
  narration: z.string().min(1),
  visualQuery: z.string().min(1),
  durationSeconds: z.number().positive(),
  bRollUrl: z.string().url().optional(),
  visemes: z.array(visemeKeyframeSchema).optional(),
});

export const videoScriptSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  tags: z.array(z.string()),
  segments: z.array(scriptSegmentSchema).min(1),
});

export const publishConfigSchema = z.object({
  channelId: z.string().optional(),
  title: z.string().min(1),
  description: z.string(),
  tags: z.array(z.string()),
  privacyStatus: z.enum(['private', 'unlisted', 'public']),
  selfDeclaredAlteredContent: z.boolean(),
  scheduledAt: z.string().datetime().optional(),
});

export const createProjectInputSchema = z.object({
  title: z.string().min(1).max(120),
  theme: z.string().min(1),
  avatar: avatarConfigSchema,
});

export const generateScriptInputSchema = z.object({
  projectId: z.string(),
  theme: z.string().min(1),
  tone: z.string().optional(),
  segmentCount: z.number().int().min(1).max(20).optional(),
});

export const renderJobSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  status: videoStatusSchema,
  progress: z.number().min(0).max(100),
  outputUrl: z.string().url().optional(),
  errorMessage: z.string().optional(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
});

export const videoProjectSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  theme: z.string(),
  status: videoStatusSchema,
  avatar: avatarConfigSchema,
  script: videoScriptSchema.optional(),
  publish: publishConfigSchema.optional(),
  outputUrl: z.string().url().optional(),
  youtubeVideoId: z.string().optional(),
  renderProgress: z.number().min(0).max(100),
  errorMessage: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type VideoStatus = z.infer<typeof videoStatusSchema>;
export type AvatarType = z.infer<typeof avatarTypeSchema>;
export type AvatarConfig = z.infer<typeof avatarConfigSchema>;
export type VisemeKeyframe = z.infer<typeof visemeKeyframeSchema>;
export type ScriptSegment = z.infer<typeof scriptSegmentSchema>;
export type VideoScript = z.infer<typeof videoScriptSchema>;
export type PublishConfig = z.infer<typeof publishConfigSchema>;
export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;
export type GenerateScriptInput = z.infer<typeof generateScriptInputSchema>;
export type RenderJob = z.infer<typeof renderJobSchema>;
export type VideoProject = z.infer<typeof videoProjectSchema>;
