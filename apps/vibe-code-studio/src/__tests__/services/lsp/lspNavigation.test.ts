import { describe, it, expect } from 'vitest';

import {
  completionToMonaco,
  definitionTargets,
  documentSymbolsToMonaco,
  hoverToMonaco,
  lspRangeToMonaco,
  positionParams,
  toLspPosition,
} from '../../../services/lsp/lspNavigation';

const range = (sl: number, sc: number, el: number, ec: number) => ({
  start: { line: sl, character: sc },
  end: { line: el, character: ec },
});

describe('position/range mappers', () => {
  it('converts Monaco position to LSP (1-based → 0-based)', () => {
    expect(toLspPosition({ lineNumber: 3, column: 5 })).toEqual({ line: 2, character: 4 });
  });

  it('builds position params', () => {
    expect(positionParams('file:///a.ts', { lineNumber: 1, column: 1 })).toEqual({
      textDocument: { uri: 'file:///a.ts' },
      position: { line: 0, character: 0 },
    });
  });

  it('converts LSP range to Monaco range (0-based → 1-based)', () => {
    expect(lspRangeToMonaco(range(0, 0, 1, 4))).toEqual({
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 2,
      endColumn: 5,
    });
  });
});

describe('hoverToMonaco', () => {
  it('returns null for non-object / empty / valueless contents', () => {
    expect(hoverToMonaco(null)).toBeNull();
    expect(hoverToMonaco('nope')).toBeNull();
    expect(hoverToMonaco({ contents: '' })).toBeNull();
    expect(hoverToMonaco({ contents: [] })).toBeNull();
    expect(hoverToMonaco({})).toBeNull(); // contents undefined
    expect(hoverToMonaco({ contents: { kind: 'markdown' } })).toBeNull(); // object without a value
    expect(hoverToMonaco({ contents: [null, { kind: 'x' }] })).toBeNull(); // array of empties
  });

  it('maps MarkupContent and includes the range', () => {
    expect(
      hoverToMonaco({ contents: { kind: 'markdown', value: '**x**' }, range: range(0, 0, 0, 3) })
    ).toEqual({
      contents: [{ value: '**x**' }],
      range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 4 },
    });
  });

  it('maps a plain string', () => {
    expect(hoverToMonaco({ contents: 'hello' })).toEqual({ contents: [{ value: 'hello' }] });
  });

  it('fences a MarkedString with a language', () => {
    expect(hoverToMonaco({ contents: { language: 'ts', value: 'const x = 1' } })).toEqual({
      contents: [{ value: '```ts\nconst x = 1\n```' }],
    });
  });

  it('flattens an array of marked strings', () => {
    expect(hoverToMonaco({ contents: ['a', { language: 'ts', value: 'b' }, ''] })).toEqual({
      contents: [{ value: 'a' }, { value: '```ts\nb\n```' }],
    });
  });
});

describe('definitionTargets', () => {
  it('returns [] for null', () => {
    expect(definitionTargets(null)).toEqual([]);
  });

  it('normalizes a single Location', () => {
    expect(definitionTargets({ uri: 'file:///a.ts', range: range(1, 2, 1, 5) })).toEqual([
      { uri: 'file:///a.ts', range: range(1, 2, 1, 5) },
    ]);
  });

  it('normalizes an array of Locations', () => {
    const result = definitionTargets([
      { uri: 'file:///a.ts', range: range(0, 0, 0, 1) },
      { uri: 'file:///b.ts', range: range(2, 0, 2, 1) },
    ]);
    expect(result.map(t => t.uri)).toEqual(['file:///a.ts', 'file:///b.ts']);
  });

  it('normalizes a LocationLink using targetSelectionRange, then targetRange', () => {
    expect(
      definitionTargets([
        {
          targetUri: 'file:///a.ts',
          targetSelectionRange: range(1, 0, 1, 3),
          targetRange: range(1, 0, 5, 0),
        },
        { targetUri: 'file:///b.ts', targetRange: range(2, 0, 2, 4) },
      ])
    ).toEqual([
      { uri: 'file:///a.ts', range: range(1, 0, 1, 3) },
      { uri: 'file:///b.ts', range: range(2, 0, 2, 4) },
    ]);
  });

  it('skips malformed entries', () => {
    expect(
      definitionTargets([null, 'x', { uri: 'file:///a.ts' }, { targetUri: 'file:///b.ts' }])
    ).toEqual([]);
  });
});

