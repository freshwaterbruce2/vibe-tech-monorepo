import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEditorState } from '../../modules/editor/hooks/useEditorState';

// Mock EditorService
vi.mock('../../modules/editor/services/EditorService', () => ({
  EditorService: {
    getInstance: vi.fn(() => ({
      loadFile: vi.fn().mockResolvedValue({
        path: '/test/file.ts',
        content: 'test content',
        language: 'typescript',
        isModified: false,
      }),
      saveFile: vi.fn().mockResolvedValue(undefined),
    })),
  },
}));

describe('useEditorState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useEditorState());
    expect(result.current.state.activeFile).toBeNull();
    expect(result.current.state.openFiles).toEqual([]);
  });

  it('should open a file', async () => {
    const { result } = renderHook(() => useEditorState());

    await act(async () => {
      await result.current.actions.openFile('/test/file.ts');
    });

    expect(result.current.state.activeFile?.path).toBe('/test/file.ts');
    expect(result.current.state.openFiles).toHaveLength(1);
  });

  it('should update file content', async () => {
    const { result } = renderHook(() => useEditorState());

    await act(async () => {
      await result.current.actions.openFile('/test/file.ts');
    });

    act(() => {
      result.current.actions.updateFileContent('/test/file.ts', 'new content');
    });

    expect(result.current.state.activeFile?.content).toBe('new content');
    expect(result.current.state.activeFile?.isModified).toBe(true);
  });

  it('should close a file', async () => {
    const { result } = renderHook(() => useEditorState());

    await act(async () => {
      await result.current.actions.openFile('/test/file.ts');
    });

    act(() => {
      result.current.actions.closeFile('/test/file.ts');
    });

    expect(result.current.state.activeFile).toBeNull();
    expect(result.current.state.openFiles).toHaveLength(0);
  });
});
