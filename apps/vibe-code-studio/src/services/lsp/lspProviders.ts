/**
 * Monaco language-feature providers backed by the hand-rolled LSP client
 * (spec 07 Phase 1b + polish): hover, go-to-definition, document symbols
 * (outline), completion, references (with cross-file peek preview), rename
 * (with prepareRename validation), and signature help.
 *
 * Each provider resolves the active document path via an injected `getActivePath`
 * (this app shows one file at a time, so the active model === currentFile) and
 * degrades to `null` — i.e. Monaco's built-in behavior — whenever LSP is
 * unavailable or the relay request rejects (matches Phase 1a's fallback).
 */

import type { LspClient } from './lspClient';
import {
  signatureHelpRetriggerCharacters,
  signatureHelpTriggerCharacters,
  supportsPrepareRename,
} from './lspCapabilities';
import {
  cursorRange,
  interpretPrepareRename,
  resolveRenameLocation,
  type MonacoRenameLocation,
} from './lspPrepareRename';
import { signatureHelpToMonaco, type MonacoSignatureHelp } from './lspSignatureHelp';
import { ensurePreviewModels } from './referencePreview';
import { workspaceEditToFileEdits, type RenameFileEdits } from './lspRename';
import { filePathToUri, uriToFilePath } from './uri';
import {
  completionToMonaco,
  definitionTargets,
  documentSymbolsToMonaco,
  hoverToMonaco,
  lspRangeToMonaco,
  positionParams,
  toLspPosition,
  type MonacoCompletionList,
  type MonacoDocumentSymbol,
  type MonacoHover,
  type MonacoPosition,
  type MonacoRange,
} from './lspNavigation';

export interface LspProviderDeps {
  /** Path of the file backing the active model (single-editor app → currentFile). */
  getActivePath: () => string | null;
  /** Open a target file at a range — used for cross-file go-to-definition/references. */
  openLocation?: (path: string, range: MonacoRange) => void;
  /** Route a rename WorkspaceEdit into the app's multi-file preview/apply flow. */
  requestRename?: (newName: string, fileEdits: RenameFileEdits[]) => void;
  /** Read a file's content — used to build peek preview models for cross-file refs. */
  readFile?: (path: string) => Promise<string | undefined>;
}

interface MonacoModel {
  uri: unknown;
  getWordUntilPosition?: (position: MonacoPosition) => { startColumn: number; endColumn: number };
  getWordAtPosition?: (
    position: MonacoPosition
  ) => { word: string; startColumn: number; endColumn: number } | null;
  getValueInRange?: (range: MonacoRange) => string;
}

interface ReferenceContext {
  includeDeclaration?: boolean;
}

interface MonacoLocation {
  uri: unknown;
  range: MonacoRange;
}

export interface MonacoDisposable {
  dispose: () => void;
}

/** The slice of the Monaco namespace these providers need. */
export interface LspMonaco {
  Uri: { file: (path: string) => unknown };
  editor: {
    getModel: (uri: unknown) => unknown;
    createModel: (value: string, language: string | undefined, uri: unknown) => unknown;
  };
  languages: {
    registerHoverProvider: (languageId: string, provider: unknown) => MonacoDisposable;
    registerDefinitionProvider: (languageId: string, provider: unknown) => MonacoDisposable;
    registerDocumentSymbolProvider: (languageId: string, provider: unknown) => MonacoDisposable;
    registerCompletionItemProvider: (languageId: string, provider: unknown) => MonacoDisposable;
    registerReferenceProvider: (languageId: string, provider: unknown) => MonacoDisposable;
    registerRenameProvider: (languageId: string, provider: unknown) => MonacoDisposable;
    registerSignatureHelpProvider: (languageId: string, provider: unknown) => MonacoDisposable;
  };
}

export function createHoverProvider(client: LspClient, deps: LspProviderDeps) {
  return {
    async provideHover(_model: MonacoModel, position: MonacoPosition): Promise<MonacoHover | null> {
      const path = deps.getActivePath();
      if (!path) return null;
      try {
        const result = await client.request(
          'textDocument/hover',
          positionParams(filePathToUri(path), position)
        );
        return hoverToMonaco(result);
      } catch {
        return null; // relay down → Monaco built-in hover
      }
    },
  };
}

