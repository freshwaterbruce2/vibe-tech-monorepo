/**
 * PlanModeRunner tests — spec 05 orchestration: store lifecycle, plan path
 * shape under .vcs/plans, best-effort artifact recording (default seam and
 * injected stub), guard failures, and error propagation with store capture.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runPlanMode } from '../../../services/ai/planMode/PlanModeRunner';
import type {
  PlanFileWriter,
  PlanModeDeps,
  PlanModePlanner,
} from '../../../services/ai/planMode/PlanModeRunner';
import { recordPlanArtifact } from '../../../services/artifacts/artifactCapture';
import { usePlanModeStore } from '../../../stores/planModeStore';
import type { PlanningInsights, TaskPlanResponse } from '../../../types';

vi.mock('../../../services/artifacts/artifactCapture', () => ({
  recordPlanArtifact: vi.fn().mockResolvedValue({}),
}));

const FIXED_DATE = new Date(2026, 0, 5, 7, 8, 9);

const insights: PlanningInsights = {
  overallConfidence: 0.9,
  highRiskSteps: 0,
  memoryBackedSteps: 1,
  fallbacksGenerated: 0,
  estimatedSuccessRate: 0.8,
};

type PlannerResponse = TaskPlanResponse & { insights: PlanningInsights };

function makeResponse(title = 'My Plan'): PlannerResponse {
  return {
    task: {
      id: 'task-1',
      title,
      description: 'desc',
      userRequest: 'req',
      steps: [],
      status: 'planning',
      createdAt: FIXED_DATE,
    },
    reasoning: 'Because.',
    insights,
  };
}

function makeDeps(overrides?: Partial<PlanModeDeps>): PlanModeDeps & {
  planner: PlanModePlanner & { planTaskEnhanced: ReturnType<typeof vi.fn> };
  writer: PlanFileWriter & {
    createDirectory: ReturnType<typeof vi.fn>;
    writeFile: ReturnType<typeof vi.fn>;
  };
} {
  return {
    planner: { planTaskEnhanced: vi.fn().mockResolvedValue(makeResponse()) },
    writer: {
      createDirectory: vi.fn().mockResolvedValue(undefined),
      writeFile: vi.fn().mockResolvedValue(undefined),
    },
    record: vi.fn().mockResolvedValue({}),
    now: () => FIXED_DATE,
    ...overrides,
  } as ReturnType<typeof makeDeps>;
}

const request = { userRequest: 'refactor the login flow', workspaceRoot: 'V:/ws' };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(recordPlanArtifact).mockResolvedValue({} as never);
  usePlanModeStore.setState({
    phase: 'idle',
    dialogOpen: false,
    latestPlanPath: null,
    history: [],
    error: null,
  });
});

describe('runPlanMode — happy path', () => {
  it('walks researching → writing → done and writes the slugged plan file', async () => {
    const phases: string[] = [];
    const deps = makeDeps();
    deps.planner.planTaskEnhanced.mockImplementation(async () => {
      phases.push(usePlanModeStore.getState().phase);
      return makeResponse();
    });
    deps.writer.writeFile.mockImplementation(async () => {
      phases.push(usePlanModeStore.getState().phase);
    });

    const result = await runPlanMode(deps, request);

    expect(phases).toEqual(['researching', 'writing']);
    expect(result.planPath).toBe('V:/ws/.vcs/plans/my-plan-20260105-070809.md');
    expect(result.markdown).toContain('# My Plan');
    expect(result.artifactRecorded).toBe(true);
    expect(deps.writer.createDirectory).toHaveBeenCalledWith('V:/ws/.vcs/plans');
    expect(deps.writer.writeFile).toHaveBeenCalledWith(result.planPath, result.markdown);
    expect(deps.record).toHaveBeenCalledWith(expect.any(String), 'Plan: My Plan', result.markdown);

    const state = usePlanModeStore.getState();
    expect(state.phase).toBe('done');
    expect(state.latestPlanPath).toBe(result.planPath);
    expect(state.history[0]).toBe(result.planPath);

    // planner receives the normalized request with defaulted context arrays
    expect(deps.planner.planTaskEnhanced).toHaveBeenCalledWith({
      userRequest: request.userRequest,
      context: {
        workspaceRoot: 'V:/ws',
        currentFile: undefined,
        openFiles: [],
        recentFiles: [],
      },
    });
  });

  it('passes optional context through and normalizes a trailing-slash root', async () => {
    const deps = makeDeps();
    const result = await runPlanMode(deps, {
      ...request,
      workspaceRoot: 'V:\\ws\\//',
      currentFile: 'src/App.tsx',
      openFiles: ['src/App.tsx'],
      recentFiles: ['src/old.ts'],
    });

    expect(result.planPath).toBe('V:\\ws/.vcs/plans/my-plan-20260105-070809.md');
    expect(deps.planner.planTaskEnhanced).toHaveBeenCalledWith({
      userRequest: request.userRequest,
      context: {
        workspaceRoot: 'V:\\ws\\//',
        currentFile: 'src/App.tsx',
        openFiles: ['src/App.tsx'],
        recentFiles: ['src/old.ts'],
      },
    });
  });

  it('swallows createDirectory failures (idempotent mkdir)', async () => {
    const deps = makeDeps();
    deps.writer.createDirectory.mockRejectedValue(new Error('EEXIST'));
    const result = await runPlanMode(deps, request);
    expect(result.artifactRecorded).toBe(true);
    expect(usePlanModeStore.getState().phase).toBe('done');
  });

  it('uses the default clock and default artifact recorder when seams are omitted', async () => {
    const deps = makeDeps({ record: undefined, now: undefined });
    const result = await runPlanMode(deps, request);

    expect(result.planPath).toMatch(/^V:\/ws\/\.vcs\/plans\/my-plan-\d{8}-\d{6}\.md$/);
    expect(result.artifactRecorded).toBe(true);
    expect(vi.mocked(recordPlanArtifact)).toHaveBeenCalledWith(
      expect.any(String),
      'Plan: My Plan',
      result.markdown
    );
  });
});

describe('runPlanMode — artifact recording is best-effort', () => {
  it('reports artifactRecorded false when the recorder rejects but still succeeds', async () => {
    const deps = makeDeps({ record: vi.fn().mockRejectedValue(new Error('no store')) });
    const result = await runPlanMode(deps, request);
    expect(result.artifactRecorded).toBe(false);
    expect(usePlanModeStore.getState().phase).toBe('done');
  });
});

describe('runPlanMode — failures', () => {
  it('fails the store and rethrows when the planner rejects', async () => {
    const deps = makeDeps();
    deps.planner.planTaskEnhanced.mockRejectedValue(new Error('planner exploded'));

    await expect(runPlanMode(deps, request)).rejects.toThrow('planner exploded');
    const state = usePlanModeStore.getState();
    expect(state.phase).toBe('error');
    expect(state.error).toBe('planner exploded');
    expect(deps.writer.writeFile).not.toHaveBeenCalled();
  });

  it('fails the store and rethrows when the write fails', async () => {
    const deps = makeDeps();
    deps.writer.writeFile.mockRejectedValue(new Error('disk full'));

    await expect(runPlanMode(deps, request)).rejects.toThrow('disk full');
    const state = usePlanModeStore.getState();
    expect(state.phase).toBe('error');
    expect(state.error).toBe('disk full');
    expect(deps.record).not.toHaveBeenCalled();
  });

  it('records a generic message for non-Error throws', async () => {
    const deps = makeDeps();
    deps.planner.planTaskEnhanced.mockRejectedValue('string boom');

    await expect(runPlanMode(deps, request)).rejects.toBe('string boom');
    expect(usePlanModeStore.getState().error).toBe('Plan Mode failed.');
  });

  it('rejects an empty user request without calling the planner', async () => {
    const deps = makeDeps();
    await expect(runPlanMode(deps, { ...request, userRequest: '   ' })).rejects.toThrow(
      'Plan Mode needs a task description.'
    );
    expect(deps.planner.planTaskEnhanced).not.toHaveBeenCalled();
    expect(usePlanModeStore.getState().error).toBe('Plan Mode needs a task description.');
  });

  it('rejects a missing workspace root without calling the planner', async () => {
    const deps = makeDeps();
    await expect(runPlanMode(deps, { ...request, workspaceRoot: '' })).rejects.toThrow(
      'Plan Mode needs an open workspace.'
    );
    expect(deps.planner.planTaskEnhanced).not.toHaveBeenCalled();
    expect(usePlanModeStore.getState().error).toBe('Plan Mode needs an open workspace.');
  });
});
