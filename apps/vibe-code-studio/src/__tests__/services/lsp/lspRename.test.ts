import { describe, expect, it, vi } from 'vitest';

import {
  applyTextEdits,
  renameEditsToPlan,
  workspaceEditToFileEdits,
  type LspTextEdit,
} from '../../../services/lsp/lspRename';

const range = (sl: number, sc: number, el: number, ec: number) => ({
  start: { line: sl, character: sc },
  end: { line: el, character: ec },
});
const edit = (sl: number, sc: number, el: number, ec: number, newText: string): LspTextEdit => ({
  range: range(sl, sc, el, ec),
  newText,
});

describe('workspaceEditToFileEdits', () => {
  it('returns [] for null / non-object / empty results', () => {
    expect(workspaceEditToFileEdits(null)).toEqual([]);
    expect(workspaceEditToFileEdits('nope')).toEqual([]);
    expect(workspaceEditToFileEdits({})).toEqual([]);
  });

  it('maps a `changes` map to per-file Windows-path edit groups', () => {
    const result = workspaceEditToFileEdits({
      changes: {
        'file:///C:/ws/a.ts': [edit(0, 6, 0, 9, 'bar'), edit(2, 0, 2, 3, 'bar')],
        'file:///C:/ws/b.ts': [edit(1, 4, 1, 7, 'bar')],
      },
    });
    expect(result).toEqual([
      { path: 'C:\\ws\\a.ts', edits: [edit(0, 6, 0, 9, 'bar'), edit(2, 0, 2, 3, 'bar')] },
      { path: 'C:\\ws\\b.ts', edits: [edit(1, 4, 1, 7, 'bar')] },
    ]);
  });

  it('skips malformed edit entries and files whose edits are all invalid', () => {
    const result = workspaceEditToFileEdits({
      changes: {
        'file:///C:/ws/a.ts': [
          edit(0, 0, 0, 3, 'ok'),
          { newText: 'missing range' },
          { range: range(0, 0, 0, 1) }, // missing newText
          { range: { start: { line: 0 } }, newText: 'bad positions' },
          'not an object',
        ],
        'file:///C:/ws/b.ts': [{ newText: 'invalid' }],
        'file:///C:/ws/c.ts': 'not an array',
      },
    });
    expect(result).toEqual([{ path: 'C:\\ws\\a.ts', edits: [edit(0, 0, 0, 3, 'ok')] }]);
  });

  it('prefers documentChanges over changes when both are present', () => {
    const result = workspaceEditToFileEdits({
      changes: { 'file:///C:/ws/ignored.ts': [edit(0, 0, 0, 1, 'x')] },
      documentChanges: [
        { textDocument: { uri: 'file:///C:/ws/a.ts', version: 3 }, edits: [edit(0, 0, 0, 3, 'y')] },
      ],
    });
    expect(result).toEqual([{ path: 'C:\\ws\\a.ts', edits: [edit(0, 0, 0, 3, 'y')] }]);
  });

  it('merges duplicate documentChanges entries and skips resource ops / bad entries', () => {
    const result = workspaceEditToFileEdits({
      documentChanges: [
        { textDocument: { uri: 'file:///C:/ws/a.ts' }, edits: [edit(0, 0, 0, 3, 'p')] },
        { kind: 'rename', oldUri: 'file:///C:/ws/a.ts', newUri: 'file:///C:/ws/z.ts' },
        { kind: 'create', uri: 'file:///C:/ws/new.ts' },
        { textDocument: {}, edits: [edit(0, 0, 0, 1, 'q')] }, // no uri
        null,
        { textDocument: { uri: 'file:///C:/ws/a.ts' }, edits: [edit(1, 0, 1, 3, 'r')] },
      ],
    });
    expect(result).toEqual([
      { path: 'C:\\ws\\a.ts', edits: [edit(0, 0, 0, 3, 'p'), edit(1, 0, 1, 3, 'r')] },
    ]);
  });
});

