/**
 * Chat PromptBuilder — full-file tests.
 *
 * Covers loadAgentsStandards (cache miss -> loader -> cache set, cache hit
 * early-return, empty-section caching), the buildContextualSystemPrompt
 * injection inside the workspace+currentFile guard, clearRulesCache clearing
 * the standards cache, all three buildBaseSystemPrompt model branches, the
 * workspace / user-activity section conditionals, current-file and
 * related-file truncation, loadCustomRules (.deepcoderules success, legacy
 * .cursorrules fallback, cache hit, no-rules catch), and the static
 * completion / explanation / refactor prompt helpers.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PromptBuilder } from '../../services/ai/PromptBuilder';
import type { AIContextRequest, EditorFile, UserActivity, WorkspaceContext } from '../../types';

const { readFileMock } = vi.hoisted(() => ({
  readFileMock: vi.fn(async (path: string): Promise<string> => {
    throw new Error(`ENOENT: ${path}`);
  }),
}));

vi.mock('../../services/FileSystemService', () => ({
  FileSystemService: class {
    readFile(path: string): Promise<string> {
      return readFileMock(path);
    }
  },
}));

const ROOT = 'C:/ws';
const AGENTS_PATH = `${ROOT}/AGENTS.md`;
const STANDARDS_HEADER = 'PROJECT AGENT STANDARDS (AGENTS.md):';
const BASE_PROMPT_MARKER = 'expert programming assistant built into Vibe Code Studio';

const agentsReadCount = (): number =>
  readFileMock.mock.calls.filter(([path]) => path === AGENTS_PATH).length;

const deepcodeReadCount = (): number =>
  readFileMock.mock.calls.filter(([path]) => path === `${ROOT}/.deepcoderules`).length;

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

/** Only AGENTS.md resolves; rules files and everything else stay absent. */
const withAgentsMd = (): void => {
  readFileMock.mockImplementation(async (path: string): Promise<string> => {
    if (path === AGENTS_PATH) {
      return '# Team standards\nAlways use pnpm.';
    }
    throw new Error(`ENOENT: ${path}`);
  });
};

beforeEach(() => {
  PromptBuilder.clearRulesCache();
  readFileMock.mockReset();
  readFileMock.mockImplementation(async (path: string): Promise<string> => {
    throw new Error(`ENOENT: ${path}`);
  });
});

describe('PromptBuilder.buildContextualSystemPrompt — AGENTS.md standards', () => {
  it('injects the standards section when AGENTS.md exists at the workspace root', async () => {
    withAgentsMd();

    const prompt = await PromptBuilder.buildContextualSystemPrompt(makeRequest());

    expect(prompt).toContain(STANDARDS_HEADER);
    expect(prompt).toContain(`<!-- source: ${AGENTS_PATH} -->`);
    expect(prompt).toContain('Always use pnpm.');
    expect(agentsReadCount()).toBe(1);
  });

  it('serves the second call from the standards cache (early-return)', async () => {
    withAgentsMd();

    const first = await PromptBuilder.buildContextualSystemPrompt(makeRequest());
    const readsAfterFirst = agentsReadCount();
    const second = await PromptBuilder.buildContextualSystemPrompt(makeRequest());

    expect(readsAfterFirst).toBe(1);
    expect(agentsReadCount()).toBe(readsAfterFirst); // no new AGENTS.md read
    expect(first).toContain(STANDARDS_HEADER);
    expect(second).toContain(STANDARDS_HEADER);
  });

  it('clearRulesCache clears the standards cache and forces a re-read', async () => {
    withAgentsMd();

    await PromptBuilder.buildContextualSystemPrompt(makeRequest());
    expect(agentsReadCount()).toBe(1);

    PromptBuilder.clearRulesCache();
    const prompt = await PromptBuilder.buildContextualSystemPrompt(makeRequest());

    expect(agentsReadCount()).toBe(2);
    expect(prompt).toContain(STANDARDS_HEADER);
  });

  it('skips standards loading entirely when there is no current file', async () => {
    withAgentsMd();

    const prompt = await PromptBuilder.buildContextualSystemPrompt(
      makeRequest({ currentFile: undefined })
    );

    expect(prompt).not.toContain(STANDARDS_HEADER);
    expect(agentsReadCount()).toBe(0);
  });

  it('injects standards alongside custom rules, user activity, and related files', async () => {
    readFileMock.mockImplementation(async (path: string): Promise<string> => {
      if (path === AGENTS_PATH) {
        return '# Team standards\nAlways use pnpm.';
      }
      if (path === `${ROOT}/.deepcoderules`) {
        return 'Prefer functional components everywhere.';
      }
      throw new Error(`ENOENT: ${path}`);
    });
    const userActivity: UserActivity = {
      openFiles: [currentFile],
      sidebarOpen: true,
      previewOpen: false,
      aiChatOpen: true,
      recentFiles: [`${ROOT}/App.tsx`],
      workspaceFolder: ROOT,
    };
    const request = makeRequest({
      userActivity,
      relatedFiles: [
        {
          path: `${ROOT}/util.ts`,
          content: 'export const x = 1;',
          relevance: 0.9,
          reason: 'import',
        },
      ],
    });

    const prompt = await PromptBuilder.buildContextualSystemPrompt(request);

    expect(prompt).toContain('PROJECT-SPECIFIC CUSTOM INSTRUCTIONS:');
    expect(prompt).toContain('Prefer functional components everywhere.');
    expect(prompt).toContain(STANDARDS_HEADER);
    expect(prompt).toContain('User Activity Context:');
    expect(prompt).toContain('Related Files:');
    expect(prompt).toContain(`${ROOT}/util.ts`);
  });

  it('caches the empty section when no AGENTS.md exists anywhere', async () => {
    // Default readFileMock implementation: every read throws (file absent).
    const first = await PromptBuilder.buildContextualSystemPrompt(makeRequest());
    const readsAfterFirst = agentsReadCount();
    const second = await PromptBuilder.buildContextualSystemPrompt(makeRequest());

    expect(first).not.toContain(STANDARDS_HEADER);
    expect(first).toContain(BASE_PROMPT_MARKER);
    expect(second).not.toContain(STANDARDS_HEADER);
    // The '' result was cached, so the second call did not probe AGENTS.md again.
    expect(readsAfterFirst).toBe(1);
    expect(agentsReadCount()).toBe(readsAfterFirst);
  });

  it('truncates long current-file and related-file content', async () => {
    const prompt = await PromptBuilder.buildContextualSystemPrompt(
      makeRequest({
        currentFile: { ...currentFile, content: 'x'.repeat(1200) },
        relatedFiles: [
          { path: `${ROOT}/big.ts`, content: 'y'.repeat(250), relevance: 0.5, reason: 'related' },
        ],
      })
    );

    expect(prompt).toContain(`${'x'.repeat(1000)}...`);
    expect(prompt).not.toContain('x'.repeat(1001));
    expect(prompt).toContain(`${'y'.repeat(200)}...`);
    expect(prompt).not.toContain('y'.repeat(201));
  });
});