describe('documentSymbolsToMonaco', () => {
  it('returns [] for a non-array', () => {
    expect(documentSymbolsToMonaco(null)).toEqual([]);
  });

  it('maps hierarchical DocumentSymbols with children and LSP→Monaco kind', () => {
    const result = documentSymbolsToMonaco([
      {
        name: 'Foo',
        detail: 'class',
        kind: 5, // LSP Class → Monaco 4
        range: range(0, 0, 10, 0),
        selectionRange: range(0, 6, 0, 9),
        children: [
          { name: 'bar', kind: 6, range: range(1, 2, 3, 0), selectionRange: range(1, 2, 1, 5) },
        ],
      },
    ]);
    expect(result[0]).toMatchObject({ name: 'Foo', detail: 'class', kind: 4, tags: [] });
    expect(result[0]?.children?.[0]).toMatchObject({ name: 'bar', kind: 5 });
  });

  it('maps flat SymbolInformation (location.range, no selectionRange)', () => {
    const [symbol] = documentSymbolsToMonaco([
      { name: 'x', kind: 13, location: { uri: 'file:///a.ts', range: range(4, 0, 4, 1) } },
    ]);
    expect(symbol).toMatchObject({
      name: 'x',
      detail: '',
      kind: 12,
      range: { startLineNumber: 5 },
      selectionRange: { startLineNumber: 5 },
    });
    expect(symbol?.children).toBeUndefined();
  });

  it('filters symbols missing name/kind/range', () => {
    expect(
      documentSymbolsToMonaco([
        null,
        { name: 'noKind', range: range(0, 0, 0, 1) },
        { kind: 5, range: range(0, 0, 0, 1) },
        { name: 'noRange', kind: 5 },
      ])
    ).toEqual([]);
  });
});

describe('completionToMonaco', () => {
  const defaultRange = { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 5 };

  it('returns an empty list for non-array / non-CompletionList input', () => {
    expect(completionToMonaco(null, defaultRange)).toEqual({ suggestions: [] });
    expect(completionToMonaco({ nope: true }, defaultRange)).toEqual({ suggestions: [] });
  });

  it('maps a plain CompletionItem[] using the default range and label fallback', () => {
    const { suggestions } = completionToMonaco([{ label: 'foo', kind: 3 }], defaultRange);
    expect(suggestions).toEqual([
      { label: 'foo', kind: 1, insertText: 'foo', range: defaultRange }, // LSP Function(3) → Monaco 1
    ]);
  });

  it('reads items[] from a CompletionList and honors insertText + detail + documentation', () => {
    const { suggestions } = completionToMonaco(
      {
        items: [
          {
            label: 'bar',
            kind: 6,
            insertText: 'bar()',
            detail: 'fn',
            documentation: { value: 'docs' },
          },
        ],
      },
      defaultRange
    );
    expect(suggestions[0]).toEqual({
      label: 'bar',
      kind: 4, // LSP Variable(6) → Monaco 4
      insertText: 'bar()',
      detail: 'fn',
      documentation: 'docs',
      range: defaultRange,
    });
  });

  it('uses a textEdit range + newText when present', () => {
    const { suggestions } = completionToMonaco(
      [{ label: 'x', kind: 99, textEdit: { range: range(0, 0, 0, 2), newText: 'xyz' } }],
      defaultRange
    );
    expect(suggestions[0]).toMatchObject({
      insertText: 'xyz',
      kind: 18, // unknown kind → Text
      range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 3 },
    });
  });

  it('maps string documentation and filters invalid items', () => {
    const { suggestions } = completionToMonaco(
      [{ label: 'a', documentation: 'plain' }, null, { kind: 5 }],
      defaultRange
    );
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({ label: 'a', documentation: 'plain', kind: 18 });
  });
});
