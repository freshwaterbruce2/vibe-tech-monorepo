import { describe, expect, it } from 'vitest';

import {
  SYMBOL_QUERY_PREFIX,
  isSymbolQuery,
  symbolKindLabel,
  symbolQueryText,
  workspaceSymbolsToEntries,
} from '../../../services/lsp/workspaceSymbols';

describe('symbol query prefix helpers', () => {
  it('recognizes the # prefix', () => {
    expect(SYMBOL_QUERY_PREFIX).toBe('#');
    expect(isSymbolQuery('#foo')).toBe(true);
    expect(isSymbolQuery('#')).toBe(true);
    expect(isSymbolQuery('foo')).toBe(false);
    expect(isSymbolQuery('')).toBe(false);
  });

  it('extracts and trims the query text', () => {
    expect(symbolQueryText('#foo')).toBe('foo');
    expect(symbolQueryText('# foo ')).toBe('foo');
    expect(symbolQueryText('#')).toBe('');
    expect(symbolQueryText(' plain ')).toBe('plain');
  });
});

describe('symbolKindLabel', () => {
  it('labels known kinds and falls back to Symbol', () => {
    expect(symbolKindLabel(5)).toBe('Class');
    expect(symbolKindLabel(12)).toBe('Function');
    expect(symbolKindLabel(26)).toBe('TypeParameter');
    expect(symbolKindLabel(99)).toBe('Symbol');
    expect(symbolKindLabel(undefined)).toBe('Symbol');
  });
});

describe('workspaceSymbolsToEntries', () => {
  const location = {
    uri: 'file:///C:/ws/b.ts',
    range: { start: { line: 4, character: 2 }, end: { line: 4, character: 8 } },
  };

  it('maps SymbolInformation entries with paths and 1-based ranges', () => {
    const entries = workspaceSymbolsToEntries([
      { name: 'FooBar', kind: 5, containerName: 'mod', location },
    ]);
    expect(entries).toEqual([
      {
        name: 'FooBar',
        kindLabel: 'Class',
        containerName: 'mod',
        path: 'C:\\ws\\b.ts',
        range: { startLineNumber: 5, startColumn: 3, endLineNumber: 5, endColumn: 9 },
      },
    ]);
  });

  it('defaults the range for WorkspaceSymbol entries without one', () => {
    const entries = workspaceSymbolsToEntries([
      { name: 'lazy', kind: 12, location: { uri: 'file:///C:/ws/c.ts' } },
    ]);
    expect(entries[0]).toMatchObject({
      path: 'C:\\ws\\c.ts',
      containerName: '',
      range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 },
    });
  });

  it('skips malformed items and non-array results', () => {
    expect(workspaceSymbolsToEntries(null)).toEqual([]);
    expect(workspaceSymbolsToEntries({})).toEqual([]);
    expect(
      workspaceSymbolsToEntries([
        null,
        'x',
        { name: 42, location },
        { name: 'noLocation' },
        { name: 'noUri', location: { range: location.range } },
        { name: 'ok', kind: 13, containerName: 7, location },
      ])
    ).toEqual([
      {
        name: 'ok',
        kindLabel: 'Variable',
        containerName: '',
        path: 'C:\\ws\\b.ts',
        range: { startLineNumber: 5, startColumn: 3, endLineNumber: 5, endColumn: 9 },
      },
    ]);
  });
});
