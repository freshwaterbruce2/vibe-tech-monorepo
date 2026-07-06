/**
 * knowledgeIntegration — spec 04 Phase 1 module wiring. Owns the singleton
 * KnowledgeStore, syncs the UI store, and builds the session-start
 * injection block (top-N by relevance, char-budgeted, source-tagged) that
 * rides the spec-03 standards seam into prompts.
 * Spec: FEATURE_SPECS/competitive-gaps/04-AGENT-MEMORY-KNOWLEDGE.md
 */
import { useKnowledgeStore } from '../../stores/knowledgeStore';
import { logger } from '../Logger';
import { KnowledgeStore } from './KnowledgeStore';
import { scoreKnowledge } from './relevance';
import {
  KNOWLEDGE_INJECTION_CHAR_BUDGET,
  KNOWLEDGE_INJECTION_TOP_N,
  type KnowledgeDraft,
  type KnowledgeItem,
} from './types';

let store: KnowledgeStore | null = null;

function requireStore(): KnowledgeStore {
  store ??= new KnowledgeStore();
  return store;
}

/** Test seam. */
export function resetKnowledgeForTests(): void {
  store = null;
}

async function syncToUiStore(): Promise<void> {
  useKnowledgeStore.getState().actions.setItems(requireStore().list());
}

/** Load persisted items into memory + UI store. Safe to call repeatedly. */
export async function loadKnowledge(): Promise<KnowledgeItem[]> {
  const knowledgeStore = requireStore();
  await knowledgeStore.load();
  await syncToUiStore();
  return knowledgeStore.list();
}

export async function addKnowledgeItem(draft: KnowledgeDraft): Promise<KnowledgeItem> {
  const knowledgeStore = requireStore();
  await knowledgeStore.load();
  const item = await knowledgeStore.create(draft);
  await syncToUiStore();
  return item;
}

export async function updateKnowledgeItem(
  id: string,
  changes: Partial<Omit<KnowledgeItem, 'id' | 'createdAt'>>
): Promise<KnowledgeItem | undefined> {
  const knowledgeStore = requireStore();
  await knowledgeStore.load();
  const updated = await knowledgeStore.update(id, changes);
  await syncToUiStore();
  return updated;
}

export async function deleteKnowledgeItem(id: string): Promise<boolean> {
  const knowledgeStore = requireStore();
  await knowledgeStore.load();
  const removed = await knowledgeStore.remove(id);
  await syncToUiStore();
  return removed;
}

/**
 * Build the knowledge block injected into prompts at session start (AC #3):
 * top-N relevant items, char-budgeted (AC #10), source-tagged (AC #11).
 * Returns '' when nothing applies. Never throws.
 */
export async function buildKnowledgeSection(context: string): Promise<string> {
  try {
    const items = await loadKnowledge();
    const scored = scoreKnowledge(items, context).slice(0, KNOWLEDGE_INJECTION_TOP_N);
    if (scored.length === 0) {
      return '';
    }
    const blocks: string[] = [];
    let budget = KNOWLEDGE_INJECTION_CHAR_BUDGET;
    for (const { item } of scored) {
      const block = `<!-- knowledge: ${item.id} (${item.sourceSessionId}) -->\n### ${item.title}\n${item.content}`;
      if (block.length > budget) {
        break;
      }
      blocks.push(block);
      budget -= block.length;
    }
    if (blocks.length === 0) {
      return '';
    }
    return ['', '', 'WORKSPACE KNOWLEDGE ITEMS:', blocks.join('\n\n'), ''].join('\n');
  } catch (error) {
    logger.error('[knowledge] Failed to build knowledge section', error);
    return '';
  }
}
