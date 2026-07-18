import { beforeEach, describe, expect, it } from 'vitest';
import { WorkspaceService } from '../../services/WorkspaceService';
import type { WorkspaceFileSystem } from '../../services/WorkspaceService';
import type { FileSystemItem } from '../../types';

/**
 * WorkspaceService must index the REAL filesystem (not fabricated data) since its
 * output feeds AI chat context. These tests inject a fake WorkspaceFileSystem to
 * verify real tree walking, content parsing, dependency resolution, and previews.
 */
class FakeFs implements WorkspaceFileSystem {
  constructor(
    private readonly files: Record<string, string>,
    private readonly dirs: Record<string, FileSystemItem[]>,
    private readonly throwListFor: Set<string> = new Set(),
    private readonly throwExistsFor: Set<string> = new Set()
  ) {}

  async listDirectory(path: string): Promise<FileSystemItem[]> {
    if (this.throwListFor.has(path)) throw new Error(`EACCES ${path}`);
    return this.dirs[path] ?? [];
  }

  async readFile(path: string): Promise<string> {
    if (path in this.files) return this.files[path];
    throw new Error(`ENOENT ${path}`);
  }

  async exists(path: string): Promise<boolean> {
    if (this.throwExistsFor.has(path)) throw new Error(`EACCES ${path}`);
    return path in this.files || path in this.dirs;
  }
}

const ROOT = '/ws';

function dir(name: string, path: string): FileSystemItem {
  return { name, path, type: 'directory' };
}
function file(name: string, path: string, size?: number): FileSystemItem {
  return { name, path, type: 'file', size };
}

function buildFs(): FakeFs {
  const dirs: Record<string, FileSystemItem[]> = {
    [ROOT]: [
      dir('src', '/ws/src'),
      dir('node_modules', '/ws/node_modules'),
      dir('.git', '/ws/.git'),
      dir('broken', '/ws/broken'),
      file('package.json', '/ws/package.json'),
      file('README.md', '/ws/README.md'),
    ],
    '/ws/src': [
      file('a.ts', '/ws/src/a.ts'),
      file('b.ts', '/ws/src/b.ts'),
      file('logo.png', '/ws/src/logo.png'),
      file('missing.ts', '/ws/src/missing.ts'), // listed but unreadable
    ],
    '/ws/node_modules': [file('dep.js', '/ws/node_modules/dep.js')],
    '/ws/.git': [file('config', '/ws/.git/config')],
  };
  const files: Record<string, string> = {
    '/ws/package.json': JSON.stringify({
      name: 'demo',
      main: 'src/a.ts',
      dependencies: { react: '^19.0.0' },
    }),
    '/ws/README.md': '# Demo\n\nReal readme.',
    '/ws/src/a.ts':
      "import { b } from './b';\nexport const a = 1;\nexport function foo() {\n  if (a) { return b; }\n}\n",
    '/ws/src/b.ts': 'export const b = 2;\n',
  };
  return new FakeFs(files, dirs, new Set(['/ws/broken']), new Set(['/ws/tsconfig.json']));
}

