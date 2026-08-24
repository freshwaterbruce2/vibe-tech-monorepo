/**
 * TaskPlanner — full-file tests (spec 03 wiring + Phase 6 confidence planning).
 *
 * Covers the AGENTS.md standards load in planTask (fileSystemService present
 * vs absent), the extracted detectProjectStructure helper (success path plus
 * web-mode warn / electron error catch branches and the null-detector guard),
 * the buildAiContextRequest currentFile ternary branches,
 * planTaskWithConfidence / planTaskEnhanced insights math, and the thin
 * validateTask / calculateStepConfidence / generateFallbackPlans wrappers.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  resetStandardsSettingsForTests,
  setStandardsSetting,
} from '../../services/ai/standards/standardsSettings';
import { StrategyMemory } from '../../services/ai/StrategyMemory';
import { AGENT_PLANNING_TIMEOUT_MS, TaskPlanner } from '../../services/ai/TaskPlanner';
import { AGENT_PLAN_JSON_SCHEMA } from '../../services/agent-runtime/contracts/AgentPlan';
import type { UnifiedAIService } from '../../services/ai/UnifiedAIService';
import type { FileSystemService } from '../../services/FileSystemService';
import { logger } from '../../services/Logger';
import type {
  AgentStep,
  AgentTask,
  EnhancedAgentStep,
  StepConfidence,
  TaskPlanRequest,
} from '../../types';
import { ProjectStructureDetector } from '../../utils/ProjectStructureDetector';
import type { ProjectStructure } from '../../utils/ProjectStructureDetector';

const ROOT = '/ws';
const CURRENT_FILE = `${ROOT}/src/App.tsx`;
const STANDARDS_HEADER = 'PROJECT AGENT STANDARDS (AGENTS.md):';
const AGENTS_MD_BODY = '# Standards\nUse pnpm only.';

const PLAN_JSON = JSON.stringify({
  schemaVersion: 1,
  title: 'Read the current file',
  description: 'Reads one file',
  reasoning: 'A single read suffices',
  steps: [
    {
      title: 'Read file',
      description: 'Read the target file',
      action: { type: 'read_file', params: { filePath: CURRENT_FILE } },
      requiresApproval: false,
      maxRetries: 1,
    },
  ],
});

/** Shape TaskPlanner actually sends to sendContextualMessage. */
interface SentContextRequest {
  userQuery: string;
  currentFile?: { path: string; language: string; content: string };
  fileContent?: string;
}

const makeAiService = (content: string = PLAN_JSON) => {
  const sendContextualMessage = vi.fn(
    async (_req: SentContextRequest): Promise<{ content: string }> => ({ content })
  );
  return {
    sendContextualMessage,
    aiService: {
      sendContextualMessage,
      getModel: () => 'deepseek/deepseek-v4-pro',
    } as unknown as UnifiedAIService,
  };
};

/** Builds a fenced-JSON AI response with the given plan steps. */
const planJsonFor = (
  steps: Array<{ type: string; params: Record<string, unknown>; description?: string }>
): string =>
  JSON.stringify({
    schemaVersion: 1,
    title: 'Multi-step plan',
    description: 'plan',
    reasoning: 'because',
    steps: steps.map((step, index) => ({
      title: `Step ${index + 1}`,
      description: step.description ?? `Step ${index + 1} description`,
      action: { type: step.type, params: step.params },
      requiresApproval: false,
      maxRetries: 1,
    })),
  });

const DEFAULT_FILE_CONTENTS: Record<string, string> = {
  [`${ROOT}/AGENTS.md`]: AGENTS_MD_BODY,
  [CURRENT_FILE]: 'export const App = () => null;',
  [`${ROOT}/package.json`]: '{"name":"planner-fixture"}',
  [`${ROOT}/tsconfig.json`]: '{"compilerOptions":{}}',
  [`${ROOT}/src/index.ts`]: 'export {};',
};

const normalizeFixturePath = (path: string): string => path.replace(/\\/g, '/').replace(/\/+$/, '');

const parentFixturePath = (path: string): string => path.slice(0, path.lastIndexOf('/'));

/** File system fixture with exact files and derivable parent-directory listings. */
const makeFileSystemService = (extraFiles: Record<string, string> = {}): FileSystemService => {
  const files = new Map(
    Object.entries({ ...DEFAULT_FILE_CONTENTS, ...extraFiles }).map(([path, content]) => [
      normalizeFixturePath(path),
      content,
    ])
  );
  const directories = new Set<string>();
  for (const path of files.keys()) {
    let directory = parentFixturePath(path);
    while (directory) {
      directories.add(directory);
      if (directory === ROOT) break;
      directory = parentFixturePath(directory);
    }
  }
  const stub = {
    readFile: vi.fn(async (path: string): Promise<string> => {
      const content = files.get(normalizeFixturePath(path));
      if (content !== undefined) return content;
      throw new Error(`ENOENT: ${normalizeFixturePath(path)}`);
    }),
    listDirectory: vi.fn(async (path: string) => {
      const directory = normalizeFixturePath(path);
      if (!directories.has(directory)) throw new Error(`ENOENT: ${directory}`);
      return [...files.keys()]
        .filter(filePath => parentFixturePath(filePath) === directory)
        .map(filePath => ({
          name: filePath.slice(filePath.lastIndexOf('/') + 1),
          path: filePath,
          type: 'file' as const,
        }));
    }),
    getFileStats: vi.fn(async (path: string) => {
      const target = normalizeFixturePath(path);
      if (files.has(target)) {
        return { size: files.get(target)?.length ?? 0, isDirectory: false };
      }
      if (directories.has(target)) return { size: 0, isDirectory: true };
      throw new Error(`ENOENT: ${target}`);
    }),
    exists: vi.fn(async (path: string) => files.has(normalizeFixturePath(path))),
    resolveWorkspacePath: vi.fn((path: string, workspaceRoot = ROOT) => {
      const normalizedPath = normalizeFixturePath(path);
      return normalizedPath.startsWith('/')
        ? normalizedPath
        : `${normalizeFixturePath(workspaceRoot)}/${normalizedPath}`;
    }),
  };
  return stub as unknown as FileSystemService;
};

