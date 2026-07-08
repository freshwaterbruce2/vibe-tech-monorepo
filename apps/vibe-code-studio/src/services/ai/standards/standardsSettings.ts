/**
 * standardsSettings — spec 03 (Open Agent Standards) AC #10.
 *
 * User-visible toggles for the standards sources injected into planning/chat
 * prompts: AGENTS.md (AgentsMdLoader), project rules (.deepcoderules /
 * .cursorrules via RulesParser), and the AGENTS.md fenced-Commands one-click
 * actions (AC #11). Each source is individually toggleable; disabling one
 * never breaks the others. The SKILL.md loader toggle ships with Phase 2.
 *
 * Persistence follows the store-fallback pattern (window.electron.store →
 * localStorage); loading/saving never throws — prompt construction and the
 * Settings UI must survive a broken store.
 */
import { logger } from '../../Logger';

export interface StandardsSettings {
  /** Inject AGENTS.md standards into planning/chat prompts. */
  agentsMd: boolean;
  /** Inject .deepcoderules / .cursorrules custom rules into chat prompts. */
  projectRules: boolean;
  /** Offer AGENTS.md "Commands" fenced blocks as one-click palette actions. */
  agentsMdCommands: boolean;
}

export const STANDARDS_SETTINGS_STORAGE_KEY = 'vcs_standards_settings';

const DEFAULT_SETTINGS: StandardsSettings = {
  agentsMd: true,
  projectRules: true,
  agentsMdCommands: true,
};

type Listener = (settings: StandardsSettings) => void;

let cached: StandardsSettings | null = null;
const listeners = new Set<Listener>();

async function readPersisted(): Promise<string | null> {
  if (typeof window !== 'undefined' && window.electron?.store) {
    return (await window.electron.store.get(STANDARDS_SETTINGS_STORAGE_KEY)) ?? null;
  }
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(STANDARDS_SETTINGS_STORAGE_KEY);
  }
  return null;
}

async function writePersisted(serialized: string): Promise<void> {
  if (typeof window !== 'undefined' && window.electron?.store) {
    await window.electron.store.set(STANDARDS_SETTINGS_STORAGE_KEY, serialized);
  } else if (typeof localStorage !== 'undefined') {
    localStorage.setItem(STANDARDS_SETTINGS_STORAGE_KEY, serialized);
  }
}

/** Coerce persisted (possibly partial/foreign) JSON into a full settings object. */
function sanitize(raw: unknown): StandardsSettings {
  const source = (raw ?? {}) as Partial<Record<keyof StandardsSettings, unknown>>;
  const bool = (key: keyof StandardsSettings): boolean =>
    typeof source[key] === 'boolean' ? (source[key] as boolean) : DEFAULT_SETTINGS[key];
  return {
    agentsMd: bool('agentsMd'),
    projectRules: bool('projectRules'),
    agentsMdCommands: bool('agentsMdCommands'),
  };
}

function notify(settings: StandardsSettings): void {
  for (const listener of listeners) {
    try {
      listener(settings);
    } catch (error) {
      logger.error('[standardsSettings] Listener failed', error);
    }
  }
}

/** Current settings from memory; defaults until loadStandardsSettings resolves. */
export function getStandardsSettings(): StandardsSettings {
  return { ...(cached ?? DEFAULT_SETTINGS) };
}

/** Load persisted settings (cached after the first read). Never throws. */
export async function loadStandardsSettings(): Promise<StandardsSettings> {
  if (cached) {
    return { ...cached };
  }
  try {
    const stored = await readPersisted();
    cached = stored ? sanitize(JSON.parse(stored)) : { ...DEFAULT_SETTINGS };
  } catch (error) {
    logger.error('[standardsSettings] Failed to load settings', error);
    cached = { ...DEFAULT_SETTINGS };
  }
  return { ...cached };
}

/** Flip one toggle: updates memory immediately, persists, notifies subscribers. */
export async function setStandardsSetting(
  key: keyof StandardsSettings,
  value: boolean
): Promise<StandardsSettings> {
  const current = cached ?? (await loadStandardsSettings());
  cached = { ...current, [key]: value };
  try {
    await writePersisted(JSON.stringify(cached));
  } catch (error) {
    logger.error('[standardsSettings] Failed to persist settings', error);
  }
  notify({ ...cached });
  return { ...cached };
}

/** Subscribe to settings changes; returns an unsubscribe function. */
export function subscribeStandardsSettings(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Test seam: drop the in-memory cache and all subscribers. */
export function resetStandardsSettingsForTests(): void {
  cached = null;
  listeners.clear();
}