describe('applyTextEdits', () => {
  it('returns content unchanged for an empty edit list', () => {
    expect(applyTextEdits('const foo = 1;', [])).toBe('const foo = 1;');
  });

  it('applies a single mid-line replacement', () => {
    expect(applyTextEdits('const foo = 1;', [edit(0, 6, 0, 9, 'bar')])).toBe('const bar = 1;');
  });

  it('applies multiple edits regardless of input order (bottom-up)', () => {
    const content = 'foo(foo);\nreturn foo;';
    const edits = [
      edit(0, 0, 0, 3, 'bar'), // out of order on purpose
      edit(1, 7, 1, 10, 'bar'),
      edit(0, 4, 0, 7, 'bar'),
    ];
    expect(applyTextEdits(content, edits)).toBe('bar(bar);\nreturn bar;');
  });

  it('replaces a multi-line range', () => {
    expect(applyTextEdits('one\ntwo\nthree', [edit(0, 1, 2, 2, 'X')])).toBe('oXree');
  });

  it('supports insertions and deletions (empty ranges / empty newText)', () => {
    expect(applyTextEdits('ab', [edit(0, 1, 0, 1, 'X')])).toBe('aXb');
    expect(applyTextEdits('abc', [edit(0, 1, 0, 2, '')])).toBe('ac');
  });

  it('clamps out-of-range positions to line and document bounds', () => {
    expect(applyTextEdits('ab\ncd', [edit(0, 99, 0, 100, 'X')])).toBe('abX\ncd');
    expect(applyTextEdits('ab', [edit(5, 0, 6, 0, 'X')])).toBe('abX');
    expect(applyTextEdits('ab', [edit(0, -2, 0, 0, 'X')])).toBe('Xab');
    expect(
      applyTextEdits('ab', [
        {
          range: { start: { line: -1, character: 0 }, end: { line: 0, character: 0 } },
          newText: 'X',
        },
      ])
    ).toBe('Xab');
  });

  it('clamps to before the \\r in CRLF content and edits CRLF lines correctly', () => {
    expect(applyTextEdits('ab\r\ncd', [edit(0, 99, 0, 100, 'X')])).toBe('abX\r\ncd');
    expect(applyTextEdits('foo\r\nfoo bar', [edit(1, 0, 1, 3, 'baz')])).toBe('foo\r\nbaz bar');
  });

  it('skips inverted ranges', () => {
    expect(applyTextEdits('ab\ncd', [edit(1, 0, 0, 0, 'X')])).toBe('ab\ncd');
  });
});

describe('renameEditsToPlan', () => {
  const readerFor = (files: Record<string, string>) => vi.fn(async (path: string) => files[path]);

  it('builds a plan + FileChanges with diff, changeType and reason', async () => {
    const readFile = readerFor({ 'C:\\ws\\a.ts': 'const foo = 1;\nexport { foo };' });
    const result = await renameEditsToPlan(
      'bar',
      [{ path: 'C:\\ws\\a.ts', edits: [edit(0, 6, 0, 9, 'bar'), edit(1, 9, 1, 12, 'bar')] }],
      readFile
    );
    expect(result).not.toBeNull();
    expect(result!.changes).toEqual([
      {
        path: 'C:\\ws\\a.ts',
        originalContent: 'const foo = 1;\nexport { foo };',
        newContent: 'const bar = 1;\nexport { bar };',
        diff: '- const foo = 1;\n+ const bar = 1;\n- export { foo };\n+ export { bar };\n',
        changeType: 'modify',
        reason: "Rename to 'bar'",
      },
    ]);
    expect(result!.plan.id).toMatch(/^lsp-rename-/);
    expect(result!.plan.description).toBe("Rename symbol to 'bar' across 1 file(s)");
    expect(result!.plan.files).toBe(result!.changes);
    expect(result!.plan.dependencies).toEqual([]);
    expect(result!.plan.createdAt).toBeInstanceOf(Date);
  });

  it('skips files whose edits are a no-op and returns null when nothing changes', async () => {
    const readFile = readerFor({ 'C:\\ws\\a.ts': 'foo', 'C:\\ws\\b.ts': 'foo x' });
    const result = await renameEditsToPlan(
      'foo',
      [
        { path: 'C:\\ws\\a.ts', edits: [edit(0, 0, 0, 3, 'foo')] }, // identical replacement
        { path: 'C:\\ws\\b.ts', edits: [edit(0, 0, 0, 3, 'bar')] },
      ],
      readFile
    );
    expect(result!.changes.map(c => c.path)).toEqual(['C:\\ws\\b.ts']);

    const noop = await renameEditsToPlan(
      'foo',
      [{ path: 'C:\\ws\\a.ts', edits: [edit(0, 0, 0, 3, 'foo')] }],
      readFile
    );
    expect(noop).toBeNull();
    expect(await renameEditsToPlan('foo', [], readFile)).toBeNull();
  });

  it('throws when a file cannot be read (no partial renames)', async () => {
    const readFile = readerFor({});
    await expect(
      renameEditsToPlan(
        'bar',
        [{ path: 'C:\\ws\\gone.ts', edits: [edit(0, 0, 0, 1, 'b')] }],
        readFile
      )
    ).rejects.toThrow('Cannot read C:\\ws\\gone.ts');
  });

  it('estimates impact from the changed-file count (low / medium / high)', async () => {
    const files: Record<string, string> = {};
    const fileEdits = (count: number) =>
      Array.from({ length: count }, (_, i) => {
        const path = `C:\\ws\\f${i}.ts`;
        files[path] = 'foo';
        return { path, edits: [edit(0, 0, 0, 3, 'bar')] };
      });
    const readFile = vi.fn(async (path: string) => files[path]);
    expect((await renameEditsToPlan('bar', fileEdits(2), readFile))!.plan.estimatedImpact).toBe(
      'low'
    );
    expect((await renameEditsToPlan('bar', fileEdits(5), readFile))!.plan.estimatedImpact).toBe(
      'medium'
    );
    expect((await renameEditsToPlan('bar', fileEdits(6), readFile))!.plan.estimatedImpact).toBe(
      'high'
    );
  });
});