describe('PromptBuilder.buildBaseSystemPrompt — model branches', () => {
  it('appends the deepseek capability suffix for deepseek/deepseek-v3.2', () => {
    const prompt = PromptBuilder.buildBaseSystemPrompt('deepseek/deepseek-v3.2');

    expect(prompt).toContain('You are an elite programming AI in Vibe Code Studio.');
    expect(prompt).toContain('Your specialized capabilities:');
    expect(prompt).toContain('5-Branch Tree-of-Thought');
  });

  it('appends the structured-reasoning suffix for openai/gpt-5.2-codex', () => {
    const prompt = PromptBuilder.buildBaseSystemPrompt('openai/gpt-5.2-codex');

    expect(prompt).toContain('You are GPT-5.2 Codex in Vibe Code Studio.');
    expect(prompt).toContain('Your approach:');
  });

  it('falls back to the default capability suffix when no model is given', () => {
    const prompt = PromptBuilder.buildBaseSystemPrompt();

    expect(prompt).toContain(BASE_PROMPT_MARKER);
    expect(prompt).toContain('Your capabilities:');
  });
});

describe('PromptBuilder section builders', () => {
  it('buildWorkspaceSection renders summary and dependencies when present', () => {
    const section = PromptBuilder.buildWorkspaceSection({
      ...workspaceContext,
      dependencies: { react: [], vite: [] },
    });

    expect(section).toContain(`- Root: ${ROOT}`);
    expect(section).toContain('- Files: 3 total');
    expect(section).toContain('- Summary: Test workspace');
    expect(section).toContain('- Dependencies: react, vite');
  });

  it('buildWorkspaceSection omits summary and dependencies when empty', () => {
    const section = PromptBuilder.buildWorkspaceSection({
      ...workspaceContext,
      summary: '',
      dependencies: {},
    });

    expect(section).not.toContain('- Summary:');
    expect(section).not.toContain('- Dependencies:');
  });

  it('buildUserActivitySection renders selection, modified marker, and recents', () => {
    const section = PromptBuilder.buildUserActivitySection({
      openFiles: [{ ...currentFile, isModified: true }],
      sidebarOpen: true,
      previewOpen: true,
      aiChatOpen: true,
      currentSelection: {
        startLine: 3,
        startColumn: 1,
        endLine: 9,
        endColumn: 5,
        selectedText: 'const x = 1;',
      },
      recentFiles: ['a.ts', 'b.ts', 'c.ts', 'd.ts'],
      workspaceFolder: ROOT,
    });

    expect(section).toContain(`- Workspace Folder: ${ROOT}`);
    expect(section).toContain('App.tsx (modified)');
    expect(section).toContain('- Sidebar: Visible (file explorer)');
    expect(section).toContain('- Preview Panel: Open');
    expect(section).toContain('- AI Chat: Active');
    expect(section).toContain('- Current Selection: Lines 3-9');
    expect(section).toContain('- Recently Accessed: a.ts, b.ts, c.ts');
    expect(section).not.toContain('d.ts'); // recents capped at 3
  });

  it('buildUserActivitySection omits the optional parts on the quiet side', () => {
    const section = PromptBuilder.buildUserActivitySection({
      openFiles: [currentFile],
      sidebarOpen: false,
      previewOpen: false,
      aiChatOpen: false,
      recentFiles: [],
      workspaceFolder: null,
    });

    expect(section).toContain('- Workspace Folder: None');
    expect(section).toContain('- Sidebar: Hidden (file explorer)');
    expect(section).toContain('- Preview Panel: Closed');
    expect(section).toContain('- AI Chat: Inactive');
    expect(section).not.toContain('- Current Selection:');
    expect(section).not.toContain('- Recently Accessed:');
    expect(section).not.toContain('(modified)');
  });
});