describe('WorkspaceService — real filesystem indexing', () => {
  let svc: WorkspaceService;

  beforeEach(() => {
    svc = new WorkspaceService(buildFs());
  });

  it('indexes real files and skips node_modules / dot-dirs / unreadable dirs', async () => {
    const ctx = await svc.indexWorkspace(ROOT);

    const paths = Array.from(
      (svc as unknown as { index: { files: Map<string, unknown> } }).index.files.keys()
    );
    expect(paths).toContain('/ws/src/a.ts');
    expect(paths).toContain('/ws/src/b.ts');
    expect(paths).toContain('/ws/package.json');
    // build/dep + VCS dirs excluded
    expect(paths.some(p => p.includes('node_modules'))).toBe(false);
    expect(paths.some(p => p.includes('.git'))).toBe(false);
    // context reflects real languages
    expect(ctx.languages).toContain('typescript');
    expect(ctx.rootPath).toBe(ROOT);
    expect(svc.isIndexed()).toBe(true);
  });

  it('reports real, monotonic phase progress to the onProgress callback', async () => {
    const seen: number[] = [];
    await svc.indexWorkspace(ROOT, p => seen.push(p));

    // Progress is driven by real stage completion — starts at 0, ends at 100,
    // and never regresses (no simulated/random ticking).
    expect(seen[0]).toBe(0);
    expect(seen[seen.length - 1]).toBe(100);
    for (let i = 1; i < seen.length; i++) {
      expect(seen[i]).toBeGreaterThanOrEqual(seen[i - 1]);
    }
  });

  it('parses real imports, exports, symbols, and complexity from code files', async () => {
    await svc.indexWorkspace(ROOT);
    const a = svc.getFileContent('/ws/src/a.ts');

    expect(a).not.toBeNull();
    expect(a?.imports).toContain('./b');
    expect(a?.exports).toEqual(expect.arrayContaining(['a', 'foo']));
    expect(a?.symbols).toEqual(expect.arrayContaining(['a', 'foo']));
    expect(a?.complexity).toBeGreaterThan(1); // has an `if`
    expect(a?.size).toBeGreaterThan(0);
  });

  it('resolves relative dependencies between files', async () => {
    await svc.indexWorkspace(ROOT);
    const related = svc.getRelatedFiles('/ws/src/a.ts');
    expect(related).toContain('/ws/src/b.ts');
  });

  it('captures a real content preview for AI context', async () => {
    await svc.indexWorkspace(ROOT);
    expect(svc.getFileContentPreview('/ws/src/a.ts')).toContain('export const a');
    expect(svc.getFileContentPreview('/ws/does-not-exist')).toBe('');
  });

  it('skips binary files and tolerates unreadable files without throwing', async () => {
    await svc.indexWorkspace(ROOT);
    const png = svc.getFileContent('/ws/src/logo.png');
    const missing = svc.getFileContent('/ws/src/missing.ts');
    // png: not a code extension -> present but no parsed content
    expect(png?.imports).toEqual([]);
    expect(svc.getFileContentPreview('/ws/src/logo.png')).toBe('');
    // missing.ts: read failed -> graceful empty analysis, no preview
    expect(missing).not.toBeNull();
    expect(svc.getFileContentPreview('/ws/src/missing.ts')).toBe('');
  });

  it('reflects real project structure (package.json parsed) in the context summary', async () => {
    const ctx = await svc.indexWorkspace(ROOT);
    const structure = ctx.projectStructure as { packageJson?: { name?: string } };
    expect(structure.packageJson?.name).toBe('demo');
    expect(ctx.summary).toContain('files');
  });

  it('searches indexed files by name/symbol', async () => {
    await svc.indexWorkspace(ROOT);
    const results = svc.searchFiles('foo');
    expect(results.some(r => r.path === '/ws/src/a.ts')).toBe(true);
  });

  it('exposes index stats', async () => {
    await svc.indexWorkspace(ROOT);
    const stats = svc.getIndexStats();
    expect(stats.totalFiles).toBeGreaterThan(0);
    expect(stats.isIndexing).toBe(false);
  });
});

describe('WorkspaceService — file cap', () => {
  it('caps analysis at MAX_FILES and keeps working', async () => {
    const OVER = 4001;
    const entries: FileSystemItem[] = [];
    const files: Record<string, string> = {};
    for (let i = 0; i < OVER; i++) {
      const p = `/big/f${i}.ts`;
      entries.push({ name: `f${i}.ts`, path: p, type: 'file' });
      files[p] = `export const v${i} = ${i};`;
    }
    const svc = new WorkspaceService(new FakeFs(files, { '/big': entries }));

    const ctx = await svc.indexWorkspace('/big');
    expect(ctx.totalFiles).toBe(4000); // capped
  });
});
