/**
 * fileTreeWalker tests
 *
 * The shared recursive workspace walker used by WorkspaceService (indexing)
 * and CodeQualityAnalyzer (project review).
 */

import { describe, it, expect, vi } from 'vitest';
import { walkDirectoryTree, DEFAULT_IGNORED_DIRS } from '../../services/fileTreeWalker';
import type { TreeWalkerFileSystem } from '../../services/fileTreeWalker';
import type { FileSystemItem } from '../../types';

const file = (path: string): FileSystemItem => ({
  path,
  name: path.split('/').pop() ?? path,
  type: 'file',
});

const dir = (path: string): FileSystemItem => ({
  path,
  name: path.split('/').pop() ?? path,
  type: 'directory',
});

const fsFromMap = (dirs: Record<string, FileSystemItem[]>): TreeWalkerFileSystem => ({
  listDirectory: vi.fn(async (path: string) => {
    if (!(path in dirs)) {
      throw new Error(`ENOENT: ${path}`);
    }
    return dirs[path];
  }),
});

describe('walkDirectoryTree', () => {
  it('recurses into subdirectories and attaches children', async () => {
    const fs = fsFromMap({
      '/root': [file('/root/a.ts'), dir('/root/src')],
      '/root/src': [file('/root/src/b.ts'), dir('/root/src/deep')],
      '/root/src/deep': [file('/root/src/deep/c.ts')],
    });

    const tree = await walkDirectoryTree(fs, '/root');

    expect(tree).toHaveLength(2);
    const src = tree.find(e => e.name === 'src');
    expect(src?.children?.map(c => c.name)).toEqual(['b.ts', 'deep']);
    const deep = src?.children?.find(e => e.name === 'deep');
    expect(deep?.children?.map(c => c.path)).toEqual(['/root/src/deep/c.ts']);
  });

  it('skips ignored directories and all dot-entries without listing them', async () => {
    const fs = fsFromMap({
      '/root': [
        file('/root/a.ts'),
        dir('/root/node_modules'),
        dir('/root/dist'),
        dir('/root/.hidden'),
      ],
      '/root/node_modules': [file('/root/node_modules/lib.js')],
    });

    const tree = await walkDirectoryTree(fs, '/root');

    expect(tree.map(e => e.name)).toEqual(['a.ts']);
    expect(fs.listDirectory).not.toHaveBeenCalledWith('/root/node_modules');
    expect(fs.listDirectory).not.toHaveBeenCalledWith('/root/dist');
    expect(fs.listDirectory).not.toHaveBeenCalledWith('/root/.hidden');
  });

  it('stops descending past maxDepth', async () => {
    const dirs: Record<string, FileSystemItem[]> = {};
    let path = '/root';
    for (let depth = 0; depth < 5; depth++) {
      const childDir = `${path}/d${depth}`;
      dirs[path] = [file(`${path}/f${depth}.ts`), dir(childDir)];
      path = childDir;
    }
    dirs[path] = [file(`${path}/last.ts`)];
    const fs = fsFromMap(dirs);

    const tree = await walkDirectoryTree(fs, '/root', { maxDepth: 2 });

    const depth2Dir = tree.find(e => e.name === 'd0')?.children?.find(e => e.name === 'd1');
    expect(depth2Dir?.children?.map(e => e.name)).toEqual(['f2.ts', 'd2']);
    const depth3Dir = depth2Dir?.children?.find(e => e.name === 'd2');
    expect(depth3Dir?.children).toEqual([]);
  });

  it('tolerates unlistable directories by returning [] for them', async () => {
    const fs = fsFromMap({
      '/root': [file('/root/a.ts'), dir('/root/locked')],
      // '/root/locked' missing → listDirectory throws
    });

    const tree = await walkDirectoryTree(fs, '/root');

    expect(tree.map(e => e.name)).toEqual(['a.ts', 'locked']);
    expect(tree.find(e => e.name === 'locked')?.children).toEqual([]);
  });

  it('honors a custom ignoredDirs set', async () => {
    const fs = fsFromMap({
      '/root': [dir('/root/node_modules'), dir('/root/custom')],
      '/root/node_modules': [file('/root/node_modules/lib.js')],
    });

    const tree = await walkDirectoryTree(fs, '/root', { ignoredDirs: new Set(['custom']) });

    expect(tree.map(e => e.name)).toEqual(['node_modules']);
  });

  it('exports the standard exclusion set used across the app', () => {
    for (const name of ['node_modules', '.git', 'dist', 'coverage', 'target']) {
      expect(DEFAULT_IGNORED_DIRS.has(name)).toBe(true);
    }
  });
});
