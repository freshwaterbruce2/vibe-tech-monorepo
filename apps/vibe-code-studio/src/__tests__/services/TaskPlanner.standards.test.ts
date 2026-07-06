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

import { afterEach, describe, expect, it, vi } from 'vitest';
import { StrategyMemory } from '../../services/ai/StrategyMemory';
import { TaskPlanner } from '../../services/ai/TaskPlanner';
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

const PLAN_JSON = [
  '```json',
  JSON.stringify({
    title: 'Read the current file',
    description: 'Reads one file',
    reasoning: 'A single read suffices',
    steps: [
      {
        order: 1,
        title: 'Read file',
        description: 'Read the target file',
        action: { type: 'read_file', params: { filePath: CURRENT_FILE } },
        requiresApproval: false,
        maxRetries: 1,
      },
    ],
  }),
  '```',
].join('\n');

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
    aiService: { sendContextualMessage } as unknown as UnifiedAIService,
  };
};

/** Builds a fenced-JSON AI response with the given plan steps. */
const planJsonFor = (
  steps: Array<{ type: string; params: Record<string, unknown>; description?: string }>
): string =>
  [
    '```json',
    JSON.stringify({
      title: 'Multi-step plan',
      description: 'plan',
      reasoning: 'because',
      steps: steps.map((step, index) => ({
        order: index + 1,
        title: `Step ${index + 1}`,
        description: step.description ?? `Step ${index + 1} description`,
        action: { type: step.type, params: step.params },
        requiresApproval: false,
        maxRetries: 1,
      })),
    }),
    '```',
  ].join('\n');

/** File system stub: only `${ROOT}/AGENTS.md` exists; everything else throws. */
const makeFileSystemService = (): FileSystemService => {
  const stub = {
    readFile: vi.fn(async (path: string): Promise<string> => {
      if (path === `${ROOT}/AGENTS.md`) {
        return AGENTS_MD_BODY;
      }
      throw new Error(`ENOENT: ${path}`);
    }),
    listDirectory: vi.fn(async (path: string): Promise<never> => {
      throw new Error(`ENOENT: ${path}`);
    }),
    getFileStats: vi.fn(async (path: string): Promise<never> => {
      throw new Error(`ENOENT: ${path}`);
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

afterEach(() => {
  delete win.electron;
  vi.restoreAllMocks();
});

describe('TaskPlanner planTask — AGENTS.md standards wiring', () => {
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
