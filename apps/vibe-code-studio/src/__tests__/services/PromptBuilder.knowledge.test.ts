/**
 * PromptBuilder knowledge injection tests (spec 04) — sibling of
 * PromptBuilder.standards.test.ts. Covers the buildKnowledgeSection call in
 * buildContextualSystemPrompt: the knowledge block reaching the prompt (via
 * a module mock), the context string handed to it, the no-current-file skip,
 * and the ''-when-no-items path exercised through the REAL module.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PromptBuilder } from '../../services/ai/PromptBuilder';
import type * as KnowledgeIntegration from '../../services/knowledge/knowledgeIntegration';
import type { AIContextRequest, EditorFile, WorkspaceContext } from '../../types';

const { readFileMock, buildKnowledgeSectionMock } = vi.hoisted(() => ({
  readFileMock: vi.fn(async (path: string): Promise<string> => {
    throw new Error(`ENOENT: ${path}`);
  }),
  buildKnowledgeSectionMock: vi.fn(async (_context: string): Promise<string> => ''),
}));

vi.mock('../../services/FileSystemService', () => ({
  FileSystemService: class {
    readFile(path: string): Promise<string> {
      return readFileMock(path);
    }
  },
}));

vi.mock('../../services/knowledge/knowledgeIntegration', () => ({
  buildKnowledgeSection: buildKnowledgeSectionMock,
}));

const ROOT = 'C:/ws';
const KNOWLEDGE_HEADER = 'WORKSPACE KNOWLEDGE ITEMS:';

const workspaceContext: WorkspaceContext = {
  rootPath: ROOT,
  totalFiles: 3,
  languages: ['TypeScript'],
  testFiles: 1,
  projectStructure: {},
  dependencies: {},
  exports: {},
  symbols: {},
  lastIndexed: new Date(),
  summary: 'Test workspace',
};

const currentFile: EditorFile = {
  id: 'file-1',
  name: 'App.tsx',
  path: `${ROOT}/App.tsx`,
  content: 'export const App = () => null;',
  language: 'typescript',
  isModified: false,
};

const makeRequest = (overrides: Partial<AIContextRequest> = {}): AIContextRequest => ({
  currentFile,
  relatedFiles: [],
  workspaceContext,
  userQuery: 'Explain this file',
  conversationHistory: [],
  ...overrides,
});

beforeEach(() => {
  PromptBuilder.clearRulesCache();
  readFileMock.mockReset();
  readFileMock.mockImplementation(async (path: string): Promise<string> => {
    throw new Error(`ENOENT: ${path}`);
  });
  buildKnowledgeSectionMock.mockReset();
  buildKnowledgeSectionMock.mockResolvedValue('');
});

describe('PromptBuilder.buildContextualSystemPrompt — knowledge items (spec 04)', () => {
  it('appends the knowledge section built from root + file + query context', async () => {
    const block = [
      '',
      '',
      KNOWLEDGE_HEADER,
      '<!-- knowledge: knowledge-1 (manual) -->',
      '### Ports',
      'Vite uses 5173.',
      '',
    ].join('\n');
    buildKnowledgeSectionMock.mockResolvedValueOnce(block);

    const prompt = await PromptBuilder.buildContextualSystemPrompt(makeRequest());

    expect(buildKnowledgeSectionMock).toHaveBeenCalledWith(`${ROOT} App.tsx Explain this file`);
    expect(prompt).toContain(KNOWLEDGE_HEADER);
    expect(prompt).toContain('<!-- knowledge: knowledge-1 (manual) -->');
    expect(prompt).toContain('Vite uses 5173.');
  });

  it('skips knowledge injection entirely when there is no current file', async () => {
    const prompt = await PromptBuilder.buildContextualSystemPrompt(
      makeRequest({ currentFile: undefined })
    );

    expect(buildKnowledgeSectionMock).not.toHaveBeenCalled();
    expect(prompt).not.toContain(KNOWLEDGE_HEADER);
  });

  it('keeps the prompt clean when the REAL module has no items (empty-section path)', async () => {
    const actual = await vi.importActual<typeof KnowledgeIntegration>(
      '../../services/knowledge/knowledgeIntegration'
    );
    actual.resetKnowledgeForTests();
    buildKnowledgeSectionMock.mockImplementationOnce(actual.buildKnowledgeSection);

    const prompt = await PromptBuilder.buildContextualSystemPrompt(makeRequest());

    expect(buildKnowledgeSectionMock).toHaveBeenCalledTimes(1);
    expect(prompt).not.toContain(KNOWLEDGE_HEADER);
    expect(prompt).not.toContain('<!-- knowledge:');
  });
});
