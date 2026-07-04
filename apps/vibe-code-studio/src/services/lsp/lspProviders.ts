/**
 * Monaco language-feature providers backed by the hand-rolled LSP client
 * (spec 07 Phase 1b): hover, go-to-definition, and document symbols (outline).
 *
 * Each provider resolves the active document path via an injected `getActivePath`
 * (this app shows one file at a time, so the active model === currentFile) and
 * degrades to `null` — i.e. Monaco's built-in behavior — whenever LSP is
 * unavailable or the relay request rejects (matches Phase 1a's fallback).
 */

import type { LspClient } from './lspClient';
import { filePathToUri, uriToFilePath } from './uri';
import {
  definitionTargets,
  documentSymbolsToMonaco,
  hoverToMonaco,
  lspRangeToMonaco,
  positionParams,
  type MonacoDocumentSymbol,
  type MonacoHover,
  type MonacoPosition,
  type MonacoRange,
} from './lspNavigation';

export interface LspProviderDeps {
  /** Path of the file backing the active model (single-editor app → currentFile). */
  getActivePath: () => string | null;
  /** Open a target file at a range — used for cross-file go-to-definition. */
  openLocation?: (path: string, range: MonacoRange) => void;
}

interface MonacoModel {
  uri: unknown;
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
  languages: {
    registerHoverProvider: (languageId: string, provider: unknown) => MonacoDisposable;
    registerDefinitionProvider: (languageId: string, provider: unknown) => MonacoDisposable;
    registerDocumentSymbolProvider: (languageId: string, provider: unknown) => MonacoDisposable;
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

/** Register all Phase 1b providers for a language; returns an aggregate disposable. */
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
  ];
  return { dispose: () => disposables.forEach(disposable => disposable.dispose()) };
}
