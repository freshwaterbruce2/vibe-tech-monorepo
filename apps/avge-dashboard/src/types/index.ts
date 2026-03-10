/** AVGE Pipeline — Core Type Definitions */

/** BLAST pipeline stages */
export type BlastStage = 'BLUEPRINT' | 'LINK' | 'ARCHITECT' | 'STYLE' | 'TRIGGER';

export type StageStatus = 'idle' | 'running' | 'success' | 'error' | 'warning';

export interface PipelineStage {
  id: BlastStage;
  label: string;
  status: StageStatus;
  startedAt?: number;
  completedAt?: number;
  error?: string;
}

/** Pipeline run — a single execution of the BLAST framework */
export interface PipelineRun {
  id: string;
  projectId: string;
  stages: PipelineStage[];
  currentStage: BlastStage | null;
  status: 'idle' | 'running' | 'completed' | 'failed';
  createdAt: number;
  completedAt?: number;
}

/** Source material for NotebookLM ingestion */
export type SourceType = 'youtube_url' | 'website_url' | 'transcript' | 'pdf' | 'text';

export interface SourceItem {
  id: string;
  type: SourceType;
  title: string;
  url?: string;
  content?: string;
  addedAt: number;
  notebookSourceId?: string;
}

/** NotebookLM project container */
export interface NotebookProject {
  id: string;
  notebookId: string;
  title: string;
  sources: SourceItem[];
  createdAt: number;
}

/** 3M Hook analysis output */
export interface HookAnalysis {
  hooks: HookPattern[];
  structures: StoryStructure[];
  anxietyPoints: AnxietyTrigger[];
  retentionGaps: string[];
}

export interface HookPattern {
  type: 'rhetorical_question' | 'statistic' | 'story' | 'controversy' | 'mystery';
  text: string;
  source: string;
  effectiveness: number;
}

export interface StoryStructure {
  pattern: string;
  description: string;
  examples: string[];
}

export interface AnxietyTrigger {
  category: 'financial' | 'personal' | 'health' | 'career' | 'social';
  trigger: string;
  resolution: string;
}

/** Script output */
export interface GeneratedScript {
  id: string;
  title: string;
  durationMinutes: number;
  segments: ScriptSegment[];
  fullText: string;
  hookAnalysis: HookAnalysis;
}

export interface ScriptSegment {
  index: number;
  startSeconds: number;
  endSeconds: number;
  text: string;
  visualPrompt: string;
  mood: string;
}

/** Audio asset */
export interface AudioAsset {
  id: string;
  scriptId: string;
  filePath: string;
  durationSeconds: number;
  model: string;
  generatedAt: number;
}

/** Visual asset */
export interface VisualAsset {
  id: string;
  segmentIndex: number;
  prompt: string;
  filePath: string;
  resolution: string;
  model: string;
  generatedAt: number;
}

/** Sync table entry — maps script segments to visuals + audio timing */
export interface SyncEntry {
  segmentIndex: number;
  startSeconds: number;
  endSeconds: number;
  scriptLine: string;
  visualPrompt: string;
  visualPath: string;
  audioPath: string;
}

/** Chat message for RAG panel */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: string[];
  timestamp: number;
}

/** Intelligence file tree item */
export interface IntelligenceItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  children?: IntelligenceItem[];
}

/** Brain.md configuration */
export interface BrainConfig {
  brandName: string;
  tagline: string;
  audience: string;
  niche: string;
  platform: string;
  voice: {
    formality: string;
    pacing: string;
    emotion: string;
    perspective: string;
  };
  visualIdentity: {
    primaryColors: string[];
    accentColors: string[];
    typography: string;
    thumbnailStyle: string;
  };
}
