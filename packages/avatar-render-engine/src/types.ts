import type { VideoStatus } from './schema';

/**
 * Shared types for the AI Avatar YouTube Automator render pipeline.
 */

export interface RenderPipelineEvent {
  jobId: string;
  projectId: string;
  status: VideoStatus;
  progress: number;
  message?: string;
  timestamp: string;
}

