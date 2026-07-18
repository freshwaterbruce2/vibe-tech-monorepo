import { describe, it, expect, vi } from 'vitest';

import {
  buildSpawnCommand,
  findExecutable,
  isSupportedLanguage,
  resolveServer,
} from '../../../scripts/lib/lsp-servers.js';

describe('resolveServer', () => {
  it('resolves the TS server for typescript/javascript/react ids', () => {
    for (const id of ['typescript', 'javascript', 'typescriptreact', 'javascriptreact']) {
      expect(resolveServer(id)).toEqual({
        command: 'typescript-language-server',
        args: ['--stdio'],
      });
    }
  });

  it('resolves pyright for python and rust-analyzer for rust', () => {
    expect(resolveServer('python')).toEqual({ command: 'pyright-langserver', args: ['--stdio'] });
    expect(resolveServer('rust')).toEqual({ command: 'rust-analyzer', args: [] });
  });

  it('returns null for an unsupported language (no TS fallback)', () => {
    expect(resolveServer('cobol')).toBeNull();
  });

  it('rewrites the command to a workspace bin when it exists there', () => {
    const exists = (p: string) =>
      p === 'C:\\ws\\node_modules\\.bin\\typescript-language-server.cmd';
    expect(resolveServer('typescript', { binDir: 'C:\\ws\\node_modules\\.bin', exists })).toEqual({
      command: 'C:\\ws\\node_modules\\.bin\\typescript-language-server.cmd',
      args: ['--stdio'],
    });
  });

  it('keeps the bare command when no workspace bin matches', () => {
    expect(resolveServer('typescript', { binDir: 'C:\\ws\\.bin', exists: () => false })).toEqual({
      command: 'typescript-language-server',
      args: ['--stdio'],
    });
  });
});

describe('resolveServer with PATH scanning (opts.paths)', () => {
  it('rewrites the command to the first executable found on the paths', () => {
    const exists = (p: string) => p === 'C:\\b\\typescript-language-server.cmd';
    expect(
      resolveServer('typescript', { paths: ['C:\\a', 'C:\\b'], exts: ['.cmd', '.exe'], exists })
    ).toEqual({ command: 'C:\\b\\typescript-language-server.cmd', args: ['--stdio'] });
  });

  it('falls through to the bare command when nothing on the paths matches', () => {
    expect(
      resolveServer('rust', {
        paths: ['C:\\a', 'C:\\b'],
        exts: ['.cmd', '.exe'],
        exists: () => false,
      })
    ).toEqual({ command: 'rust-analyzer', args: [] });
  });

  it('returns null when an installed build requires a verified executable', () => {
    expect(
      resolveServer('typescript', {
        paths: ['V:\\Apps\\Vibe_Code_Studio'],
        exts: ['.cmd', '.exe'],
        exists: () => false,
        requireResolved: true,
      })
    ).toBeNull();
  });

  it('prefers a paths match over a binDir match', () => {
    const exists = (p: string) =>
      p === 'C:\\path\\pyright-langserver.cmd' || p === 'C:\\bin\\pyright-langserver.cmd';
    expect(
      resolveServer('python', { paths: ['C:\\path'], exts: ['.cmd'], binDir: 'C:\\bin', exists })
    ).toEqual({ command: 'C:\\path\\pyright-langserver.cmd', args: ['--stdio'] });
  });

  it('uses the legacy binDir probe when the paths yield nothing', () => {
    const exists = (p: string) => p === 'C:\\bin\\pyright-langserver.exe';
    expect(
      resolveServer('python', { paths: ['C:\\nowhere'], exts: ['.cmd'], binDir: 'C:\\bin', exists })
    ).toEqual({ command: 'C:\\bin\\pyright-langserver.exe', args: ['--stdio'] });
  });
});

