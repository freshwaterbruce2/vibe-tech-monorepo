/**
 * Settings Types
 * Type definitions for the Settings component
 */
import type { EditorSettings } from '../../types';

export interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  settings: EditorSettings;
  onSettingsChange: (settings: EditorSettings) => void;
}

export interface ModelPricing {
  input: string;
  output: string;
  context: string;
}

export type ModelId =
  // Free (OpenRouter)
  | 'liquid/lfm-2.5-1.2b-thinking:free'
  | 'liquid/lfm-2.5-1.2b-instruct:free'
  // Low cost (OpenRouter)
  | 'z-ai/glm-4.7-flash'
  | 'deepseek/deepseek-v3.2'
  // Mid cost (OpenRouter)
  | 'deepseek/deepseek-chat'
  | 'anthropic/claude-sonnet-4.5'
  // High cost (OpenRouter)
  | 'openai/gpt-5.2-codex'
  | 'openai/gpt-5.2'
  | 'anthropic/claude-opus-4.5'
  // Local fallback
  | 'local/vibe-completion';

export const MODEL_PRICING: Record<ModelId, ModelPricing> = {
  'liquid/lfm-2.5-1.2b-thinking:free': { input: 'FREE', output: 'FREE', context: '32K' },
  'liquid/lfm-2.5-1.2b-instruct:free': { input: 'FREE', output: 'FREE', context: '32K' },
  'z-ai/glm-4.7-flash': { input: '$0.07/M', output: '$0.40/M', context: '200K' },
  'deepseek/deepseek-v3.2': { input: '$0.25/M', output: '$0.38/M', context: '163.8K' },
  'deepseek/deepseek-chat': { input: '$0.30/M', output: '$1.20/M', context: '163.8K' },
  'anthropic/claude-sonnet-4.5': { input: '$3.00/M', output: '$15.00/M', context: '1M' },
  'openai/gpt-5.2-codex': { input: '$1.75/M', output: '$14.00/M', context: '400K' },
  'openai/gpt-5.2': { input: '$1.75/M', output: '$14.00/M', context: '400K' },
  'anthropic/claude-opus-4.5': { input: '$5.00/M', output: '$25.00/M', context: '200K' },
  'local/vibe-completion': { input: '$0.00', output: '$0.00', context: 'Local' },
};

export const DEFAULT_SETTINGS: EditorSettings = {
  theme: 'dark',
  fontSize: 14,
  tabSize: 2,
  wordWrap: true,
  minimap: true,
  autoSave: true,
  aiAutoComplete: true,
  aiSuggestions: true,
  aiModel: 'deepseek/deepseek-v3.2',
  showReasoningProcess: false,
  lineNumbers: true,
  folding: true,
  bracketMatching: true,
  autoIndent: true,
  formatOnSave: true,
  rulers: [80, 120],
  renderWhitespace: false,
  smoothScrolling: true,
  cursorBlinking: true,
};

export const REASONING_MODELS: ModelId[] = [
  'liquid/lfm-2.5-1.2b-thinking:free',
  'deepseek/deepseek-v3.2',
  'anthropic/claude-sonnet-4.5',
  'anthropic/claude-opus-4.5',
  'openai/gpt-5.2-codex',
  'openai/gpt-5.2',
];

export type { EditorSettings };