const makeRequest = (overrides: Partial<TaskPlanRequest> = {}): TaskPlanRequest => ({
  userRequest: 'Review the login form',
  context: { workspaceRoot: ROOT, currentFile: CURRENT_FILE },
  ...overrides,
});

const win = window as unknown as { electron?: { isElectron?: boolean } };

beforeEach(() => {
  // Standards toggles (spec 03 AC #10): start each test from all-on defaults
  // without the global electron.store mock's file-lifetime Map.
  delete win.electron;
  localStorage.clear();
  resetStandardsSettingsForTests();
});

afterEach(() => {
  delete win.electron;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('TaskPlanner planTask — AGENTS.md standards wiring', () => {
  it('advertises executable action parameters in the strict provider schema', () => {
    const params =
      AGENT_PLAN_JSON_SCHEMA.properties.steps.items.properties.action.properties.params.properties;

    expect(params.filePath).toMatchObject({ type: 'string', minLength: 1 });
    expect(params.projectName).toMatchObject({ type: 'string', minLength: 1 });
    expect(params.workspaceRoot).toMatchObject({ type: 'string', minLength: 1 });
  });

  it('rejects a pre-aborted request before calling the provider', async () => {
    const caller = new AbortController();
    caller.abort();
    const sendContextualMessage = vi.fn();
    const planner = new TaskPlanner({ sendContextualMessage } as unknown as UnifiedAIService);

    await expect(planner.planTask(makeRequest({ signal: caller.signal }))).rejects.toMatchObject({
      name: 'AgentPlanningCancelledError',
    });
    expect(sendContextualMessage).not.toHaveBeenCalled();
  });

  it('forwards cancellation to the provider and does not retry', async () => {
    const caller = new AbortController();
    const sendContextualMessage = vi.fn(
      ({ signal }: { signal?: AbortSignal }) =>
        new Promise<never>((_, reject) =>
          signal?.addEventListener(
            'abort',
            () => reject(new DOMException('aborted', 'AbortError')),
            { once: true }
          )
        )
    );
    const planner = new TaskPlanner({ sendContextualMessage } as unknown as UnifiedAIService);
    const pending = planner.planTask(makeRequest({ signal: caller.signal }));
    await vi.waitFor(() => expect(sendContextualMessage).toHaveBeenCalledOnce());

    caller.abort();

    await expect(pending).rejects.toMatchObject({ name: 'AgentPlanningCancelledError' });
    expect(sendContextualMessage.mock.calls[0]?.[0].signal.aborted).toBe(true);
    expect(sendContextualMessage).toHaveBeenCalledOnce();
  });

  it('enforces the overall 180-second planning deadline', async () => {
    vi.useFakeTimers();
    const sendContextualMessage = vi.fn(() => new Promise<never>(() => undefined));
    const planner = new TaskPlanner({ sendContextualMessage } as unknown as UnifiedAIService);
    const assertion = expect(planner.planTask(makeRequest())).rejects.toMatchObject({
      name: 'AgentPlanningTimeoutError',
      message: expect.stringContaining('180 seconds'),
    });

    await vi.advanceTimersByTimeAsync(AGENT_PLANNING_TIMEOUT_MS);
    await assertion;
  });

  it('retries one schema violation and then accepts a fresh valid plan', async () => {
    const sendContextualMessage = vi
      .fn()
      .mockResolvedValueOnce({ content: '{broken' })
      .mockResolvedValueOnce({ content: PLAN_JSON });
    const planner = new TaskPlanner(
      { sendContextualMessage } as unknown as UnifiedAIService,
      makeFileSystemService()
    );

    const result = await planner.planTask(makeRequest());

    expect(result.task.steps).toHaveLength(1);
    expect(sendContextualMessage).toHaveBeenCalledTimes(2);
    expect(sendContextualMessage.mock.calls[1]?.[0].userQuery).toContain(
      'previous response violated agent_plan_v1'
    );
  });

  it('retries an empty search_codebase query inside the structured boundary', async () => {
    const invalidPlan = planJsonFor([
      {
        type: 'search_codebase',
        params: { searchQuery: '' },
      },
    ]);
    const sendContextualMessage = vi
      .fn()
      .mockResolvedValueOnce({ content: invalidPlan })
      .mockResolvedValueOnce({
        content: '',
        toolCalls: [
          {
            id: 'call-search-retry',
            type: 'function',
            function: { name: 'submit_agent_plan', arguments: PLAN_JSON },
          },
        ],
      });
    const planner = new TaskPlanner(
      { sendContextualMessage } as unknown as UnifiedAIService,
      makeFileSystemService()
    );

    const result = await planner.planTask(makeRequest());

    expect(result.task.steps[0]?.action.type).toBe('read_file');
    expect(sendContextualMessage).toHaveBeenCalledTimes(2);
    expect(sendContextualMessage.mock.calls[1]?.[0]).toMatchObject({
      toolChoice: 'required',
      providerPreferences: { requireParameters: true },
    });
    expect(sendContextualMessage.mock.calls[1]?.[0].userQuery).toContain(
      'search_codebase requires a non-empty searchQuery'
    );
  });

  it('retries decoded output that fails executable-action validation', async () => {
    const invalidPlan = planJsonFor([
      {
        type: 'run_tests',
        params: {},
      },
    ]);
    const sendContextualMessage = vi
      .fn()
      .mockResolvedValueOnce({ content: invalidPlan })
      .mockResolvedValueOnce({
        content: '',
        toolCalls: [
          {
            id: 'call-action-retry',
            type: 'function',
            function: { name: 'submit_agent_plan', arguments: PLAN_JSON },
          },
        ],
      });
    const planner = new TaskPlanner(
      { sendContextualMessage } as unknown as UnifiedAIService,
      makeFileSystemService()
    );

    const result = await planner.planTask(makeRequest());

    expect(result.task.steps[0]?.action.type).toBe('read_file');
    expect(sendContextualMessage).toHaveBeenCalledTimes(2);
    expect(sendContextualMessage.mock.calls[1]?.[0].userQuery).toContain(
      'run_tests requires a non-empty projectName'
    );
  });

  it('retries a missing planned artifact with a sanitized parent listing, then accepts it', async () => {
    const missingArtifact = planJsonFor([
      {
        type: 'read_file',
        params: { filePath: 'dist/index.d.ts' },
      },
    ]);
    const correctedPlan = planJsonFor([
      {
        type: 'read_file',
        params: { filePath: 'dist/index.js' },
      },
    ]);
    const sendContextualMessage = vi
      .fn()
      .mockResolvedValueOnce({ content: missingArtifact })
      .mockResolvedValueOnce({
        content: '',
        toolCalls: [
          {
            id: 'call-corrected-artifact',
            type: 'function',
            function: { name: 'submit_agent_plan', arguments: correctedPlan },
          },
        ],
      });
    const planner = new TaskPlanner(
      { sendContextualMessage } as unknown as UnifiedAIService,
      makeFileSystemService({ [`${ROOT}/dist/index.js`]: 'top-secret-artifact-content' })
    );

    const result = await planner.planTask(makeRequest());
    const retryPrompt = sendContextualMessage.mock.calls[1]?.[0].userQuery as string;

    expect(result.task.steps[0]?.action.params.filePath).toBe('dist/index.js');
    expect(sendContextualMessage).toHaveBeenCalledTimes(2);
    expect(retryPrompt).toContain('dist/index.d.ts');
    expect(retryPrompt).toContain('index.js');
    expect(retryPrompt).not.toContain('top-secret-artifact-content');
    expect(retryPrompt).not.toContain('ENOENT:');
  });

  it('accepts multiple existing read_file and analyze_code targets without retrying', async () => {
    const existingPlan = planJsonFor([
      { type: 'read_file', params: { filePath: 'package.json' } },
      { type: 'analyze_code', params: { filePath: 'tsconfig.json' } },
      { type: 'read_file', params: { filePath: 'src/index.ts' } },
    ]);
    const sendContextualMessage = vi.fn().mockResolvedValue({ content: existingPlan });
    const planner = new TaskPlanner(
      { sendContextualMessage } as unknown as UnifiedAIService,
      makeFileSystemService()
    );

    const result = await planner.planTask(makeRequest());

    expect(result.task.steps.map(step => step.action.type)).toEqual([
      'read_file',
      'analyze_code',
      'read_file',
    ]);
    expect(sendContextualMessage).toHaveBeenCalledOnce();
  });

  it('allows an inspection target created by an earlier mutation step', async () => {
    const generatedPath = 'generated/report.ts';
    const generatedThenInspected = planJsonFor([
      {
        type: 'write_file',
        params: { filePath: generatedPath, content: 'export const report = {};' },
      },
      { type: 'analyze_code', params: { filePath: generatedPath } },
    ]);
    const sendContextualMessage = vi.fn().mockResolvedValue({ content: generatedThenInspected });
    const planner = new TaskPlanner(
      { sendContextualMessage } as unknown as UnifiedAIService,
      makeFileSystemService()
    );

    const result = await planner.planTask(
      makeRequest({
        userRequest: 'Create generated/report.ts, then analyze it.',
      })
    );

    expect(result.task.steps.map(step => step.action.type)).toEqual(['write_file', 'analyze_code']);
    expect(result.task.steps[1]?.action.params.filePath).toBe(generatedPath);
    expect(sendContextualMessage).toHaveBeenCalledOnce();
  });

  it('keeps missing planned source and config targets inside the structured retry boundary', async () => {
    const missingSource = planJsonFor([
      {
        type: 'read_file',
        params: { filePath: 'src/missing-source.ts' },
      },
    ]);
    const missingConfig = planJsonFor([
      {
        type: 'analyze_code',
        params: { filePath: 'tsconfig.missing.json' },
      },
    ]);
    const sendContextualMessage = vi
      .fn()
      .mockResolvedValueOnce({ content: missingSource })
      .mockResolvedValueOnce({
        content: '',
        toolCalls: [
          {
            id: 'call-missing-config',
            type: 'function',
            function: { name: 'submit_agent_plan', arguments: missingConfig },
          },
        ],
      });
    const planner = new TaskPlanner(
      { sendContextualMessage } as unknown as UnifiedAIService,
      makeFileSystemService()
    );

    await expect(planner.planTask(makeRequest())).rejects.toMatchObject({
      name: 'AgentPlanningError',
      metadata: {
        validationSummary: {
          valid: false,
          attemptCount: 2,
          issues: [expect.stringContaining('tsconfig.missing.json')],
        },
      },
    });
    expect(sendContextualMessage).toHaveBeenCalledTimes(2);
    expect(sendContextualMessage.mock.calls[1]?.[0].userQuery).toContain('src/missing-source.ts');
  });

  it('fails a second invalid planned-file attempt before creating a task', async () => {
    const missingArtifact = planJsonFor([
      {
        type: 'read_file',
        params: { filePath: 'dist/index.d.ts' },
      },
    ]);
    const sendContextualMessage = vi
      .fn()
      .mockResolvedValueOnce({ content: missingArtifact })
      .mockResolvedValueOnce({
        content: '',
        toolCalls: [
          {
            id: 'call-repeated-missing-artifact',
            type: 'function',
            function: { name: 'submit_agent_plan', arguments: missingArtifact },
          },
        ],
      });
    const planner = new TaskPlanner(
      { sendContextualMessage } as unknown as UnifiedAIService,
      makeFileSystemService({ [`${ROOT}/dist/index.js`]: 'compiled output only' })
    );

    await expect(planner.planTask(makeRequest())).rejects.toMatchObject({
      name: 'AgentPlanningError',
      metadata: {
        validationSummary: {
          valid: false,
          attemptCount: 2,
          issues: [expect.stringContaining('dist/index.d.ts')],
        },
      },
    });
    expect(sendContextualMessage).toHaveBeenCalledTimes(2);
    expect(sendContextualMessage.mock.calls[1]?.[0]).toMatchObject({
      toolChoice: 'required',
      providerPreferences: { requireParameters: true },
    });
  });

  it('rejects synthesis-only plans for explicit file restoration requests', async () => {
    const synthesisOnly = planJsonFor([
      {
        type: 'generate_code',
        params: { description: 'Restore the entry point', targetLanguage: 'TypeScript' },
      },
    ]);
    const targeted = planJsonFor([
      {
        type: 'generate_code',
        params: {
          description: 'Restore the entry point',
          targetLanguage: 'TypeScript',
          filePath: 'src/index.ts',
        },
      },
    ]);
    const sendContextualMessage = vi
      .fn()
      .mockResolvedValueOnce({ content: synthesisOnly })
      .mockResolvedValueOnce({ content: targeted });
    const planner = new TaskPlanner(
      { sendContextualMessage } as unknown as UnifiedAIService,
      makeFileSystemService()
    );

    const result = await planner.planTask(
      makeRequest({
        userRequest: 'Restore src/index.ts entry point.',
      })
    );

    expect(result.task.steps[0]?.action.params.filePath).toBe('src/index.ts');
    expect(sendContextualMessage.mock.calls[1]?.[0].userQuery).toContain(
      'no write_file, edit_file, or generate_code action with a matching filePath'
    );
    expect(sendContextualMessage.mock.calls[1]?.[0].userQuery).toContain(
      'copy that exact path into action.params.filePath'
    );
  });

  it('narrowly binds one explicit target after repeated final-step omission', async () => {
    const synthesisOnly = planJsonFor([
      {
        type: 'generate_code',
        params: {
          description: 'Restore the coherent entry point at src/index.ts',
          targetLanguage: 'TypeScript',
        },
        description: 'Synthesize findings and restore src/index.ts',
      },
    ]);
    const sendContextualMessage = vi
      .fn()
      .mockResolvedValueOnce({ content: synthesisOnly })
      .mockResolvedValueOnce({ content: synthesisOnly });
    const planner = new TaskPlanner(
      { sendContextualMessage } as unknown as UnifiedAIService,
      makeFileSystemService()
    );

    const result = await planner.planTask(
      makeRequest({
        userRequest: 'Restore src/index.ts entry point.',
      })
    );

    expect(sendContextualMessage).toHaveBeenCalledTimes(2);
    expect(result.task.steps[0]?.action.params.filePath).toBe('src/index.ts');
  });

  it('binds a missing runtime description from the final step description', async () => {
    const missingDescription = planJsonFor([
      {
        type: 'generate_code',
        params: { filePath: 'src/index.ts' },
        description: 'Restore the coherent entry point at src/index.ts',
      },
    ]);
    const sendContextualMessage = vi
      .fn()
      .mockResolvedValueOnce({ content: missingDescription })
      .mockResolvedValueOnce({ content: missingDescription });
    const planner = new TaskPlanner(
      { sendContextualMessage } as unknown as UnifiedAIService,
      makeFileSystemService()
    );

    const result = await planner.planTask(
      makeRequest({
        userRequest: 'Restore src/index.ts entry point.',
      })
    );

    expect(sendContextualMessage).toHaveBeenCalledTimes(2);
    expect(result.task.steps[0]?.action.params.description).toBe(
      'Restore the coherent entry point at src/index.ts'
    );
  });

  it('associates mutation targets with clauses in the exact entry-point request', async () => {
    const exactPlan = planJsonFor([
      { type: 'read_file', params: { filePath: 'package.json' } },
      { type: 'read_file', params: { filePath: 'tsconfig.json' } },
      { type: 'read_file', params: { filePath: 'src/index.ts' } },
      { type: 'search_codebase', params: { searchQuery: 'AGENTS.md' } },
      { type: 'search_codebase', params: { searchQuery: ['export', 'McpServer'] } },
      {
        type: 'generate_code',
        params: {
          description: 'Restore the coherent entry point',
          targetLanguage: 'TypeScript',
          filePath: 'src/index.ts',
        },
      },
    ]);
    const sendContextualMessage = vi.fn().mockResolvedValue({ content: exactPlan });
    const planner = new TaskPlanner(
      { sendContextualMessage } as unknown as UnifiedAIService,
      makeFileSystemService()
    );

    const result = await planner.planTask(
      makeRequest({
        userRequest:
          'Create src/index.ts Entry Point. Inspect package.json, tsconfig.json, nearest instructions, existing exports, and entry-point conventions. Restore the coherent proactive-recommendations-mcp entry point.',
      })
    );

    expect(sendContextualMessage).toHaveBeenCalledTimes(1);
    expect(result.task.steps.at(-1)?.action.params.filePath).toBe('src/index.ts');
  });

  it('adds explicitly requested instruction and convention inspections on the final attempt', async () => {
    const incompletePlan = planJsonFor([
      { type: 'read_file', params: { filePath: 'package.json' } },
      { type: 'read_file', params: { filePath: 'tsconfig.json' } },
      { type: 'read_file', params: { filePath: 'src/index.ts' } },
      {
        type: 'generate_code',
        params: {
          description: 'Restore the coherent entry point',
          targetLanguage: 'TypeScript',
          filePath: 'src/index.ts',
        },
      },
    ]);
    const sendContextualMessage = vi
      .fn()
      .mockResolvedValueOnce({ content: incompletePlan })
      .mockResolvedValueOnce({ content: incompletePlan });
    const planner = new TaskPlanner(
      { sendContextualMessage } as unknown as UnifiedAIService,
      makeFileSystemService()
    );

    const result = await planner.planTask(
      makeRequest({
        userRequest:
          'Create src/index.ts Entry Point. Inspect package.json, tsconfig.json, nearest instructions, existing exports, and entry-point conventions. Restore the coherent proactive-recommendations-mcp entry point.',
      })
    );

    expect(sendContextualMessage).toHaveBeenCalledTimes(2);
    expect(sendContextualMessage.mock.calls[1]?.[0].userQuery).toContain(
      'required inspection evidence'
    );
    const searches = result.task.steps
      .filter(step => step.action.type === 'search_codebase')
      .flatMap(step => step.action.params.searchQuery as string[]);
    expect(searches).toEqual(
      expect.arrayContaining(['AGENTS.md', 'export', 'entry point', 'McpServer', 'sibling'])
    );
    expect(result.task.steps.at(-1)?.action.params.filePath).toBe('src/index.ts');
  });

  it('requires plans to cover every explicit mutation target', async () => {
    const oneTarget = planJsonFor([
      {
        type: 'generate_code',
        params: { description: 'Restore a', filePath: 'src/a.ts' },
      },
    ]);
    const bothTargets = planJsonFor([
      { type: 'generate_code', params: { description: 'Restore a', filePath: 'src/a.ts' } },
      { type: 'generate_code', params: { description: 'Update b', filePath: 'src/b.ts' } },
    ]);
    const sendContextualMessage = vi
      .fn()
      .mockResolvedValueOnce({ content: oneTarget })
      .mockResolvedValueOnce({ content: bothTargets });
    const planner = new TaskPlanner(
      { sendContextualMessage } as unknown as UnifiedAIService,
      makeFileSystemService()
    );

    const result = await planner.planTask(
      makeRequest({
        userRequest: 'Restore src/a.ts and update src/b.ts.',
      })
    );

    expect(sendContextualMessage).toHaveBeenCalledTimes(2);
    expect(sendContextualMessage.mock.calls[1]?.[0].userQuery).toContain('src/b.ts');
    expect(result.task.steps.map(step => step.action.params.filePath)).toEqual([
      'src/a.ts',
      'src/b.ts',
    ]);
  });

  it('does not require a mutation target for inspect-only requests', async () => {
    const inspectPlan = planJsonFor([
      { type: 'read_file', params: { filePath: 'package.json' } },
      { type: 'read_file', params: { filePath: 'tsconfig.json' } },
      { type: 'generate_code', params: { description: 'Summarize the inspected configuration' } },
    ]);
    const sendContextualMessage = vi.fn().mockResolvedValue({ content: inspectPlan });
    const planner = new TaskPlanner(
      { sendContextualMessage } as unknown as UnifiedAIService,
      makeFileSystemService()
    );

    const result = await planner.planTask(
      makeRequest({
        userRequest: 'Inspect package.json and tsconfig.json, then summarize their configuration.',
      })
    );

    expect(sendContextualMessage).toHaveBeenCalledTimes(1);
    expect(result.task.steps.at(-1)?.action.params.filePath).toBeUndefined();
  });

  it('adds a missing explicitly requested file inspection without inventing a mutation', async () => {
    const incompleteInspectPlan = planJsonFor([
      { type: 'read_file', params: { filePath: 'package.json' } },
      { type: 'generate_code', params: { description: 'Summarize the inspected configuration' } },
    ]);
    const sendContextualMessage = vi
      .fn()
      .mockResolvedValueOnce({ content: incompleteInspectPlan })
      .mockResolvedValueOnce({ content: incompleteInspectPlan });
    const planner = new TaskPlanner(
      { sendContextualMessage } as unknown as UnifiedAIService,
      makeFileSystemService()
    );

    const result = await planner.planTask(
      makeRequest({
        userRequest: 'Inspect package.json and tsconfig.json, then summarize their configuration.',
      })
    );

    expect(result.task.steps.map(step => step.action.params.filePath)).toContain('tsconfig.json');
    expect(
      result.task.steps.every(
        step =>
          !['write_file', 'edit_file'].includes(step.action.type) &&
          !(step.action.type === 'generate_code' && typeof step.action.params.filePath === 'string')
      )
    ).toBe(true);
  });

  it('reports final semantic rejection as AgentPlanningError with provider metadata', async () => {
    const invalidPlan = planJsonFor([
      {
        type: 'search_codebase',
        params: { searchQuery: [] },
      },
    ]);
    const sendContextualMessage = vi
      .fn()
      .mockResolvedValueOnce({ content: invalidPlan })
      .mockResolvedValueOnce({
        content: '',
        provider: 'openrouter',
        model: 'deepseek/deepseek-v4-pro',
        requestId: 'request-semantic-rejection',
        finishReason: 'tool_calls',
        usage: { promptTokens: 4, completionTokens: 6, totalTokens: 10 },
        toolCalls: [
          {
            id: 'call-invalid-action',
            type: 'function',
            function: { name: 'submit_agent_plan', arguments: invalidPlan },
          },
        ],
      });
    const planner = new TaskPlanner(
      { sendContextualMessage } as unknown as UnifiedAIService,
      makeFileSystemService()
    );

    await expect(planner.planTask(makeRequest())).rejects.toMatchObject({
      name: 'AgentPlanningError',
      metadata: {
        provider: 'openrouter',
        model: 'deepseek/deepseek-v4-pro',
        requestId: 'request-semantic-rejection',
        finishReason: 'tool_calls',
        planningProtocol: 'agent_plan_v1',
        responseShape: 'submit_agent_plan_tool_call',
        tokensUsed: 10,
        validationSummary: {
          schemaVersion: 1,
          valid: false,
          attemptCount: 2,
          issues: [expect.stringContaining('non-empty searchQuery')],
        },
      },
    });
  });

  it('accepts the native submit_agent_plan tool fallback', async () => {
    const sendContextualMessage = vi
      .fn()
      .mockRejectedValueOnce(new Error('response_format unsupported'))
      .mockResolvedValueOnce({
        content: '',
        toolCalls: [
          {
            id: 'call-1',
            type: 'function',
            function: { name: 'submit_agent_plan', arguments: PLAN_JSON },
          },
        ],
      });
    const planner = new TaskPlanner(
      { sendContextualMessage } as unknown as UnifiedAIService,
      makeFileSystemService()
    );

    const result = await planner.planTask(makeRequest());

    expect(result.task.steps[0]?.action.type).toBe('read_file');
    expect(result.task.metadata).toMatchObject({
      planningProtocol: 'agent_plan_v1',
      responseShape: 'submit_agent_plan_tool_call',
      validationSummary: { valid: true, attemptCount: 2, stepCount: 1 },
    });
    expect(sendContextualMessage.mock.calls[1]?.[0]).toMatchObject({
      toolChoice: 'required',
      providerPreferences: { requireParameters: true },
    });
  });

  it('stores only sanitized provider planning metadata and token totals', async () => {
    const sendContextualMessage = vi.fn().mockResolvedValue({
      content: PLAN_JSON,
      provider: 'openrouter\u0000proxy',
      model: 'deepseek/deepseek-v4-pro',
      requestId: 'request-123\n',
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    });
    const planner = new TaskPlanner(
      {
        sendContextualMessage,
        getModel: () => 'deepseek/deepseek-v4-pro',
      } as unknown as UnifiedAIService,
      makeFileSystemService()
    );

    const result = await planner.planTask(makeRequest());

    expect(result.task.status).toBe('planning');
    expect(result.task.metadata).toEqual({
      provider: 'openrouter proxy',
      model: 'deepseek/deepseek-v4-pro',
      requestedModel: 'deepseek/deepseek-v4-pro',
      resolvedModel: 'deepseek/deepseek-v4-pro',
      requestId: 'request-123',
      finishReason: 'stop',
      planningProtocol: 'agent_plan_v1',
      responseShape: 'json_schema_content',
      tokensUsed: 30,
      validationSummary: {
        schemaVersion: 1,
        valid: true,
        attemptCount: 1,
        stepCount: 1,
        actionTypes: ['read_file'],
      },
    });
    expect(JSON.stringify(result.task.metadata)).not.toContain(PLAN_JSON);
  });

  it('distinguishes the requested planning model from the provider-resolved model', async () => {
    const sendContextualMessage = vi.fn().mockResolvedValue({
      content: PLAN_JSON,
      provider: 'openrouter',
      model: 'deepseek/deepseek-v4-flash-20260423',
    });
    const planner = new TaskPlanner(
      {
        sendContextualMessage,
        getModel: () => 'deepseek/deepseek-v4-pro',
      } as unknown as UnifiedAIService,
      makeFileSystemService()
    );

    const result = await planner.planTask(makeRequest());

    expect(result.task.metadata).toMatchObject({
      model: 'deepseek/deepseek-v4-flash-20260423',
      requestedModel: 'deepseek/deepseek-v4-pro',
      resolvedModel: 'deepseek/deepseek-v4-flash-20260423',
    });
  });

  it('preserves sanitized response metadata when planning ultimately fails', async () => {
    const sendContextualMessage = vi
      .fn()
      .mockResolvedValueOnce({
        content: '{broken',
        provider: 'openrouter',
        model: 'deepseek/deepseek-v4-pro',
        requestId: 'request-invalid',
        finishReason: 'stop',
        usage: { promptTokens: 5, completionTokens: 5, totalTokens: 10 },
      })
      .mockRejectedValueOnce(new Error('tool fallback unavailable'));
    const planner = new TaskPlanner(
      { sendContextualMessage } as unknown as UnifiedAIService,
      makeFileSystemService()
    );

    await expect(planner.planTask(makeRequest())).rejects.toMatchObject({
      name: 'AgentPlanningError',
      metadata: {
        provider: 'openrouter',
        model: 'deepseek/deepseek-v4-pro',
        requestId: 'request-invalid',
        planningProtocol: 'agent_plan_v1',
        responseShape: 'submit_agent_plan_tool_call',
        tokensUsed: 10,
        validationSummary: {
          schemaVersion: 1,
          valid: false,
          attemptCount: 2,
          issues: ['tool fallback unavailable'],
        },
      },
    });
  });

  it('loads AGENTS.md via the fileSystemService and injects it into the prompt', async () => {
    const { aiService, sendContextualMessage } = makeAiService();
    const planner = new TaskPlanner(aiService, makeFileSystemService());

    const response = await planner.planTask(makeRequest());

    const sent = sendContextualMessage.mock.calls[0]?.[0];
    expect(sent?.userQuery).toContain(STANDARDS_HEADER);
    expect(sent?.userQuery).toContain(`<!-- source: ${ROOT}/AGENTS.md -->`);
    expect(sent?.userQuery).toContain('Use pnpm only.');
    // Structure detection succeeded (real detector over the throwing fs stub).
    expect(sent?.userQuery).toContain('PROJECT STRUCTURE DETECTED:');
    // The AI plan parsed into a real task, not the fallback.
    expect(response.task.title).toBe('Read the current file');
    expect(response.task.steps[0]?.action.type).toBe('read_file');
  });

  it('skips AGENTS.md (no read) when the agentsMd settings toggle is off', async () => {
    await setStandardsSetting('agentsMd', false);
    const { aiService, sendContextualMessage } = makeAiService();
    const fileSystemService = makeFileSystemService();
    const planner = new TaskPlanner(aiService, fileSystemService);

    await planner.planTask(makeRequest());

    const sent = sendContextualMessage.mock.calls[0]?.[0];
    expect(sent?.userQuery).not.toContain(STANDARDS_HEADER);
    const readFile = fileSystemService.readFile as unknown as ReturnType<typeof vi.fn>;
    const agentsReads = readFile.mock.calls.filter(
      ([path]: [string]) => path === `${ROOT}/AGENTS.md`
    );
    expect(agentsReads).toHaveLength(0); // disabled source is never probed
  });

  it('skips standards and structure detection without a fileSystemService', async () => {
    const { aiService, sendContextualMessage } = makeAiService();
    const planner = new TaskPlanner(aiService);

    await planner.planTask(makeRequest());

    const sent = sendContextualMessage.mock.calls[0]?.[0];
    expect(sent?.userQuery).not.toContain(STANDARDS_HEADER);
    // detectProjectStructure null-detector guard: no structure section rendered.
    expect(sent?.userQuery).not.toContain('PROJECT STRUCTURE DETECTED:');
  });
});

describe('TaskPlanner detectProjectStructure — catch branches', () => {
  it('warns (not errors) when detection fails in web mode', async () => {
    vi.spyOn(ProjectStructureDetector.prototype, 'detectStructure').mockRejectedValue(
      new Error('detector boom')
    );
    const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    const { aiService, sendContextualMessage } = makeAiService();
    const planner = new TaskPlanner(aiService, makeFileSystemService());

    await planner.planTask(makeRequest());

    expect(warnSpy).toHaveBeenCalledWith(
      '[TaskPlanner] Project structure detection failed in web mode.'
    );
    expect(errorSpy).not.toHaveBeenCalledWith(
      '[TaskPlanner] Failed to detect project structure:',
      expect.any(Error)
    );
    const sent = sendContextualMessage.mock.calls[0]?.[0];
    expect(sent?.userQuery).not.toContain('PROJECT STRUCTURE DETECTED:');
  });

  it('errors when detection fails under electron', async () => {
    win.electron = { isElectron: true };
    vi.spyOn(ProjectStructureDetector.prototype, 'detectStructure').mockRejectedValue(
      new Error('detector boom')
    );
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    const { aiService, sendContextualMessage } = makeAiService();
    const planner = new TaskPlanner(aiService, makeFileSystemService());

    await planner.planTask(makeRequest());

    expect(errorSpy).toHaveBeenCalledWith(
      '[TaskPlanner] Failed to detect project structure:',
      expect.any(Error)
    );
    const sent = sendContextualMessage.mock.calls[0]?.[0];
    expect(sent?.userQuery).not.toContain('PROJECT STRUCTURE DETECTED:');
  });
});

describe('TaskPlanner detectProjectStructure — success path', () => {
  it('logs the detected structure and forwards it into the planning prompt', async () => {
    const structure: ProjectStructure = {
      type: 'expo',
      entryPoints: [`${ROOT}/app/index.tsx`],
      configFiles: [`${ROOT}/package.json`],
      hasPackageJson: true,
      detectedFramework: 'expo',
    };
    vi.spyOn(ProjectStructureDetector.prototype, 'detectStructure').mockResolvedValue(structure);
    const debugSpy = vi.spyOn(logger, 'debug').mockImplementation(() => undefined);
    const { aiService, sendContextualMessage } = makeAiService();
    const planner = new TaskPlanner(aiService, makeFileSystemService());

    await planner.planTask(makeRequest());

    expect(debugSpy).toHaveBeenCalledWith(
      '[TaskPlanner] Detected project structure:',
      expect.stringContaining('Project Type: expo')
    );
    const sent = sendContextualMessage.mock.calls[0]?.[0];
    expect(sent?.userQuery).toContain('PROJECT STRUCTURE DETECTED:');
    expect(sent?.userQuery).toContain('- Type: expo (expo)');
    expect(sent?.userQuery).toContain('- Entry Points: index.tsx');
    expect(sent?.userQuery).toContain('- Config Files: package.json');
  });
});

describe('TaskPlanner planTaskWithConfidence / planTaskEnhanced', () => {
  it('marks memory-backed low-risk steps and generates no fallbacks', async () => {
    const content = planJsonFor([
      { type: 'read_file', params: { filePath: `${ROOT}/src/App.tsx` } },
      { type: 'generate_code', params: { description: 'summarize findings' } },
    ]);
    const { aiService } = makeAiService(content);
    const planner = new TaskPlanner(aiService);

    const result = await planner.planTaskWithConfidence(makeRequest(), new StrategyMemory());

    // read_file on a common path: 50 base + 40 memory + 20 file => 100 (low risk).
    // generate_code: 50 + 40 - 15 complexity => 75 (low risk). No fallbacks under 60.
    expect(result.insights.highRiskSteps).toBe(0);
    expect(result.insights.memoryBackedSteps).toBe(2);
    expect(result.insights.fallbacksGenerated).toBe(0);
    expect(result.insights.overallConfidence).toBe(87.5);
    expect(result.insights.estimatedSuccessRate).toBe(99);
    const [readStep, genStep] = result.task.steps as EnhancedAgentStep[];
    expect(readStep?.confidence?.score).toBe(100);
    expect(genStep?.confidence?.score).toBe(75);
    expect(readStep?.fallbackPlans).toBeUndefined();
    expect(genStep?.fallbackPlans).toBeUndefined();
  });

  it('counts high-risk steps and attaches fallbacks without memory backing', async () => {
    const content = planJsonFor([
      { type: 'generate_code', params: { description: 'risky work' } },
      { type: 'read_file', params: { filePath: `${ROOT}/notes/unknown.xyz` } },
    ]);
    const { aiService } = makeAiService(content);
    const planner = new TaskPlanner(aiService);
    const noMemory = undefined as unknown as StrategyMemory;

    const result = await planner.planTaskWithConfidence(makeRequest(), noMemory);

    // generate_code: 50 - 15 = 35 (high risk -> request-user-input fallback).
    // read_file on an unknown path: 50 (medium risk -> search-codebase fallback).
    expect(result.insights.highRiskSteps).toBe(1);
    expect(result.insights.memoryBackedSteps).toBe(0);
    expect(result.insights.fallbacksGenerated).toBe(2);
    expect(result.insights.overallConfidence).toBe(42.5);
    expect(result.insights.estimatedSuccessRate).toBe(42.5);
    const [genStep, readStep] = result.task.steps as EnhancedAgentStep[];
    expect(genStep?.confidence?.riskLevel).toBe('high');
    expect(genStep?.fallbackPlans).toHaveLength(1);
    expect(genStep?.fallbackPlans?.[0]?.alternativeAction.type).toBe('custom');
    expect(readStep?.fallbackPlans).toHaveLength(1);
    expect(readStep?.fallbackPlans?.[0]?.alternativeAction.type).toBe('search_codebase');
  });

  it('planTaskEnhanced delegates with the internal strategy memory', async () => {
    const { aiService } = makeAiService();
    const planner = new TaskPlanner(aiService);

    const result = await planner.planTaskEnhanced(makeRequest());

    // The internal StrategyMemory instance is truthy => memory-backed step.
    expect(result.insights.memoryBackedSteps).toBe(1);
    expect(result.insights.highRiskSteps).toBe(0);
    expect(result.task.steps).toHaveLength(1);
  });
});

describe('TaskPlanner thin wrappers', () => {
  const step: AgentStep = {
    id: 'task_x_step_1',
    taskId: 'task_x',
    order: 1,
    title: 'Read file',
    description: 'Read the target file',
    action: { type: 'read_file', params: { filePath: `${ROOT}/package.json` } },
    status: 'pending',
    requiresApproval: false,
    retryCount: 0,
    maxRetries: 1,
  };

  it('validateTask reports an empty-steps task as invalid', () => {
    const { aiService } = makeAiService();
    const planner = new TaskPlanner(aiService);
    const task: AgentTask = {
      id: 'task_x',
      title: 'Empty',
      description: 'No steps',
      userRequest: 'noop',
      steps: [],
      status: 'awaiting_approval',
      createdAt: new Date(),
    };

    expect(planner.validateTask(task)).toEqual({ valid: false, errors: ['Task has no steps'] });
  });

  it('calculateStepConfidence wrapper delegates to the calculator', async () => {
    const { aiService } = makeAiService();
    const planner = new TaskPlanner(aiService);

    const confidence = await planner.calculateStepConfidence(step, new StrategyMemory());

    expect(confidence.score).toBe(100); // 50 base + 40 memory + 20 common file
    expect(confidence.riskLevel).toBe('low');
  });

  it('generateFallbackPlans wrapper delegates to the calculator', async () => {
    const { aiService } = makeAiService();
    const planner = new TaskPlanner(aiService);
    const lowConfidence: StepConfidence = {
      score: 30,
      factors: [],
      memoryBacked: false,
      riskLevel: 'high',
    };

    const fallbacks = await planner.generateFallbackPlans(step, lowConfidence);

    expect(fallbacks.length).toBeGreaterThan(0);
    expect(fallbacks[0]?.alternativeAction.type).toBe('search_codebase');
  });
});

describe('TaskPlanner buildAiContextRequest — currentFile ternary', () => {
  it('passes currentFileObject through untouched when provided', async () => {
    const { aiService, sendContextualMessage } = makeAiService();
    const planner = new TaskPlanner(aiService);
    const currentFileObject = {
      path: CURRENT_FILE,
      content: 'const a = 1;',
      language: 'typescript',
    };

    await planner.planTask(makeRequest({ currentFileObject }));

    const sent = sendContextualMessage.mock.calls[0]?.[0];
    expect(sent?.currentFile).toBe(currentFileObject);
    expect(sent?.fileContent).toBe('const a = 1;');
  });

  it('synthesizes a currentFile from context.currentFile when no object exists', async () => {
    const { aiService, sendContextualMessage } = makeAiService();
    const planner = new TaskPlanner(aiService);

    await planner.planTask(makeRequest());

    const sent = sendContextualMessage.mock.calls[0]?.[0];
    expect(sent?.currentFile).toEqual({
      path: CURRENT_FILE,
      language: 'typescript',
      content: '',
    });
    expect(sent?.fileContent).toBeUndefined();
  });

  it('sends currentFile undefined when neither source is present', async () => {
    const { aiService, sendContextualMessage } = makeAiService();
    const planner = new TaskPlanner(aiService);

    await planner.planTask(makeRequest({ context: { workspaceRoot: ROOT } }));

    const sent = sendContextualMessage.mock.calls[0]?.[0];
    expect(sent?.currentFile).toBeUndefined();
    expect(sent?.fileContent).toBeUndefined();
  });
});