export function createDefinitionProvider(
  client: LspClient,
  deps: LspProviderDeps,
  monaco: LspMonaco
) {
  return {
    async provideDefinition(
      model: MonacoModel,
      position: MonacoPosition
    ): Promise<MonacoLocation[] | null> {
      const path = deps.getActivePath();
      if (!path) return null;
      let result: unknown;
      try {
        result = await client.request(
          'textDocument/definition',
          positionParams(filePathToUri(path), position)
        );
      } catch {
        return null;
      }
      const targets = definitionTargets(result);
      const [first] = targets;
      if (!first) return null;
      const firstPath = uriToFilePath(first.uri);
      if (firstPath !== path && deps.openLocation) {
        deps.openLocation(firstPath, lspRangeToMonaco(first.range));
        return null; // the app owns cross-file navigation
      }
      return targets.map(target => {
        const targetPath = uriToFilePath(target.uri);
        return {
          uri: targetPath === path ? model.uri : monaco.Uri.file(targetPath),
          range: lspRangeToMonaco(target.range),
        };
      });
    },
  };
}

export function createDocumentSymbolProvider(client: LspClient, deps: LspProviderDeps) {
  return {
    async provideDocumentSymbols(_model: MonacoModel): Promise<MonacoDocumentSymbol[] | null> {
      const path = deps.getActivePath();
      if (!path) return null;
      try {
        const result = await client.request('textDocument/documentSymbol', {
          textDocument: { uri: filePathToUri(path) },
        });
        return documentSymbolsToMonaco(result);
      } catch {
        return null;
      }
    },
  };
}

export function createCompletionProvider(client: LspClient, deps: LspProviderDeps) {
  return {
    triggerCharacters: ['.', ':', '>'],
    async provideCompletionItems(
      model: MonacoModel,
      position: MonacoPosition
    ): Promise<MonacoCompletionList> {
      const path = deps.getActivePath();
      const word = model.getWordUntilPosition?.(position);
      if (!path || !word) return { suggestions: [] };
      const defaultRange: MonacoRange = {
        startLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endLineNumber: position.lineNumber,
        endColumn: word.endColumn,
      };
      try {
        const result = await client.request(
          'textDocument/completion',
          positionParams(filePathToUri(path), position)
        );
        return completionToMonaco(result, defaultRange);
      } catch {
        return { suggestions: [] }; // relay down → other providers still contribute
      }
    },
  };
}

export function createReferenceProvider(
  client: LspClient,
  deps: LspProviderDeps,
  monaco: LspMonaco
) {
  return {
    async provideReferences(
      model: MonacoModel,
      position: MonacoPosition,
      context: ReferenceContext
    ): Promise<MonacoLocation[] | null> {
      const path = deps.getActivePath();
      if (!path) return null;
      let result: unknown;
      try {
        result = await client.request('textDocument/references', {
          textDocument: { uri: filePathToUri(path) },
          position: toLspPosition(position),
          context: { includeDeclaration: context?.includeDeclaration ?? true },
        });
      } catch {
        return null;
      }
      const targets = definitionTargets(result);
      if (targets.length === 0) return null;
      // Cross-file targets need live models for the peek widget to render a
      // real snippet (instead of a bare path); create them from file content.
      await ensurePreviewModels(monaco, targets, path, deps.readFile);
      return targets.map(target => {
        const targetPath = uriToFilePath(target.uri);
        return {
          uri: targetPath === path ? model.uri : monaco.Uri.file(targetPath),
          range: lspRangeToMonaco(target.range),
        };
      });
    },
  };
}

/** Word-at-cursor rename fallback (used when prepareRename is unsupported). */
function wordRenameLocation(
  model: MonacoModel,
  position: MonacoPosition
): MonacoRenameLocation | null {
  const word = model.getWordAtPosition?.(position);
  if (!word) return null;
  return {
    range: {
      startLineNumber: position.lineNumber,
      startColumn: word.startColumn,
      endLineNumber: position.lineNumber,
      endColumn: word.endColumn,
    },
    text: word.word,
  };
}

/**
 * Rename provider (Phase 1d, F2 / Monaco rename action). Requests
 * `textDocument/rename` and hands the resulting WorkspaceEdit to the app's
 * multi-file preview/apply flow via `deps.requestRename` — Monaco itself never
 * applies the edits (cross-file targets may not have models). Degrades to null
 * (Monaco default, no-op) when LSP is unavailable or the server returns nothing.
 *
 * Polish: `resolveRenameLocation` runs before the rename box opens. When the
 * server advertises prepareRename support, `textDocument/prepareRename`
 * validates the position and derives the placeholder; otherwise (or when the
 * capability handshake / request fails) the word under the cursor is used.
 */