describe('PromptBuilder.loadCustomRules — rules file variants', () => {
  const DEEPCODE_RULES = [
    '---',
    'description: React rules',
    'globs: ["**/*.tsx"]',
    'priority: high',
    '---',
    'Use functional components.',
    '---',
    'alwaysApply: true',
    '---',
    'Keep functions small.',
  ].join('\n');

  it('loads .deepcoderules, renders described and anonymous rules, and caches', async () => {
    readFileMock.mockImplementation(async (path: string): Promise<string> => {
      if (path === `${ROOT}/.deepcoderules`) {
        return DEEPCODE_RULES;
      }
      throw new Error(`ENOENT: ${path}`);
    });

    const prompt = await PromptBuilder.buildContextualSystemPrompt(makeRequest());

    expect(prompt).toContain('PROJECT-SPECIFIC CUSTOM INSTRUCTIONS:');
    expect(prompt).toContain('### React rules'); // rule with description
    expect(prompt).toContain('Use functional components.');
    expect(prompt).toContain('### Custom Rule 2'); // rule without description
    expect(prompt).toContain('Keep functions small.');

    const readsAfterFirst = deepcodeReadCount();
    await PromptBuilder.buildContextualSystemPrompt(makeRequest());
    expect(readsAfterFirst).toBe(1);
    expect(deepcodeReadCount()).toBe(readsAfterFirst); // rules cache hit
  });

  it('falls back to legacy .cursorrules when .deepcoderules is absent', async () => {
    readFileMock.mockImplementation(async (path: string): Promise<string> => {
      if (path === `${ROOT}/.cursorrules`) {
        return 'Legacy cursor rules body.';
      }
      throw new Error(`ENOENT: ${path}`);
    });

    const prompt = await PromptBuilder.buildContextualSystemPrompt(makeRequest());

    expect(prompt).toContain('PROJECT-SPECIFIC CUSTOM INSTRUCTIONS:');
    expect(prompt).toContain('### Custom Rule 1');
    expect(prompt).toContain('Legacy cursor rules body.');
  });

  it('buildCustomRulesSection returns an empty string for zero rules (guard)', () => {
    // The public path always guards on customRules.length > 0, so the internal
    // empty-rules guard is only reachable by calling the private static directly.
    const section = (
      PromptBuilder as unknown as { buildCustomRulesSection: (rules: unknown[]) => string }
    ).buildCustomRulesSection([]);

    expect(section).toBe('');
  });
});

describe('PromptBuilder static prompt helpers', () => {
  it('buildCodeCompletionPrompt embeds code, language, and position', () => {
    const prompt = PromptBuilder.buildCodeCompletionPrompt('const a = 1;', 'typescript', {
      line: 4,
      column: 7,
    });

    expect(prompt).toContain('Complete the following typescript code.');
    expect(prompt).toContain('const a = 1;');
    expect(prompt).toContain('Complete from line 4, column 7.');
  });

  it('buildCodeExplanationPrompt asks for a detailed explanation', () => {
    const prompt = PromptBuilder.buildCodeExplanationPrompt('let x = 2;', 'javascript');

    expect(prompt).toContain('Explain this javascript code in detail:');
    expect(prompt).toContain('let x = 2;');
    expect(prompt).toContain('3. Any potential issues or improvements');
  });

  it('buildRefactorPrompt asks for refactored code with explanations', () => {
    const prompt = PromptBuilder.buildRefactorPrompt('def f(): pass', 'python');

    expect(prompt).toContain('Refactor this python code');
    expect(prompt).toContain('def f(): pass');
    expect(prompt).toContain('Provide the refactored code with explanations of the changes made.');
  });
});
