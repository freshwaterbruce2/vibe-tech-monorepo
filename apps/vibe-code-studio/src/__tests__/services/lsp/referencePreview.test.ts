import { describe, expect, it, vi } from 'vitest';

import {
  crossFileTargetPaths,
  ensurePreviewModels,
  type PreviewMonaco,
} from '../../../services/lsp/referencePreview';

const ACTIVE = 'C:\\ws\\a.ts';
const range = {
  start: { line: 0, character: 0 },
  end: { line: 0, character: 1 },
};
const targets = [
  { uri: 'file:///C:/ws/a.ts', range }, // active file → skipped
  { uri: 'file:///C:/ws/b.ts', range },
  { uri: 'file:///C:/ws/b.ts', range }, // duplicate → deduped
  { uri: 'file:///C:/ws/c.ts', range },
];

function mockMonaco(existing: string[] = []): PreviewMonaco & {
  createModel: ReturnType<typeof vi.fn>;
} {
  const createModel = vi.fn();
  return {
    Uri: { file: (path: string) => ({ path }) },
    editor: {
      getModel: (uri: unknown) => (existing.includes((uri as { path: string }).path) ? {} : null),
      createModel,
    },
    createModel,
  };
}

describe('crossFileTargetPaths', () => {
  it('dedupes and excludes the active file', () => {
    expect(crossFileTargetPaths(targets, ACTIVE)).toEqual(['C:\\ws\\b.ts', 'C:\\ws\\c.ts']);
  });

  it('returns empty for same-file-only targets', () => {
    expect(crossFileTargetPaths([{ uri: 'file:///C:/ws/a.ts', range }], ACTIVE)).toEqual([]);
  });
});

describe('ensurePreviewModels', () => {
  it('creates a model per readable cross-file target', async () => {
    const monaco = mockMonaco();
    const readFile = vi.fn().mockResolvedValue('content');
    await ensurePreviewModels(monaco, targets, ACTIVE, readFile);
    expect(readFile).toHaveBeenCalledTimes(2);
    expect(monaco.createModel).toHaveBeenCalledWith('content', undefined, {
      path: 'C:\\ws\\b.ts',
    });
    expect(monaco.createModel).toHaveBeenCalledWith('content', undefined, {
      path: 'C:\\ws\\c.ts',
    });
  });

  it('skips URIs that already have a model', async () => {
    const monaco = mockMonaco(['C:\\ws\\b.ts']);
    const readFile = vi.fn().mockResolvedValue('content');
    await ensurePreviewModels(monaco, targets, ACTIVE, readFile);
    expect(readFile).toHaveBeenCalledTimes(1);
    expect(monaco.createModel).toHaveBeenCalledTimes(1);
    expect(monaco.createModel).toHaveBeenCalledWith('content', undefined, {
      path: 'C:\\ws\\c.ts',
    });
  });

  it('is a no-op without a readFile dependency', async () => {
    const monaco = mockMonaco();
    await ensurePreviewModels(monaco, targets, ACTIVE, undefined);
    expect(monaco.createModel).not.toHaveBeenCalled();
  });

  it('swallows read rejections and skips non-string content', async () => {
    const monaco = mockMonaco();
    const readFile = vi
      .fn()
      .mockRejectedValueOnce(new Error('denied'))
      .mockResolvedValueOnce(undefined);
    await expect(ensurePreviewModels(monaco, targets, ACTIVE, readFile)).resolves.toBeUndefined();
    expect(monaco.createModel).not.toHaveBeenCalled();
  });
});
