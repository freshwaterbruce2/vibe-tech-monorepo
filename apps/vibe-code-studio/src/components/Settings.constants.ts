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
  // Best-value OpenRouter coding model (SOTA SWE-bench, ~10x cheaper than
  // Opus-tier). OpenRouter-served id: the default must work with a single
  // OpenRouter key — 'moonshot/kimi-2.5-pro' routes to Moonshot's direct API
  // and 503s unless a separate Moonshot key is configured server-side.
  aiModel: 'deepseek/deepseek-v4-pro',
  showReasoningProcess: false,
  reasoningEffort: 'medium',
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
  'moonshotai/kimi-k2.7-code': { input: '$0.61/M', output: '$3.07/M', context: '262K' },

  // Free (OpenRouter)
  'liquid/lfm-2.5-1.2b-thinking:free': { input: 'FREE', output: 'FREE', context: '32K' },
  'liquid/lfm-2.5-1.2b-instruct:free': { input: 'FREE', output: 'FREE', context: '32K' },
  'nvidia/nemotron-3-ultra-550b-a55b:free': { input: 'FREE', output: 'FREE', context: '1M' },

  // Low cost
  'z-ai/glm-4.7-flash': { input: '$0.07/M', output: '$0.40/M', context: '200K' },
  'deepseek/deepseek-v3.2': { input: '$0.25/M', output: '$0.38/M', context: '163.8K' },
  'deepseek/deepseek-v4-flash': { input: '$0.09/M', output: '$0.18/M', context: '1M' },
  'deepseek/deepseek-v4-pro': { input: '$0.43/M', output: '$0.87/M', context: '1M' },
  'qwen/qwen3.7-plus': { input: '$0.32/M', output: '$1.28/M', context: '1M' },

  // Mid cost
  'deepseek/deepseek-chat': { input: '$0.30/M', output: '$1.20/M', context: '163.8K' },
  'anthropic/claude-sonnet-4.5': { input: '$3.00/M', output: '$15.00/M', context: '1M' },
  'anthropic/claude-sonnet-4.6': { input: '$3.00/M', output: '$15.00/M', context: '1M' },
  'z-ai/glm-5.2': { input: '$1.00/M', output: '$4.00/M', context: '1M' },
  'x-ai/grok-4.3': { input: '$1.25/M', output: '$2.50/M', context: '1M' },
  'google/gemini-3.5-flash': { input: '$1.50/M', output: '$9.00/M', context: '1M' },

  // High cost
  'openai/gpt-5.2-codex': { input: '$1.75/M', output: '$14.00/M', context: '400K' },
  'openai/gpt-5.2': { input: '$1.75/M', output: '$14.00/M', context: '400K' },
  'openai/gpt-5.5': { input: '$5.00/M', output: '$30.00/M', context: '1M' },
  'anthropic/claude-opus-4.5': { input: '$5.00/M', output: '$25.00/M', context: '200K' },
  'anthropic/claude-opus-4.6': { input: '$5.00/M', output: '$25.00/M', context: '200K' },
  'anthropic/claude-opus-4.8': { input: '$5.00/M', output: '$25.00/M', context: '1M' },
  'anthropic/claude-fable-5': { input: '$10.00/M', output: '$50.00/M', context: '1M' },
};

/** Models that support reasoning/thinking display */
export const REASONING_MODELS = [
  'moonshot/kimi-2.5-pro',
  'moonshotai/kimi-k2.7-code',
  'liquid/lfm-2.5-1.2b-thinking:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'deepseek/deepseek-v3.2',
  'deepseek/deepseek-v4-flash',
  'deepseek/deepseek-v4-pro',
  'anthropic/claude-sonnet-4.5',
  'anthropic/claude-sonnet-4.6',
  'anthropic/claude-opus-4.5',
  'anthropic/claude-opus-4.6',
  'anthropic/claude-opus-4.8',
  'anthropic/claude-fable-5',
  'z-ai/glm-5.2',
  'openai/gpt-5.2-codex',
  'openai/gpt-5.2',
  'openai/gpt-5.5',
];

export const getModelPricing = (modelId: string | undefined): ModelPricing | null => {
  if (!modelId) return null;
  return MODEL_PRICING[modelId] ?? null;
};

export const supportsReasoning = (modelId: string | undefined): boolean => {
  if (!modelId) return false;
  return REASONING_MODELS.includes(modelId);
};
