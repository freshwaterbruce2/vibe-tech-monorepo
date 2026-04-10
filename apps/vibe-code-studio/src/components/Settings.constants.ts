/**
 * Settings Constants
 * Extracted from Settings.tsx for 500-line limit compliance
 */
import type { EditorSettings } from '../types';

export const defaultSettings: EditorSettings = {
  theme: 'dark',
  fontSize: 14,
  tabSize: 2,
  wordWrap: true,
  minimap: true,
  autoSave: true,
  aiAutoComplete: true,
  aiSuggestions: true,
  aiModel: 'moonshot/kimi-2.5-pro',
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

export interface ModelPricing {
  input: string;
  output: string;
  context: string;
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  // Moonshot (primary)
  'moonshot/kimi-2.5-pro': { input: '$0.15/M', output: '$0.60/M', context: '128K' },

  // Free (OpenRouter)
  'liquid/lfm-2.5-1.2b-thinking:free': { input: 'FREE', output: 'FREE', context: '32K' },
  'liquid/lfm-2.5-1.2b-instruct:free': { input: 'FREE', output: 'FREE', context: '32K' },

  // Low cost
  'z-ai/glm-4.7-flash': { input: '$0.07/M', output: '$0.40/M', context: '200K' },
  'deepseek/deepseek-v3.2': { input: '$0.25/M', output: '$0.38/M', context: '163.8K' },

  // Mid cost
  'deepseek/deepseek-chat': { input: '$0.30/M', output: '$1.20/M', context: '163.8K' },
  'anthropic/claude-sonnet-4.5': { input: '$3.00/M', output: '$15.00/M', context: '1M' },
  'anthropic/claude-sonnet-4.6': { input: '$3.00/M', output: '$15.00/M', context: '1M' },

  // High cost
  'openai/gpt-5.2-codex': { input: '$1.75/M', output: '$14.00/M', context: '400K' },
  'openai/gpt-5.2': { input: '$1.75/M', output: '$14.00/M', context: '400K' },
  'anthropic/claude-opus-4.5': { input: '$5.00/M', output: '$25.00/M', context: '200K' },
  'anthropic/claude-opus-4.6': { input: '$5.00/M', output: '$25.00/M', context: '200K' },

  // Local
  'local/vibe-completion': { input: 'FREE', output: 'FREE', context: 'Unlimited' },
};

/** Models that support reasoning/thinking display */
export const REASONING_MODELS = [
  'moonshot/kimi-2.5-pro',
  'liquid/lfm-2.5-1.2b-thinking:free',
  'deepseek/deepseek-v3.2',
  'anthropic/claude-sonnet-4.5',
  'anthropic/claude-sonnet-4.6',
  'anthropic/claude-opus-4.5',
  'anthropic/claude-opus-4.6',
  'openai/gpt-5.2-codex',
  'openai/gpt-5.2',
];

export const getModelPricing = (modelId: string | undefined): ModelPricing | null => {
  if (!modelId) return null;
  return MODEL_PRICING[modelId] ?? null;
};

export const supportsReasoning = (modelId: string | undefined): boolean => {
  if (!modelId) return false;
  return REASONING_MODELS.includes(modelId);
};
