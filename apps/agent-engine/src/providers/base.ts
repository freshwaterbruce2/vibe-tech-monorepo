import { CONFIG } from '../config.js';
import type { BehavioralProviderMode, LlmProvider } from '../types.js';
import { MoonshotProvider } from './moonshot-provider.js';
import { ScriptedBehavioralProvider } from './scripted-behavioral-provider.js';

export function ensureProvider<T>(value: T | undefined, message: string): T {
  if (!value) {
    throw new Error(message);
  }
  return value;
}

export function createBehavioralProvider(
  mode: BehavioralProviderMode = CONFIG.AGENT_ENGINE_BEHAVIORAL_PROVIDER,
): LlmProvider {
  if (mode === 'scripted') {
    return new ScriptedBehavioralProvider();
  }

  if (mode === 'moonshot') {
    return new MoonshotProvider();
  }

  return CONFIG.KIMI_API_KEY ? new MoonshotProvider() : new ScriptedBehavioralProvider();
}

export type { LlmProvider };
