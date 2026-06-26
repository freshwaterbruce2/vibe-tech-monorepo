export interface RenderPayload {
  scriptPrompt: string;
  voiceId: string;
  audioSampleRate: 16000 | 48000;
  assetPaths: string[];
  visemeMapping?: Record<string, unknown>;
}

export interface RenderJobResponse {
  success: boolean;
  jobId?: number;
  error?: string;
}

export interface RenderJobStatus {
  id: number;
  status: string;
  outputUrl: string | null;
  errorMessage: string | null;
}
