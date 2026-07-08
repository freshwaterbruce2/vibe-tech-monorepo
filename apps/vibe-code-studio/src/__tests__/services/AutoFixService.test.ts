/**
 * AutoFixService tests
 *
 * Real behavioral tests for AI fix generation: model selection, prompt
 * building (language fences), response parsing, the shadow-validation loop
 * (crypto.randomUUID shadow URIs), caching, and error propagation. The AI
 * service is mocked; `monaco-editor` (dynamically imported by the shadow
 * validator) is replaced with a controllable in-file mock.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type * as Monaco from 'monaco-editor';

import { AutoFixService, type DetectedError } from '../../services/AutoFixService';

type MarkerLike = { startLineNumber: number; message: string };

const monacoMock = vi.hoisted(() => {
  type ShadowModel = {
    value: string;
    disposed: boolean;
    setValue: (v: string) => void;
    dispose: () => void;
  };
  const models: ShadowModel[] = [];
  const state = {
    shadowMarkers: [] as MarkerLike[],
    originalMarkers: [] as MarkerLike[],
    throwOnGetMarkers: false,
  };
  const Uri = {
    parse: (value: string) => ({ path: value, toString: () => value }),
  };
  const editor = {
    createModel: (value: string) => {
      const model: ShadowModel = {
        value,
        disposed: false,
        setValue(v: string) {
          this.value = v;
        },
        dispose() {
          this.disposed = true;
        },
      };
      models.push(model);
      return model;
    },
    getModelMarkers: ({ resource }: { resource: { path: string } }) => {
      if (state.throwOnGetMarkers) {
        throw new Error('marker service unavailable');
      }
      return resource.path.startsWith('inmemory://') ? state.shadowMarkers : state.originalMarkers;
    },
  };
  const reset = () => {
    models.length = 0;
    state.shadowMarkers = [];
    state.originalMarkers = [];
    state.throwOnGetMarkers = false;
  };
  return { Uri, editor, models, state, reset };
});

vi.mock('monaco-editor', () => ({
  Uri: monacoMock.Uri,
  editor: monacoMock.editor,
  default: { Uri: monacoMock.Uri, editor: monacoMock.editor },
}));

const SHADOW_URI_RE =
  /^inmemory:\/\/shadow-validation\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(ts|js)$/;

function makeError(overrides: Partial<DetectedError> = {}): DetectedError {
  return {
    id: 'e1',
    type: 'typescript',
    severity: 'error',
    message: 'Cannot find name foo',
    file: '/test/file.ts',
    line: 3,
    column: 1,
    code: 'TS2304',
    ...overrides,
  };
}

function makeEditor(content: string, path: string, languageId: string) {
  return {
    getModel: () => ({
      getValue: () => content,
      getLanguageId: () => languageId,
      uri: { path },
    }),
  } as unknown as Monaco.editor.IStandaloneCodeEditor;
}

function makeAI(response: string) {
  const sendContextualMessage = vi.fn(async (_request: { userQuery: string }) => ({
    content: response,
  }));
  const setModel = vi.fn();
  const ai = { sendContextualMessage, setModel };
  return { ai: ai as never, sendContextualMessage, setModel };
}

const CONTENT = ['line1', 'line2', 'foo();', 'line4'].join('\n');

const RESPONSE_ONE_BLOCK =
  'This declares foo before use so the reference resolves cleanly.\n' +
  '1. Declare foo\n```typescript\nconst foo = () => {};\nfoo();\n```\n';

describe('AutoFixService', () => {
  beforeEach(() => {
    monacoMock.reset();
  });

  it('requires an AI service', () => {
    expect(() => new AutoFixService(undefined as never)).toThrow('AI service is required');
  });

  it('generates, validates, and boosts a fix when the shadow model is clean', async () => {
    const { ai, sendContextualMessage, setModel } = makeAI(RESPONSE_ONE_BLOCK);
    const service = new AutoFixService(ai);
    const editor = makeEditor(CONTENT, '/test/file.ts', 'typescript');

    const fix = await service.generateFix(makeError(), editor);

    expect(setModel).toHaveBeenCalledWith('moonshot/kimi-2.5-pro');
    const prompt = (sendContextualMessage.mock.calls[0]![0] as { userQuery: string }).userQuery;
    expect(prompt).toContain('```typescript');
    expect(prompt).toContain('Error Code: TS2304');

    expect(fix.suggestions).toHaveLength(1);
    const suggestion = fix.suggestions[0]!;
    expect(suggestion.validated).toBe(true);
    expect(suggestion.confidence).toBe('high');
    expect(suggestion.id).toBe('fix-e1-1');
    expect(suggestion.title).toBe('Fix Suggestion 1');
    expect(suggestion.code).toContain('const foo = () => {};');
    expect(fix.explanation).toContain('declares foo before use');
    expect(fix.modelUsed).toBe('claude-haiku-4.5');
    expect(typeof fix.generationTime).toBe('number');

    // Shadow model was created against a UUID inmemory URI, patched, disposed.
    expect(monacoMock.models).toHaveLength(1);
    const shadow = monacoMock.models[0]!;
    expect(shadow.disposed).toBe(true);
    expect(shadow.value).toContain('const foo = () => {};');
  });

  it('parses shadow URIs with crypto.randomUUID and a language-matched extension', async () => {
    const parseSpy = vi.spyOn(monacoMock.Uri, 'parse');
    const { ai } = makeAI(RESPONSE_ONE_BLOCK);
    const service = new AutoFixService(ai);

    await service.generateFix(makeError(), makeEditor(CONTENT, '/test/file.ts', 'typescript'));

    const shadowUri = parseSpy.mock.calls
      .map(call => call[0])
      .find(value => value.startsWith('inmemory://'));
    expect(shadowUri).toMatch(SHADOW_URI_RE);
    expect(shadowUri!.endsWith('.ts')).toBe(true);
    parseSpy.mockRestore();
  });

  it('demotes a suggestion when the original error survives in the shadow model', async () => {
    const error = makeError();
    monacoMock.state.shadowMarkers = [{ startLineNumber: 3, message: error.message }];

    const { ai } = makeAI(RESPONSE_ONE_BLOCK);
    const service = new AutoFixService(ai);
    const fix = await service.generateFix(error, makeEditor(CONTENT, error.file, 'typescript'));

    expect(fix.suggestions[0]!.validated).toBe(false);
    expect(fix.suggestions[0]!.confidence).toBe('low');
  });

  it('demotes a suggestion when the patch introduces new errors', async () => {
    monacoMock.state.shadowMarkers = [{ startLineNumber: 1, message: 'brand new problem' }];
    monacoMock.state.originalMarkers = [];

    const { ai } = makeAI(RESPONSE_ONE_BLOCK);
    const service = new AutoFixService(ai);
    const fix = await service.generateFix(
      makeError(),
      makeEditor(CONTENT, '/test/file.ts', 'typescript')
    );

    expect(fix.suggestions[0]!.validated).toBe(false);
    expect(fix.suggestions[0]!.confidence).toBe('low');
  });

  it('treats a validation crash as an unvalidated suggestion, not a failure', async () => {
    monacoMock.state.throwOnGetMarkers = true;

    const { ai } = makeAI(RESPONSE_ONE_BLOCK);
    const service = new AutoFixService(ai);
    const fix = await service.generateFix(
      makeError(),
      makeEditor(CONTENT, '/test/file.ts', 'typescript')
    );

    expect(fix.suggestions[0]!.validated).toBe(false);
    expect(monacoMock.models[0]!.disposed).toBe(true);
  });

  it('orders validated suggestions ahead of unvalidated ones', async () => {
    const error = makeError();
    // Two code blocks: fail validation for the first patch only (it still
    // contains the offending call at the error line).
    const response =
      '1. Bad fix\n```typescript\nfoo();\n```\n' +
      '2. Good fix\n```typescript\nconst foo = () => {};\nfoo();\n```\n';
    monacoMock.state.shadowMarkers = [];
    let call = 0;
    const original = monacoMock.editor.getModelMarkers;
    monacoMock.editor.getModelMarkers = ((args: { resource: { path: string } }) => {
      if (args.resource.path.startsWith('inmemory://')) {
        call += 1;
        // First suggestion's shadow check still shows the error; second is clean.
        return call === 1 ? [{ startLineNumber: 3, message: error.message }] : [];
      }
      return [];
    }) as typeof monacoMock.editor.getModelMarkers;

    try {
      const { ai } = makeAI(response);
      const service = new AutoFixService(ai);
      const fix = await service.generateFix(error, makeEditor(CONTENT, error.file, 'typescript'));

      expect(fix.suggestions).toHaveLength(2);
      expect(fix.suggestions[0]!.validated).toBe(true);
      expect(fix.suggestions[0]!.code).toContain('const foo = () => {};');
      expect(fix.suggestions[1]!.validated).toBe(false);
    } finally {
      monacoMock.editor.getModelMarkers = original;
    }
  });

  it('falls back to a single raw suggestion when the response has no code block', async () => {
    const { ai } = makeAI('Just rename the variable to bar and re-run the compiler.');
    const service = new AutoFixService(ai);
    const fix = await service.generateFix(
      makeError(),
      makeEditor(CONTENT, '/test/file.ts', 'typescript')
    );

    expect(fix.suggestions).toHaveLength(1);
    expect(fix.suggestions[0]!.id).toBe('fix-e1-1');
    expect(fix.suggestions[0]!.title).toBe('AI Suggestion');
    expect(fix.suggestions[0]!.code).toBe(
      'Just rename the variable to bar and re-run the compiler.'
    );
  });

  it('uses a default description when the code block has no preceding text', async () => {
    const { ai } = makeAI('```typescript\nconst foo = () => {};\nfoo();\n```');
    const service = new AutoFixService(ai);
    const fix = await service.generateFix(
      makeError(),
      makeEditor(CONTENT, '/test/file.ts', 'typescript')
    );

    expect(fix.suggestions[0]!.description).toBe('Apply this fix to resolve the error');
  });

  it('serves a cached fix without a second AI call when the file is unchanged', async () => {
    const { ai, sendContextualMessage } = makeAI(RESPONSE_ONE_BLOCK);
    const service = new AutoFixService(ai);
    const editor = makeEditor(CONTENT, '/test/file.ts', 'typescript');
    const error = makeError();

    const first = await service.generateFix(error, editor);
    const second = await service.generateFix(error, editor);

    expect(second).toBe(first);
    expect(sendContextualMessage).toHaveBeenCalledTimes(1);
  });

  it('wraps AI transport failures in a descriptive error', async () => {
    const sendContextualMessage = vi.fn(async () => {
      throw new Error('socket hang up');
    });
    const service = new AutoFixService({ sendContextualMessage } as never);

    await expect(
      service.generateFix(makeError(), makeEditor(CONTENT, '/test/file.ts', 'typescript'))
    ).rejects.toThrow('AI service error: socket hang up');
  });

  it('throws when the editor has no model', async () => {
    const { ai } = makeAI(RESPONSE_ONE_BLOCK);
    const service = new AutoFixService(ai);
    const editor = { getModel: () => null } as unknown as Monaco.editor.IStandaloneCodeEditor;

    await expect(service.generateFix(makeError(), editor)).rejects.toThrow(
      'Editor model not found'
    );
  });

  describe('prompt language fences', () => {
    async function promptFor(path: string, languageId: string, message = 'Cannot find name foo') {
      const { ai, sendContextualMessage } = makeAI(RESPONSE_ONE_BLOCK);
      const service = new AutoFixService(ai);
      const error = makeError({ file: path, message });
      await service.generateFix(error, makeEditor(CONTENT, path, languageId));
      return (sendContextualMessage.mock.calls[0]![0] as { userQuery: string }).userQuery;
    }

    it('uses a tsx fence for TypeScript React files', async () => {
      const prompt = await promptFor('/test/App.tsx', 'typescriptreact');
      expect(prompt).toContain('```tsx');
      expect(prompt).toContain('Target Language: TypeScript (TSX)');
    });

    it('uses a jsx fence and bans TS syntax for JavaScript React files', async () => {
      const prompt = await promptFor('/test/App.jsx', 'javascriptreact');
      expect(prompt).toContain('```jsx');
      expect(prompt).toContain('Do NOT use TypeScript-only syntax');
    });

    it('uses a javascript fence and bans TS syntax for plain JS files', async () => {
      const prompt = await promptFor('/test/util.js', 'javascript');
      expect(prompt).toContain('```javascript');
      expect(prompt).toContain('Target Language: JavaScript');
      expect(prompt).toContain('use JSDoc comments instead');
    });

    it('defaults to a typescript fence for unknown languages', async () => {
      const prompt = await promptFor('/test/data.xyz', 'plaintext');
      expect(prompt).toContain('```typescript');
    });
  });

  describe('model selection', () => {
    it('honors an explicitly preferred model', async () => {
      const { ai } = makeAI(RESPONSE_ONE_BLOCK);
      const service = new AutoFixService(ai, { preferredModel: 'claude-sonnet-4.5' });
      const fix = await service.generateFix(
        makeError(),
        makeEditor(CONTENT, '/test/file.ts', 'typescript')
      );
      expect(fix.modelUsed).toBe('claude-sonnet-4.5');
    });

    it('routes complex errors with stack traces to the stronger model', async () => {
      const { ai } = makeAI(RESPONSE_ONE_BLOCK);
      const service = new AutoFixService(ai);
      const error = makeError({
        type: 'runtime',
        code: undefined,
        message: 'Unhandled rejection with a long diagnostic message that is clearly not simple',
        stackTrace: 'at boom (/test/file.ts:3:1)',
      });
      const fix = await service.generateFix(
        error,
        makeEditor(CONTENT, '/test/file.ts', 'typescript')
      );
      expect(fix.modelUsed).toBe('claude-sonnet-4.5');
    });
  });
});
