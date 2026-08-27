import { describe, expect, it } from 'vitest';

import {
  cursorRange,
  interpretPrepareRename,
  resolveRenameLocation,
  type MonacoRenameLocation,
} from '../../../services/lsp/lspPrepareRename';

const lspRange = {
  start: { line: 0, character: 6 },
  end: { line: 0, character: 9 },
};
const monacoRange = { startLineNumber: 1, startColumn: 7, endLineNumber: 1, endColumn: 10 };
const position = { lineNumber: 1, column: 8 };
const fallback: MonacoRenameLocation = {
  range: { startLineNumber: 1, startColumn: 7, endLineNumber: 1, endColumn: 10 },
  text: 'foo',
};

describe('interpretPrepareRename', () => {
  it('rejects on null/undefined (server says: not renameable here)', () => {
    expect(interpretPrepareRename(null)).toEqual({ kind: 'rejected' });
    expect(interpretPrepareRename(undefined)).toEqual({ kind: 'rejected' });
  });

  it('maps defaultBehavior to the client-side default', () => {
    expect(interpretPrepareRename({ defaultBehavior: true })).toEqual({ kind: 'default' });
  });

  it('maps a bare Range (placeholder read from the document later)', () => {
    expect(interpretPrepareRename(lspRange)).toEqual({
      kind: 'location',
      range: monacoRange,
      placeholder: null,
    });
  });

  it('maps { range, placeholder }', () => {
    expect(interpretPrepareRename({ range: lspRange, placeholder: 'foo' })).toEqual({
      kind: 'location',
      range: monacoRange,
      placeholder: 'foo',
    });
  });

  it('ignores a non-string placeholder', () => {
    expect(interpretPrepareRename({ range: lspRange, placeholder: 42 })).toEqual({
      kind: 'location',
      range: monacoRange,
      placeholder: null,
    });
  });

  it('falls back to default for unrecognized shapes', () => {
    expect(interpretPrepareRename('x')).toEqual({ kind: 'default' });
    expect(interpretPrepareRename({ something: 1 })).toEqual({ kind: 'default' });
    expect(interpretPrepareRename({ range: { start: {} } })).toEqual({ kind: 'default' });
  });
});

describe('cursorRange', () => {
  it('builds a zero-width range at the position', () => {
    expect(cursorRange({ lineNumber: 3, column: 5 })).toEqual({
      startLineNumber: 3,
      startColumn: 5,
      endLineNumber: 3,
      endColumn: 5,
    });
  });
});

describe('resolveRenameLocation', () => {
  const readRange = () => 'fromDoc';

  it('rejected → fallback range/text with a reject reason', () => {
    const result = resolveRenameLocation({ kind: 'rejected' }, fallback, readRange, position);
    expect(result).toEqual({
      range: fallback.range,
      text: 'foo',
      rejectReason: 'This element cannot be renamed.',
    });
  });

  it('rejected without a fallback → cursor range + empty text + reject reason', () => {
    const result = resolveRenameLocation({ kind: 'rejected' }, null, readRange, position);
    expect(result.range).toEqual(cursorRange(position));
    expect(result.text).toBe('');
    expect(result.rejectReason).toBeTruthy();
  });

  it('location with placeholder wins over document text', () => {
    const result = resolveRenameLocation(
      { kind: 'location', range: monacoRange, placeholder: 'bar' },
      fallback,
      readRange,
      position
    );
    expect(result).toEqual({ range: monacoRange, text: 'bar' });
  });

  it('location without placeholder reads the document range', () => {
    const result = resolveRenameLocation(
      { kind: 'location', range: monacoRange, placeholder: null },
      fallback,
      readRange,
      position
    );
    expect(result).toEqual({ range: monacoRange, text: 'fromDoc' });
  });

  it('location with unreadable document falls back to the word text, then empty', () => {
    const unreadable = () => undefined;
    expect(
      resolveRenameLocation(
        { kind: 'location', range: monacoRange, placeholder: null },
        fallback,
        unreadable,
        position
      )
    ).toEqual({ range: monacoRange, text: 'foo' });
    expect(
      resolveRenameLocation(
        { kind: 'location', range: monacoRange, placeholder: null },
        null,
        unreadable,
        position
      )
    ).toEqual({ range: monacoRange, text: '' });
  });

  it('default → word fallback, or a rejection when there is no word', () => {
    expect(resolveRenameLocation({ kind: 'default' }, fallback, readRange, position)).toBe(
      fallback
    );
    const noWord = resolveRenameLocation({ kind: 'default' }, null, readRange, position);
    expect(noWord.rejectReason).toBe('No renameable symbol at the cursor.');
    expect(noWord.range).toEqual(cursorRange(position));
  });
});
