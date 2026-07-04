import { describe, it, expect } from 'vitest';

import { isSupportedLanguage, resolveServer } from '../../../scripts/lib/lsp-servers.js';

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

describe('isSupportedLanguage', () => {
  it('reports membership', () => {
    expect(isSupportedLanguage('rust')).toBe(true);
    expect(isSupportedLanguage('cobol')).toBe(false);
  });
});
