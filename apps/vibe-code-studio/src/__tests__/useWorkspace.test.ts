import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useWorkspace } from '../hooks/useWorkspace';
import type { WorkspaceFileSystem } from '../services/WorkspaceService';
import type { FileSystemItem } from '../types';

/** In-memory fake so the hook indexes deterministic real content. */
function makeFakeFs(): WorkspaceFileSystem {
  const dirs: Record<string, FileSystemItem[]> = {
    '/proj': [
      { name: 'a.ts', path: '/proj/a.ts', type: 'file' },
      { name: 'b.ts', path: '/proj/b.ts', type: 'file' },
    ],
  };
  const files: Record<string, string> = {
    '/proj/a.ts': "import { b } from './b';\nexport const a = b + 1;\n",
    '/proj/b.ts': 'export const b = 2;\n',
  };
  return {
    async listDirectory(path) {
      return dirs[path] ?? [];
    },
    async readFile(path) {
      if (path in files) return files[path];
      throw new Error('ENOENT');
    },
    async exists(path) {
      return path in files || path in dirs;
    },
  };
}

describe('useWorkspace', () => {
  it('should initialize with default state', () => {
    const { result } = renderHook(() => useWorkspace());

    expect(result.current.workspaceContext).toBeNull();
    expect(result.current.isIndexing).toBe(false);
    expect(result.current.indexingProgress).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('should provide workspace service instance', () => {
    const { result } = renderHook(() => useWorkspace());

    expect(result.current.workspaceService).toBeDefined();
    expect(result.current.workspaceService).toHaveProperty('indexWorkspace');
  });

  it('should provide action functions', () => {
    const { result } = renderHook(() => useWorkspace());

    expect(typeof result.current.indexWorkspace).toBe('function');
    expect(typeof result.current.getRelatedFiles).toBe('function');
    expect(typeof result.current.searchFiles).toBe('function');
    expect(typeof result.current.getFileContext).toBe('function');
    expect(typeof result.current.refreshIndex).toBe('function');
    expect(typeof result.current.clearWorkspace).toBe('function');
  });

  it('should clear workspace', () => {
    const { result } = renderHook(() => useWorkspace());

    // Call clearWorkspace directly without act since it's synchronous
    result.current.clearWorkspace();

    expect(result.current.workspaceContext).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.indexingProgress).toBe(0);
  });

  it('should return empty arrays when no workspace context', () => {
    const { result } = renderHook(() => useWorkspace());

    const relatedFiles = result.current.getRelatedFiles('/test/path');
    const searchResults = result.current.searchFiles('test');
    const fileContext = result.current.getFileContext({
      id: 'test',
      name: 'test.ts',
      path: '/test/test.ts',
      content: '',
      language: 'typescript',
      isModified: false,
    });

    expect(relatedFiles).toEqual([]);
    expect(searchResults).toEqual([]);
    expect(fileContext).toEqual([]);
  });

  it('provides real file content as AI context after indexing', async () => {
    const { result } = renderHook(() => useWorkspace(makeFakeFs()));

    await act(async () => {
      await result.current.indexWorkspace('/proj');
    });

    // Real progress wiring: the service drives indexingProgress to 100 on
    // completion (no simulated ticker), before the delayed reset to 0.
    expect(result.current.indexingProgress).toBe(100);

    const context = result.current.getFileContext({
      id: 'a',
      name: 'a.ts',
      path: '/proj/a.ts',
      content: "import { b } from './b';",
      language: 'typescript',
      isModified: false,
    });

    // current file + related file b.ts, carrying REAL content (not a mock string)
    const related = context.find(c => c.path === '/proj/b.ts');
    expect(related).toBeDefined();
    expect(related?.content).toContain('export const b');
    expect(related?.content).not.toContain('Mock content');
  });
});
