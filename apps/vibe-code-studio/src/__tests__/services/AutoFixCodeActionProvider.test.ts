/**
 * AutoFixCodeActionProvider tests
 *
 * Real behavioral tests for the Monaco code-action provider: action listing,
 * command-handler registration, marker -> DetectedError conversion (including
 * the crypto.randomUUID() based marker ids), fix application, and failure
 * propagation. AutoFixService is replaced with a controllable mock; the
 * provider logic runs unchanged.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type * as Monaco from 'monaco-editor';

import { AutoFixCodeActionProvider } from '../../services/AutoFixCodeActionProvider';
import type { DetectedError } from '../../services/ErrorDetector';
import type { FixSuggestion, GeneratedFix } from '../../services/AutoFixService';

type RunHandler = (ed: unknown, ...args: unknown[]) => Promise<void>;

const UUID_RE = /^marker-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function makeMarker(overrides: Partial<Monaco.editor.IMarker> = {}): Monaco.editor.IMarker {
  return {
    severity: 8,
    message: 'Cannot find name foo',
    startLineNumber: 3,
    startColumn: 1,
    endLineNumber: 3,
    endColumn: 4,
    code: 'TS2304',
    source: 'ts',
    ...overrides,
  } as unknown as Monaco.editor.IMarker;
}

function makeModel(path = '/test/file.ts') {
  return {
    uri: { path },
    getLineMaxColumn: vi.fn(() => 42),
  } as unknown as Monaco.editor.ITextModel;
}

function makeEditor() {
  const runHandlers = new Map<string, RunHandler>();
  const editor = {
    addAction: vi.fn((descriptor: { id: string; run: RunHandler }) => {
      runHandlers.set(descriptor.id, descriptor.run);
    }),
    executeEdits: vi.fn(),
    setPosition: vi.fn(),
    revealLineInCenter: vi.fn(),
  };
  return {
    editor: editor as unknown as Monaco.editor.IStandaloneCodeEditor,
    raw: editor,
    runHandlers,
  };
}

function makeSuggestion(overrides: Partial<FixSuggestion> = {}): FixSuggestion {
  return {
    id: 'fix-1',
    title: 'Declare foo',
    description: 'Adds a declaration',
    code: 'const foo = 1;',
    startLine: 3,
    endLine: 3,
    confidence: 'high',
    ...overrides,
  };
}

function makeFix(error: DetectedError, suggestions: FixSuggestion[]): GeneratedFix {
  return { error, suggestions, context: '', explanation: 'because' };
}

describe('AutoFixCodeActionProvider', () => {
  let generateFix: ReturnType<typeof vi.fn>;
  let onFixApplied: ReturnType<typeof vi.fn>;
  let onFixFailed: ReturnType<typeof vi.fn>;
  let provider: AutoFixCodeActionProvider;

  beforeEach(() => {
    generateFix = vi.fn();
    onFixApplied = vi.fn();
    onFixFailed = vi.fn();
    provider = new AutoFixCodeActionProvider({
      autoFixService: { generateFix } as never,
      errorDetector: {} as never,
      onFixApplied,
      onFixFailed,
    });
  });

  function provide(markers: Monaco.editor.IMarker[] | undefined) {
    return provider.provideCodeActions(
      makeModel(),
      null as never,
      { markers } as never,
      null as never
    );
  }

  describe('provideCodeActions', () => {
    it('returns undefined when the context has no markers', async () => {
      expect(await provide([])).toBeUndefined();
      expect(await provide(undefined)).toBeUndefined();
    });

    it('returns undefined when all markers are below warning severity', async () => {
      const result = await provide([makeMarker({ severity: 2 }), makeMarker({ severity: 1 })]);
      expect(result).toBeUndefined();
    });

    it('offers a preferred quickfix per error marker', async () => {
      const marker = makeMarker();
      const result = await provide([marker]);

      expect(result?.actions).toHaveLength(1);
      const action = result!.actions[0]!;
      expect(action.title).toBe('✨ Fix with AI: Cannot find name foo');
      expect(action.kind).toBe('quickfix');
      expect(action.isPreferred).toBe(true);
      expect(action.command?.id).toBe('autofix.fixWithAI');
      expect(action.command?.arguments?.[1]).toBe(marker);
      result!.dispose();
    });

    it('truncates long marker messages in the action title', async () => {
      const longMessage = 'x'.repeat(80);
      const result = await provide([makeMarker({ message: longMessage })]);

      const title = result!.actions[0]!.title;
      expect(title).toBe(`✨ Fix with AI: ${'x'.repeat(50)}...`);
    });

    it('adds a single fix-all action when multiple markers are present', async () => {
      const markers = [makeMarker(), makeMarker({ startLineNumber: 9, message: 'other' })];
      const result = await provide(markers);

      expect(result?.actions).toHaveLength(3);
      const fixAll = result!.actions.find(a => a.command?.id === 'autofix.fixAllWithAI')!;
      expect(fixAll.title).toBe('✨ Fix All (2 issues) with AI');
      expect(fixAll.command?.arguments?.[1]).toEqual(markers);
    });
  });

  describe('resolveCodeAction', () => {
    it('returns the code action unchanged', async () => {
      const action = { title: 'noop', kind: 'quickfix' } as Monaco.languages.CodeAction;
      const resolved = await provider.resolveCodeAction!(action, null as never);
      expect(resolved).toBe(action);
    });
  });

  describe('fixWithAI command', () => {
    it('converts the marker, applies the top suggestion, and reports success', async () => {
      const { editor, raw, runHandlers } = makeEditor();
      provider.registerCommandHandlers(editor, {} as never);
      expect(runHandlers.has('autofix.fixWithAI')).toBe(true);
      expect(runHandlers.has('autofix.fixAllWithAI')).toBe(true);

      const suggestion = makeSuggestion();
      generateFix.mockImplementation(async (error: DetectedError) => makeFix(error, [suggestion]));

      const model = makeModel('/src/app.ts');
      await runHandlers.get('autofix.fixWithAI')!(editor, model, makeMarker());

      const detected = generateFix.mock.calls[0]![0] as DetectedError;
      expect(detected.id).toMatch(UUID_RE);
      expect(detected.type).toBe('typescript');
      expect(detected.severity).toBe('error');
      expect(detected.message).toBe('Cannot find name foo');
      expect(detected.file).toBe('/src/app.ts');
      expect(detected.line).toBe(3);
      expect(detected.column).toBe(1);
      expect(detected.code).toBe('TS2304');

      expect(raw.executeEdits).toHaveBeenCalledWith('autofix', [
        {
          range: { startLineNumber: 3, startColumn: 1, endLineNumber: 3, endColumn: 42 },
          text: 'const foo = 1;',
          forceMoveMarkers: true,
        },
      ]);
      expect(raw.setPosition).toHaveBeenCalledWith({ lineNumber: 3, column: 1 });
      expect(raw.revealLineInCenter).toHaveBeenCalledWith(3);
      expect(onFixApplied).toHaveBeenCalledWith('Declare foo');
      expect(onFixFailed).not.toHaveBeenCalled();
    });

    it('maps warning eslint markers and object codes onto the detected error', async () => {
      const { editor, runHandlers } = makeEditor();
      provider.registerCommandHandlers(editor, {} as never);
      generateFix.mockImplementation(async (error: DetectedError) =>
        makeFix(error, [makeSuggestion()])
      );

      const marker = makeMarker({
        severity: 4,
        source: 'eslint',
        code: { value: 'semi' } as never,
      });
      await runHandlers.get('autofix.fixWithAI')!(editor, makeModel(), marker);

      const detected = generateFix.mock.calls[0]![0] as DetectedError;
      expect(detected.type).toBe('eslint');
      expect(detected.severity).toBe('warning');
      expect(detected.code).toBe('semi');
    });

    it('produces a fresh marker id for every invocation', async () => {
      const { editor, runHandlers } = makeEditor();
      provider.registerCommandHandlers(editor, {} as never);
      generateFix.mockImplementation(async (error: DetectedError) =>
        makeFix(error, [makeSuggestion()])
      );

      const model = makeModel();
      const marker = makeMarker();
      await runHandlers.get('autofix.fixWithAI')!(editor, model, marker);
      await runHandlers.get('autofix.fixWithAI')!(editor, model, marker);

      const idA = (generateFix.mock.calls[0]![0] as DetectedError).id;
      const idB = (generateFix.mock.calls[1]![0] as DetectedError).id;
      expect(idA).not.toBe(idB);
    });

    it('reports failure when no suggestions are generated', async () => {
      const { editor, raw, runHandlers } = makeEditor();
      provider.registerCommandHandlers(editor, {} as never);
      generateFix.mockImplementation(async (error: DetectedError) => makeFix(error, []));

      await runHandlers.get('autofix.fixWithAI')!(editor, makeModel(), makeMarker());

      expect(onFixFailed).toHaveBeenCalledTimes(1);
      expect((onFixFailed.mock.calls[0]![0] as Error).message).toBe('No fix suggestions generated');
      expect(raw.executeEdits).not.toHaveBeenCalled();
      expect(onFixApplied).not.toHaveBeenCalled();
    });

    it('reports failure when fix generation rejects', async () => {
      const { editor, runHandlers } = makeEditor();
      provider.registerCommandHandlers(editor, {} as never);
      generateFix.mockRejectedValue(new Error('AI unavailable'));

      await runHandlers.get('autofix.fixWithAI')!(editor, makeModel(), makeMarker());

      expect((onFixFailed.mock.calls[0]![0] as Error).message).toBe('AI unavailable');
    });

    it('swallows failures silently when no onFixFailed callback is configured', async () => {
      const silent = new AutoFixCodeActionProvider({
        autoFixService: { generateFix } as never,
        errorDetector: {} as never,
      });
      const { editor, runHandlers } = makeEditor();
      silent.registerCommandHandlers(editor, {} as never);
      generateFix.mockRejectedValue(new Error('AI unavailable'));

      await expect(
        runHandlers.get('autofix.fixWithAI')!(editor, makeModel(), makeMarker())
      ).resolves.toBeUndefined();
    });
  });

  describe('fixAllWithAI command', () => {
    it('applies every fixable marker and reports the aggregate count', async () => {
      const { editor, raw, runHandlers } = makeEditor();
      provider.registerCommandHandlers(editor, {} as never);
      generateFix.mockImplementation(async (error: DetectedError) =>
        makeFix(error, [makeSuggestion({ title: `fix ${error.message}` })])
      );

      const markers = [makeMarker(), makeMarker({ startLineNumber: 7, message: 'other' })];
      await runHandlers.get('autofix.fixAllWithAI')!(editor, makeModel(), markers);

      expect(generateFix).toHaveBeenCalledTimes(2);
      expect(raw.executeEdits).toHaveBeenCalledTimes(2);
      expect(onFixApplied).toHaveBeenCalledWith('Fixed 2 of 2 issues');
      expect(onFixFailed).not.toHaveBeenCalled();
    });

    it('keeps fixing after per-marker failures and reports both outcomes', async () => {
      const { editor, raw, runHandlers } = makeEditor();
      provider.registerCommandHandlers(editor, {} as never);
      generateFix
        .mockImplementationOnce(async (error: DetectedError) => makeFix(error, [makeSuggestion()]))
        .mockRejectedValueOnce(new Error('model timeout'))
        .mockImplementationOnce(async (error: DetectedError) => makeFix(error, []));

      const markers = [
        makeMarker({ message: 'first' }),
        makeMarker({ message: 'second' }),
        makeMarker({ message: 'third' }),
      ];
      await runHandlers.get('autofix.fixAllWithAI')!(editor, makeModel(), markers);

      // first fixed, second threw, third had no suggestions (skipped, not an error)
      expect(raw.executeEdits).toHaveBeenCalledTimes(1);
      expect(onFixApplied).toHaveBeenCalledWith('Fixed 1 of 3 issues');
      expect(onFixFailed).toHaveBeenCalledTimes(1);
      expect((onFixFailed.mock.calls[0]![0] as Error).message).toBe(
        'Some fixes failed: second: model timeout'
      );
    });

    it('reports a batch-level failure when the marker list is unusable', async () => {
      const { editor, runHandlers } = makeEditor();
      provider.registerCommandHandlers(editor, {} as never);

      await runHandlers.get('autofix.fixAllWithAI')!(editor, makeModel(), undefined);

      expect(onFixFailed).toHaveBeenCalledTimes(1);
      expect(onFixApplied).not.toHaveBeenCalled();
    });
  });
});
