/**
 * Settings model-switch (v1.2.1 "model switch never took" bug).
 *
 * Root cause: the handler updated only the AI SERVICE; useAppServices re-syncs
 * the service from the useAIStore on every change, so the stale store value
 * immediately overwrote the switch. The fix writes the store FIRST (source of
 * truth), then the service. These tests lock that order against the REAL
 * zustand store via the extracted applySettingsChange handler.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { applySettingsChange } from '../AppLayout';
import { useAIStore } from '../../stores/useAIStore';

const PREV_MODEL = 'moonshot/kimi-2.5-pro';
const NEXT_MODEL = 'openai/gpt-5.2';

function makeDeps(overrides: Partial<Parameters<typeof applySettingsChange>[0]> = {}) {
  return {
    updateEditorSettings: vi.fn(),
    prevAiModel: PREV_MODEL,
    aiService: { setModel: vi.fn().mockResolvedValue(undefined) },
    showSuccess: vi.fn(),
    showError: vi.fn(),
    ...overrides,
  };
}

describe('applySettingsChange', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAIStore.getState().actions.setModel(PREV_MODEL);
  });

  it('writes the AI store BEFORE the service on a model change', async () => {
    const storeModelWhenServiceRan: string[] = [];
    const deps = makeDeps({
      aiService: {
        setModel: vi.fn().mockImplementation(async () => {
          storeModelWhenServiceRan.push(useAIStore.getState().currentModel);
        }),
      },
    });

    await applySettingsChange(deps, { aiModel: NEXT_MODEL });

    // the store already held the new model when the service was updated
    expect(storeModelWhenServiceRan).toEqual([NEXT_MODEL]);
    expect(deps.aiService.setModel).toHaveBeenCalledWith(NEXT_MODEL);
    expect(useAIStore.getState().currentModel).toBe(NEXT_MODEL);
    expect(deps.updateEditorSettings).toHaveBeenCalledWith({ aiModel: NEXT_MODEL });
    expect(deps.showSuccess).toHaveBeenCalledWith(
      'Settings Updated',
      'Your preferences have been saved'
    );
    expect(deps.showError).not.toHaveBeenCalled();
  });

  it('keeps the store on the new model and shows Model Error when the service rejects', async () => {
    const deps = makeDeps({
      aiService: { setModel: vi.fn().mockRejectedValue(new Error('proxy down')) },
    });

    await applySettingsChange(deps, { aiModel: NEXT_MODEL });

    expect(deps.showError).toHaveBeenCalledWith('Model Error', 'proxy down');
    expect(deps.showSuccess).not.toHaveBeenCalled();
    // store is source of truth — it keeps the switch; the service re-syncs from it
    expect(useAIStore.getState().currentModel).toBe(NEXT_MODEL);
  });

  it('does not touch the model when aiModel is unchanged', async () => {
    const deps = makeDeps();

    await applySettingsChange(deps, { aiModel: PREV_MODEL });

    expect(deps.aiService.setModel).not.toHaveBeenCalled();
    expect(useAIStore.getState().currentModel).toBe(PREV_MODEL);
    expect(deps.updateEditorSettings).toHaveBeenCalledTimes(1);
    expect(deps.showSuccess).toHaveBeenCalled();
  });

  it('saves settings without model side effects when aiModel is absent', async () => {
    const deps = makeDeps();

    await applySettingsChange(deps, { aiModel: undefined });

    expect(deps.aiService.setModel).not.toHaveBeenCalled();
    expect(deps.updateEditorSettings).toHaveBeenCalledTimes(1);
    expect(deps.showSuccess).toHaveBeenCalled();
  });
});
