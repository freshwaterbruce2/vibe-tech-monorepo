import { describe, it, expect, vi } from 'vitest';

import {
  createCompletionProvider,
  createDefinitionProvider,
  createDocumentSymbolProvider,
  createHoverProvider,
  createReferenceProvider,
  createRenameProvider,
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

const model = {
  uri: { __model: true },
  getWordUntilPosition: () => ({ startColumn: 1, endColumn: 4 }),
};
const position = { lineNumber: 1, column: 1 };

function mockMonaco(): LspMonaco {
  return {
    Uri: { file: (path: string) => ({ __file: path }) },
    languages: {
      registerHoverProvider: vi.fn(() => ({ dispose: vi.fn() })),
      registerDefinitionProvider: vi.fn(() => ({ dispose: vi.fn() })),
      registerDocumentSymbolProvider: vi.fn(() => ({ dispose: vi.fn() })),
      registerCompletionItemProvider: vi.fn(() => ({ dispose: vi.fn() })),
      registerReferenceProvider: vi.fn(() => ({ dispose: vi.fn() })),
      registerRenameProvider: vi.fn(() => ({ dispose: vi.fn() })),
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

describe('completion provider', () => {
  it('returns empty suggestions with no active path or no word', async () => {
    expect(
      await createCompletionProvider(
        clientReturning([]),
        deps({ getActivePath: () => null })
      ).provideCompletionItems(model, position)
    ).toEqual({ suggestions: [] });
    const noWordModel = { uri: {}, getWordUntilPosition: undefined };
    expect(
      await createCompletionProvider(clientReturning([]), deps()).provideCompletionItems(
        noWordModel as never,
        position
      )
    ).toEqual({ suggestions: [] });
  });

  it('maps completion items over the word range', async () => {
    const provider = createCompletionProvider(clientReturning([{ label: 'foo', kind: 3 }]), deps());
    const result = await provider.provideCompletionItems(model, position);
    expect(result.suggestions[0]).toMatchObject({
      label: 'foo',
      insertText: 'foo',
      range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 4 },
    });
  });

  it('returns empty suggestions when the relay rejects', async () => {
    const provider = createCompletionProvider(clientReturning(null, true), deps());
    expect(await provider.provideCompletionItems(model, position)).toEqual({ suggestions: [] });
  });

  it('advertises trigger characters', () => {
    expect(createCompletionProvider(clientReturning([]), deps()).triggerCharacters).toContain('.');
  });
});

describe('reference provider', () => {
  const ctx = { includeDeclaration: true };

  it('returns null with no active path, on reject, and on empty', async () => {
    expect(
      await createReferenceProvider(
        clientReturning([]),
        deps({ getActivePath: () => null }),
        mockMonaco()
      ).provideReferences(model, position, ctx)
    ).toBeNull();
    expect(
      await createReferenceProvider(
        clientReturning(null, true),
        deps(),
        mockMonaco()
      ).provideReferences(model, position, ctx)
    ).toBeNull();
    expect(
      await createReferenceProvider(clientReturning([]), deps(), mockMonaco()).provideReferences(
        model,
        position,
        ctx
      )
    ).toBeNull();
  });

  it('maps same-file and cross-file reference locations', async () => {
    const provider = createReferenceProvider(
      clientReturning([
        { uri: 'file:///C:/ws/a.ts', range: range(0, 0, 0, 3) },
        { uri: 'file:///C:/ws/b.ts', range: range(4, 0, 4, 3) },
      ]),
      deps(),
      mockMonaco()
    );
    const result = await provider.provideReferences(model, position, ctx);
    expect(result?.[0]?.uri).toBe(model.uri); // same file → active model uri
    expect(result?.[1]?.uri).toEqual({ __file: 'C:\\ws\\b.ts' }); // cross-file → file uri
  });

  it('defaults includeDeclaration when context is undefined', async () => {
    const client = clientReturning([{ uri: 'file:///C:/ws/a.ts', range: range(0, 0, 0, 1) }]);
    await createReferenceProvider(client, deps(), mockMonaco()).provideReferences(
      model,
      position,
      undefined as never
    );
    const sent = (client.request as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(sent.context).toEqual({ includeDeclaration: true });
  });
});

describe('rename provider', () => {
  const workspaceEdit = {
    changes: { 'file:///C:/ws/b.ts': [{ range: range(0, 4, 0, 7), newText: 'bar' }] },
  };

  it('returns null with no active path, on reject, and on an empty workspace edit', async () => {
    expect(
      await createRenameProvider(
        clientReturning(workspaceEdit),
        deps({ getActivePath: () => null })
      ).provideRenameEdits(model, position, 'bar')
    ).toBeNull();
    expect(
      await createRenameProvider(clientReturning(null, true), deps()).provideRenameEdits(
        model,
        position,
        'bar'
      )
    ).toBeNull();
    expect(
      await createRenameProvider(clientReturning({}), deps()).provideRenameEdits(
        model,
        position,
        'bar'
      )
    ).toBeNull();
  });

  it('sends textDocument/rename with the new name at the LSP position', async () => {
    const client = clientReturning(workspaceEdit);
    await createRenameProvider(client, deps()).provideRenameEdits(model, position, 'bar');
    expect(client.request).toHaveBeenCalledWith('textDocument/rename', {
      textDocument: { uri: 'file:///C:/ws/a.ts' },
      position: { line: 0, character: 0 },
      newName: 'bar',
    });
  });

  it('routes the mapped edits to requestRename and returns an empty WorkspaceEdit', async () => {
    const requestRename = vi.fn();
    const provider = createRenameProvider(clientReturning(workspaceEdit), deps({ requestRename }));
    expect(await provider.provideRenameEdits(model, position, 'bar')).toEqual({ edits: [] });
    expect(requestRename).toHaveBeenCalledWith('bar', [
      {
        path: 'C:\\ws\\b.ts',
        edits: [{ range: range(0, 4, 0, 7), newText: 'bar' }],
      },
    ]);
  });

  it('still resolves when no requestRename dep is installed', async () => {
    const provider = createRenameProvider(clientReturning(workspaceEdit), deps());
    expect(await provider.provideRenameEdits(model, position, 'bar')).toEqual({ edits: [] });
  });
});

describe('registerLspProviders', () => {
  it('registers all six providers and disposes them together', () => {
    const monaco = mockMonaco();
    const handle = registerLspProviders(monaco, 'typescript', clientReturning({}), deps());
    expect(monaco.languages.registerHoverProvider).toHaveBeenCalledWith(
      'typescript',
      expect.any(Object)
    );
    expect(monaco.languages.registerDefinitionProvider).toHaveBeenCalled();
    expect(monaco.languages.registerDocumentSymbolProvider).toHaveBeenCalled();
    expect(monaco.languages.registerCompletionItemProvider).toHaveBeenCalled();
    expect(monaco.languages.registerReferenceProvider).toHaveBeenCalled();
    expect(monaco.languages.registerRenameProvider).toHaveBeenCalledWith(
      'typescript',
      expect.any(Object)
    );
    handle.dispose(); // should not throw
  });
});
