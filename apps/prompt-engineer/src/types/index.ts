export type AIModel =
  | 'claude-opus-4-6'
  | 'claude-sonnet-4-5'
  | 'claude-haiku-4-5'
  | 'gemini-3-pro'
  | 'gemini-2-5-flash'
  | 'gemini-2-5-pro'
  | 'codex-5-3'
  | 'codex-5-3-spark';

export type PromptMode = 'plan' | 'edit' | 'review' | 'ask';

export interface HistoryItem {
  id: string;
  timestamp: string;
  model: AIModel;
  mode: PromptMode;
  inputPrompt: string;
  outputPrompt: string;
  extendedThinking: boolean;
}

export interface OptimizeRequest {
  prompt: string;
  model: AIModel;
  mode: PromptMode;
  extendedThinking: boolean;
}

export interface ModelConfig {
  id: AIModel;
  name: string;
  provider: string;
  context: number;
  maxOutput: number;
  thinking: boolean;
  strengths: string[];
}