export function createRenameProvider(client: LspClient, deps: LspProviderDeps) {
  return {
    async resolveRenameLocation(
      model: MonacoModel,
      position: MonacoPosition
    ): Promise<MonacoRenameLocation> {
      const path = deps.getActivePath();
      const fallback = wordRenameLocation(model, position);
      const fallbackLocation = (): MonacoRenameLocation =>
        fallback ?? {
          range: cursorRange(position),
          text: '',
          rejectReason: 'No renameable symbol at the cursor.',
        };
      if (!path || !supportsPrepareRename(client.getCapabilities())) return fallbackLocation();
      let result: unknown;
      try {
        result = await client.request(
          'textDocument/prepareRename',
          positionParams(filePathToUri(path), position)
        );
      } catch {
        return fallbackLocation(); // relay down → same fallback as unsupported
      }
      const readRange = (range: MonacoRange): string | undefined => model.getValueInRange?.(range);
      return resolveRenameLocation(interpretPrepareRename(result), fallback, readRange, position);
    },

    async provideRenameEdits(
      _model: MonacoModel,
      position: MonacoPosition,
      newName: string
    ): Promise<{ edits: never[] } | null> {
      const path = deps.getActivePath();
      if (!path) return null;
      let result: unknown;
      try {
        result = await client.request('textDocument/rename', {
          ...positionParams(filePathToUri(path), position),
          newName,
        });
      } catch {
        return null;
      }
      const fileEdits = workspaceEditToFileEdits(result);
      if (fileEdits.length === 0) return null;
      deps.requestRename?.(newName, fileEdits);
      return { edits: [] }; // the app owns preview + apply
    },
  };
}

/**
 * Signature help provider (spec 07 polish, AC #5). Trigger characters come
 * from the server's advertised capabilities via getters — capabilities arrive
 * asynchronously (after `initialize`) while registration is synchronous, and
 * Monaco reads the trigger arrays on each keystroke, so getters keep them
 * current. Falls back to `(`/`,` until the handshake completes.
 */
export function createSignatureHelpProvider(client: LspClient, deps: LspProviderDeps) {
  return {
    get signatureHelpTriggerCharacters(): string[] {
      return signatureHelpTriggerCharacters(client.getCapabilities());
    },
    get signatureHelpRetriggerCharacters(): string[] {
      return signatureHelpRetriggerCharacters(client.getCapabilities());
    },
    async provideSignatureHelp(
      _model: MonacoModel,
      position: MonacoPosition
    ): Promise<{ value: MonacoSignatureHelp; dispose: () => void } | null> {
      const path = deps.getActivePath();
      if (!path) return null;
      let result: unknown;
      try {
        result = await client.request(
          'textDocument/signatureHelp',
          positionParams(filePathToUri(path), position)
        );
      } catch {
        return null; // relay down → Monaco built-in behavior
      }
      const value = signatureHelpToMonaco(result);
      if (!value) return null;
      return { value, dispose: () => {} };
    },
  };
}

/** Register all Phase 1b–1d + polish providers for a language; returns one disposable. */
export function registerLspProviders(
  monaco: LspMonaco,
  languageId: string,
  client: LspClient,
  deps: LspProviderDeps
): MonacoDisposable {
  const disposables = [
    monaco.languages.registerHoverProvider(languageId, createHoverProvider(client, deps)),
    monaco.languages.registerDefinitionProvider(
      languageId,
      createDefinitionProvider(client, deps, monaco)
    ),
    monaco.languages.registerDocumentSymbolProvider(
      languageId,
      createDocumentSymbolProvider(client, deps)
    ),
    monaco.languages.registerCompletionItemProvider(
      languageId,
      createCompletionProvider(client, deps)
    ),
    monaco.languages.registerReferenceProvider(
      languageId,
      createReferenceProvider(client, deps, monaco)
    ),
    monaco.languages.registerRenameProvider(languageId, createRenameProvider(client, deps)),
    monaco.languages.registerSignatureHelpProvider(
      languageId,
      createSignatureHelpProvider(client, deps)
    ),
  ];
  return { dispose: () => disposables.forEach(disposable => disposable.dispose()) };
}
