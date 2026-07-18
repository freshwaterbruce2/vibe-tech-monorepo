/**
 * useEditorActions — Ctrl+Space "trigger AI completion" was a no-op. It must now
 * invoke Monaco's inline-suggest action so the monacopilot completion (registered
 * in useAppHandlers) actually surfaces.
 */
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { RefObject } from 'react';
import type { editor } from 'monaco-editor';
import { useEditorActions } from '../../hooks/useEditorActions';

function makeRef(instance: unknown): RefObject<editor.IStandaloneCodeEditor | null> {
  return { current: instance } as RefObject<editor.IStandaloneCodeEditor | null>;
}

describe('useEditorActions.triggerAiCompletion', () => {
  it('triggers the monaco inline-suggest completion', async () => {
    const trigger = vi.fn();
    const { result } = renderHook(() => useEditorActions(makeRef({ trigger })));

    await result.current.triggerAiCompletion();

    expect(trigger).toHaveBeenCalledWith('keyboard', 'editor.action.inlineSuggest.trigger', {});
  });

  it('no-ops safely when the editor ref is null', async () => {
    const { result } = renderHook(() => useEditorActions(makeRef(null)));
    await expect(result.current.triggerAiCompletion()).resolves.toBeUndefined();
  });
});