describe('findExecutable', () => {
  it('finds a .cmd shim in the second directory scanned', () => {
    const exists = (p: string) => p === 'C:\\b\\tsserver.cmd';
    expect(findExecutable('tsserver', { paths: ['C:\\a', 'C:\\b'], exts: ['.cmd'], exists })).toBe(
      'C:\\b\\tsserver.cmd'
    );
  });

  it('finds an .exe when that extension is probed', () => {
    const exists = (p: string) => p === 'C:\\a\\rust-analyzer.exe';
    expect(
      findExecutable('rust-analyzer', { paths: ['C:\\a'], exts: ['.cmd', '.exe'], exists })
    ).toBe('C:\\a\\rust-analyzer.exe');
  });

  it('probes extensions in order within a directory (.cmd wins over .exe)', () => {
    const exists = () => true; // every candidate "exists"
    expect(findExecutable('tool', { paths: ['C:\\a'], exts: ['.cmd', '.exe'], exists })).toBe(
      'C:\\a\\tool.cmd'
    );
  });

  it('exhausts every extension in a directory before moving to the next one', () => {
    const exists = (p: string) => p === 'C:\\a\\tool.exe' || p === 'C:\\b\\tool.cmd';
    expect(
      findExecutable('tool', { paths: ['C:\\a', 'C:\\b'], exts: ['.cmd', '.exe'], exists })
    ).toBe('C:\\a\\tool.exe');
  });

  it('returns null when no candidate exists', () => {
    expect(
      findExecutable('missing', { paths: ['C:\\a', 'C:\\b'], exts: ['.cmd'], exists: () => false })
    ).toBeNull();
  });

  it('returns null without an exists predicate (no I/O fallback)', () => {
    expect(findExecutable('tool', { paths: ['C:\\a'], exts: ['.cmd'] })).toBeNull();
    expect(findExecutable('tool')).toBeNull();
  });

  it('skips empty/falsy path entries without probing them', () => {
    const exists = vi.fn((p: string) => p === 'C:\\real\\tool.cmd');
    expect(findExecutable('tool', { paths: ['', 'C:\\real'], exts: ['.cmd'], exists })).toBe(
      'C:\\real\\tool.cmd'
    );
    expect(exists).toHaveBeenCalledTimes(1);
    expect(exists).toHaveBeenCalledWith('C:\\real\\tool.cmd');
  });

  it('supports posix paths via sep + the default single empty extension', () => {
    const exists = (p: string) => p === '/usr/local/bin/rust-analyzer';
    expect(findExecutable('rust-analyzer', { paths: ['/usr/local/bin'], exists, sep: '/' })).toBe(
      '/usr/local/bin/rust-analyzer'
    );
  });
});

describe('buildSpawnCommand', () => {
  it('quotes .cmd shims and requests a shell (CVE-2024-27980 behavior)', () => {
    const spec = { command: 'C:\\ws\\.bin\\typescript-language-server.cmd', args: ['--stdio'] };
    expect(buildSpawnCommand(spec)).toEqual({
      command: '"C:\\ws\\.bin\\typescript-language-server.cmd"',
      args: ['--stdio'],
      options: { windowsHide: true, shell: true },
    });
  });

  it('treats batch extensions case-insensitively (.BAT)', () => {
    const spec = { command: 'C:\\tools\\SERVER.BAT', args: [] };
    const built = buildSpawnCommand(spec);
    expect(built.command).toBe('"C:\\tools\\SERVER.BAT"');
    expect(built.options).toEqual({ windowsHide: true, shell: true });
  });

  it('spawns real .exe binaries directly — unquoted, no shell', () => {
    const spec = { command: 'C:\\tools\\rust-analyzer.exe', args: [] };
    expect(buildSpawnCommand(spec)).toEqual({
      command: 'C:\\tools\\rust-analyzer.exe',
      args: [],
      options: { windowsHide: true },
    });
  });

  it('leaves bare PATH commands unquoted with no shell', () => {
    const spec = { command: 'typescript-language-server', args: ['--stdio'] };
    const built = buildSpawnCommand(spec);
    expect(built.command).toBe('typescript-language-server');
    expect(built.options).toEqual({ windowsHide: true });
  });
});

describe('isSupportedLanguage', () => {
  it('reports membership', () => {
    expect(isSupportedLanguage('rust')).toBe(true);
    expect(isSupportedLanguage('cobol')).toBe(false);
  });
});
