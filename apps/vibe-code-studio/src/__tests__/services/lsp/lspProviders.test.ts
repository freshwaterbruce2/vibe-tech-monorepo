import { describe, it, expect, vi } from 'vitest';

import {
  createDefinitionProvider,
  createDocumentSymbolProvider,
  createHoverProvider,
  registerLspProviders,
  type LspMonaco,
  type LspProviderDeps,
} from '../../../services/lsp/lspProviders';
import type { LspClient } from '../../../services/lsp/lspClient';

const ACTIVE = 'C:\\ws\\a.ts';
const range = (sl: number, sc: number, el: number, ec: number) => ({
  start: { line: sl, character: sc },
  end: { line: el, character: ec },
});

function clientReturning(result: unknown, reject = false): LspClient {
  const request = reject
    ? vi.fn().mockRejectedValue(new Error('relay down'))
    : vi.fn().mockResolvedValue(result);
  return { request } as unknown as LspClient;
}

const deps = (over: Partial<LspProviderDeps> = {}): LspProviderDeps => ({
  getActivePath: () => ACTIVE,
  ...over,
});

const model = { uri: { __model: true } };
const position = { lineNumber: 1, column: 1 };

function mockMonaco(): LspMonaco {
  return {
    Uri: { file: (path: string) => ({ __file: path }) },
    languages: {
      registerHoverProvider: vi.fn(() => ({ dispose: vi.fn() })),
      registerDefinitionProvider: vi.fn(() => ({ dispose: vi.fn() })),
      registerDocumentSymbolProvider: vi.fn(() => ({ dispose: vi.fn() })),
    },
  };
}

describe('hover provider', () => {
  it('returns null when there is no active path', async () => {
    const provider = createHoverProvider(clientReturning({}), deps({ getActivePath: () => null }));
    expect(await provider.provideHover(model, position)).toBeNull();
  });

  it('maps a hover result', async () => {
    const provider = createHoverProvider(clientReturning({ contents: 'docs' }), deps());
    expect(await provider.provideHover(model, position)).toEqual({ contents: [{ value: 'docs' }] });
  });

  it('falls back to null when the relay rejects', async () => {
    const provider = createHoverProvider(clientReturning(null, true), deps());
    expect(await provider.provideHover(model, position)).toBeNull();
  });
});

describe('definition provider', () => {
  it('returns null with no active path, on reject, and on empty result', async () => {
    expect(
      await createDefinitionProvider(
        clientReturning([]),
        deps({ getActivePath: () => null }),
        mockMonaco()
      ).provideDefinition(model, position)
    ).toBeNull();
    expect(
      await createDefinitionProvider(
        clientReturning(null, true),
        deps(),
        mockMonaco()
      ).provideDefinition(model, position)
    ).toBeNull();
    expect(
      await createDefinitionProvider(clientReturning([]), deps(), mockMonaco()).provideDefinition(
        model,
        position
      )
    ).toBeNull();
  });

  it('returns the active model uri for a same-file target', async () => {
    const provider = createDefinitionProvider(
      clientReturning([{ uri: 'file:///C:/ws/a.ts', range: range(4, 2, 4, 6) }]),
      deps(),
      mockMonaco()
    );
    const result = await provider.provideDefinition(model, position);
    expect(result).toEqual([
      {
        uri: model.uri,
        range: { startLineNumber: 5, startColumn: 3, endLineNumber: 5, endColumn: 7 },
      },
    ]);
  });

  it('delegates a cross-file target to openLocation', async () => {
    const openLocation = vi.fn();
    const provider = createDefinitionProvider(
      clientReturning([{ uri: 'file:///C:/ws/b.ts', range: range(1, 0, 1, 3) }]),
      deps({ openLocation }),
      mockMonaco()
    );
    expect(await provider.provideDefinition(model, position)).toBeNull();
    expect(openLocation).toHaveBeenCalledWith('C:\\ws\\b.ts', {
      startLineNumber: 2,
      startColumn: 1,
      endLineNumber: 2,
      endColumn: 4,
    });
  });

  it('returns a file uri for a cross-file target when no opener is provided', async () => {
    const provider = createDefinitionProvider(
      clientReturning([{ uri: 'file:///C:/ws/b.ts', range: range(0, 0, 0, 1) }]),
      deps(),
      mockMonaco()
    );
    const result = await provider.provideDefinition(model, position);
    expect(result).toEqual([{ uri: { __file: 'C:\\ws\\b.ts' }, range: expect.any(Object) }]);
  });
});

describe('document symbol provider', () => {
  it('returns null with no active path and on reject', async () => {
    expect(
      await createDocumentSymbolProvider(
        clientReturning([]),
        deps({ getActivePath: () => null })
      ).provideDocumentSymbols(model)
    ).toBeNull();
    expect(
      await createDocumentSymbolProvider(
        clientReturning(null, true),
        deps()
      ).provideDocumentSymbols(model)
    ).toBeNull();
  });

  it('maps document symbols', async () => {
    const provider = createDocumentSymbolProvider(
      clientReturning([
        { name: 'Foo', kind: 5, range: range(0, 0, 2, 0), selectionRange: range(0, 6, 0, 9) },
      ]),
      deps()
    );
    const result = await provider.provideDocumentSymbols(model);
    expect(result?.[0]).toMatchObject({ name: 'Foo', kind: 4 });
  });
});

describe('registerLspProviders', () => {
  it('registers all three providers and disposes them together', () => {
    const monaco = mockMonaco();
    const handle = registerLspProviders(monaco, 'typescript', clientReturning({}), deps());
    expect(monaco.languages.registerHoverProvider).toHaveBeenCalledWith(
      'typescript',
      expect.any(Object)
    );
    expect(monaco.languages.registerDefinitionProvider).toHaveBeenCalled();
    expect(monaco.languages.registerDocumentSymbolProvider).toHaveBeenCalled();
    handle.dispose(); // should not throw
  });
});
