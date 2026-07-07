import { describe, it, expect, vi } from 'vitest';

import {
  createCompletionProvider,
  createDefinitionProvider,
  createDocumentSymbolProvider,
  createHoverProvider,
  createReferenceProvider,
  createRenameProvider,
  createSignatureHelpProvider,
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

function clientReturning(result: unknown, reject = false, capabilities: unknown = null): LspClient {
  const request = reject
    ? vi.fn().mockRejectedValue(new Error('relay down'))
    : vi.fn().mockResolvedValue(result);
  return { request, getCapabilities: () => capabilities } as unknown as LspClient;
}

const PREPARE_CAPS = { renameProvider: { prepareProvider: true } };

const deps = (over: Partial<LspProviderDeps> = {}): LspProviderDeps => ({
  getActivePath: () => ACTIVE,
  ...over,
});

const model = {
  uri: { __model: true },
  getWordUntilPosition: () => ({ startColumn: 1, endColumn: 4 }),
  getWordAtPosition: () => ({ word: 'foo', startColumn: 1, endColumn: 4 }),
  getValueInRange: () => 'docText',
};
const position = { lineNumber: 1, column: 1 };
const WORD_RANGE = { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 4 };

function mockMonaco(existingModels: string[] = []): LspMonaco & {
  createModel: ReturnType<typeof vi.fn>;
} {
  const createModel = vi.fn();
  return {
    Uri: { file: (path: string) => ({ __file: path }) },
    editor: {
      getModel: (uri: unknown) =>
        existingModels.includes((uri as { __file: string }).__file) ? {} : null,
      createModel,
    },
    createModel,
    languages: {
      registerHoverProvider: vi.fn(() => ({ dispose: vi.fn() })),
      registerDefinitionProvider: vi.fn(() => ({ dispose: vi.fn() })),
      registerDocumentSymbolProvider: vi.fn(() => ({ dispose: vi.fn() })),
      registerCompletionItemProvider: vi.fn(() => ({ dispose: vi.fn() })),
      registerReferenceProvider: vi.fn(() => ({ dispose: vi.fn() })),
      registerRenameProvider: vi.fn(() => ({ dispose: vi.fn() })),
      registerSignatureHelpProvider: vi.fn(() => ({ dispose: vi.fn() })),
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

  it('creates peek preview models for cross-file targets via deps.readFile', async () => {
    const monaco = mockMonaco();
    const readFile = vi.fn().mockResolvedValue('file b content');
    const provider = createReferenceProvider(
      clientReturning([
        { uri: 'file:///C:/ws/a.ts', range: range(0, 0, 0, 3) },
        { uri: 'file:///C:/ws/b.ts', range: range(4, 0, 4, 3) },
      ]),
      deps({ readFile }),
      monaco
    );
    await provider.provideReferences(model, position, ctx);
    expect(readFile).toHaveBeenCalledWith('C:\\ws\\b.ts');
    expect(readFile).not.toHaveBeenCalledWith(ACTIVE);
    expect(monaco.createModel).toHaveBeenCalledWith('file b content', undefined, {
      __file: 'C:\\ws\\b.ts',
    });
  });

  it('skips preview models that already exist and works without readFile', async () => {
    const monaco = mockMonaco(['C:\\ws\\b.ts']);
    const readFile = vi.fn().mockResolvedValue('x');
    const locations = [{ uri: 'file:///C:/ws/b.ts', range: range(0, 0, 0, 1) }];
    await createReferenceProvider(
      clientReturning(locations),
      deps({ readFile }),
      monaco
    ).provideReferences(model, position, ctx);
    expect(monaco.createModel).not.toHaveBeenCalled();

    const bare = mockMonaco();
    const result = await createReferenceProvider(
      clientReturning(locations),
      deps(),
      bare
    ).provideReferences(model, position, ctx);
    expect(bare.createModel).not.toHaveBeenCalled();
    expect(result).toHaveLength(1); // locations still returned without previews
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

describe('rename provider — resolveRenameLocation (prepareRename)', () => {
  it('falls back to the word when the server lacks prepareRename support', async () => {
    const client = clientReturning({}, false, { renameProvider: true });
    const provider = createRenameProvider(client, deps());
    expect(await provider.resolveRenameLocation(model, position)).toEqual({
      range: WORD_RANGE,
      text: 'foo',
    });
    expect(client.request).not.toHaveBeenCalled();
  });

  it('falls back to the word when there is no active path', async () => {
    const provider = createRenameProvider(
      clientReturning({}, false, PREPARE_CAPS),
      deps({
        getActivePath: () => null,
      })
    );
    expect(await provider.resolveRenameLocation(model, position)).toEqual({
      range: WORD_RANGE,
      text: 'foo',
    });
  });

  it('rejects (with a reason) when unsupported and there is no word at the cursor', async () => {
    const noWordModel = { ...model, getWordAtPosition: () => null };
    const provider = createRenameProvider(clientReturning({}, false, null), deps());
    const location = await provider.resolveRenameLocation(noWordModel, position);
    expect(location.rejectReason).toBe('No renameable symbol at the cursor.');
  });

  it('sends textDocument/prepareRename when supported and maps the placeholder', async () => {
    const client = clientReturning(
      { range: range(0, 6, 0, 9), placeholder: 'oldName' },
      false,
      PREPARE_CAPS
    );
    const provider = createRenameProvider(client, deps());
    expect(await provider.resolveRenameLocation(model, position)).toEqual({
      range: { startLineNumber: 1, startColumn: 7, endLineNumber: 1, endColumn: 10 },
      text: 'oldName',
    });
    expect(client.request).toHaveBeenCalledWith('textDocument/prepareRename', {
      textDocument: { uri: 'file:///C:/ws/a.ts' },
      position: { line: 0, character: 0 },
    });
  });

  it('reads the document text for a bare Range result', async () => {
    const client = clientReturning(range(0, 6, 0, 9), false, PREPARE_CAPS);
    const provider = createRenameProvider(client, deps());
    expect(await provider.resolveRenameLocation(model, position)).toEqual({
      range: { startLineNumber: 1, startColumn: 7, endLineNumber: 1, endColumn: 10 },
      text: 'docText',
    });
  });

  it('rejects the rename when the server answers null', async () => {
    const provider = createRenameProvider(clientReturning(null, false, PREPARE_CAPS), deps());
    const location = await provider.resolveRenameLocation(model, position);
    expect(location.rejectReason).toBe('This element cannot be renamed.');
    expect(location.range).toEqual(WORD_RANGE); // keeps the word range for the widget
  });

  it('falls back to the word when the prepareRename request rejects', async () => {
    const provider = createRenameProvider(clientReturning(null, true, PREPARE_CAPS), deps());
    expect(await provider.resolveRenameLocation(model, position)).toEqual({
      range: WORD_RANGE,
      text: 'foo',
    });
  });

  it('maps a defaultBehavior answer to the word fallback', async () => {
    const client = clientReturning({ defaultBehavior: true }, false, PREPARE_CAPS);
    const provider = createRenameProvider(client, deps());
    expect(await provider.resolveRenameLocation(model, position)).toEqual({
      range: WORD_RANGE,
      text: 'foo',
    });
  });
});

describe('signature help provider', () => {
  const signatureHelp = {
    signatures: [{ label: 'f(a: string): void', parameters: [{ label: 'a: string' }] }],
    activeSignature: 0,
    activeParameter: 0,
  };

  it('advertises default trigger characters until capabilities arrive', () => {
    const provider = createSignatureHelpProvider(clientReturning(signatureHelp), deps());
    expect(provider.signatureHelpTriggerCharacters).toEqual(['(', ',']);
    expect(provider.signatureHelpRetriggerCharacters).toEqual([')']);
  });

  it('reads trigger characters live from server capabilities', () => {
    const caps = {
      signatureHelpProvider: { triggerCharacters: ['<'], retriggerCharacters: ['>', ')'] },
    };
    const provider = createSignatureHelpProvider(
      clientReturning(signatureHelp, false, caps),
      deps()
    );
    expect(provider.signatureHelpTriggerCharacters).toEqual(['<']);
    expect(provider.signatureHelpRetriggerCharacters).toEqual(['>', ')']);
  });

  it('maps a signatureHelp result and requests at the LSP position', async () => {
    const client = clientReturning(signatureHelp);
    const provider = createSignatureHelpProvider(client, deps());
    const result = await provider.provideSignatureHelp(model, position);
    expect(result?.value.signatures[0]?.label).toBe('f(a: string): void');
    expect(() => result?.dispose()).not.toThrow();
    expect(client.request).toHaveBeenCalledWith('textDocument/signatureHelp', {
      textDocument: { uri: 'file:///C:/ws/a.ts' },
      position: { line: 0, character: 0 },
    });
  });

  it('returns null with no active path, on reject, and on an empty result', async () => {
    expect(
      await createSignatureHelpProvider(
        clientReturning(signatureHelp),
        deps({ getActivePath: () => null })
      ).provideSignatureHelp(model, position)
    ).toBeNull();
    expect(
      await createSignatureHelpProvider(clientReturning(null, true), deps()).provideSignatureHelp(
        model,
        position
      )
    ).toBeNull();
    expect(
      await createSignatureHelpProvider(
        clientReturning({ signatures: [] }),
        deps()
      ).provideSignatureHelp(model, position)
    ).toBeNull();
  });
});

describe('registerLspProviders', () => {
  it('registers all seven providers and disposes them together', () => {
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
    expect(monaco.languages.registerSignatureHelpProvider).toHaveBeenCalledWith(
      'typescript',
      expect.any(Object)
    );
    handle.dispose(); // should not throw
  });
});
