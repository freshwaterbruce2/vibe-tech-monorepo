/**
 * PlanModeRunner — orchestration for spec 05 Plan Mode Phase 1: research via
 * the existing TaskPlanner facade (AGENTS.md standards ride the planning
 * prompt, spec 03) → markdown plan → <workspaceRoot>/.vcs/plans/<slug>-<ts>.md
 * → spec-09 plan artifact. All I/O is injected; lifecycle lands in
 * planModeStore. Artifact recording is best-effort — a failed capture never
 * fails the plan.
 * Spec: FEATURE_SPECS/competitive-gaps/05-PLAN-MODE.md
 */
import { usePlanModeStore } from '../../../stores/planModeStore';
import type { PlanningInsights, TaskPlanRequest, TaskPlanResponse } from '../../../types';
import { recordPlanArtifact } from '../../artifacts/artifactCapture';
import {
  buildPlanFileName,
  buildPlanMarkdown,
  fromTaskPlanResponse,
  PLANS_DIR_SEGMENT,
} from './PlanMarkdownBuilder';

export interface PlanModePlanner {
  planTaskEnhanced(
    request: TaskPlanRequest
  ): Promise<TaskPlanResponse & { insights: PlanningInsights }>;
}

export interface PlanFileWriter {
  createDirectory(path: string): Promise<void>;
  writeFile(path: string, content: string): Promise<void>;
}

export interface PlanModeDeps {
  planner: PlanModePlanner;
  writer: PlanFileWriter;
  /** Artifact recorder seam (defaults to spec-09 recordPlanArtifact). */
  record?: typeof recordPlanArtifact;
  /** Clock seam for deterministic tests. */
  now?: () => Date;
}

export interface PlanModeRequest {
  userRequest: string;
  workspaceRoot: string;
  currentFile?: string;
  openFiles?: string[];
  recentFiles?: string[];
}

export interface PlanModeResult {
  planPath: string;
  markdown: string;
  artifactRecorded: boolean;
}

const actions = () => usePlanModeStore.getState().actions;

/**
 * Run one plan-mode pass. Rethrows planner/write failures after recording
 * them in the store so callers can toast.
 */
export async function runPlanMode(
  deps: PlanModeDeps,
  request: PlanModeRequest
): Promise<PlanModeResult> {
  const store = actions();
  if (!request.userRequest.trim()) {
    store.fail('Plan Mode needs a task description.');
    throw new Error('Plan Mode needs a task description.');
  }
  if (!request.workspaceRoot) {
    store.fail('Plan Mode needs an open workspace.');
    throw new Error('Plan Mode needs an open workspace.');
  }

  store.start();
  try {
    const createdAt = (deps.now ?? (() => new Date()))();
    const response = await deps.planner.planTaskEnhanced(buildPlannerRequest(request));

    store.setPhase('writing');
    const markdown = buildPlanMarkdown(
      fromTaskPlanResponse(request.userRequest, response, {
        workspaceRoot: request.workspaceRoot,
        currentFile: request.currentFile,
        hasAgentStandards: true,
        createdAt,
        insights: response.insights,
      })
    );

    const plansDir = `${request.workspaceRoot.replace(/[\\/]+$/, '')}/${PLANS_DIR_SEGMENT}`;
    const planPath = `${plansDir}/${buildPlanFileName(response.task.title, createdAt)}`;
    await ensureDirectory(deps.writer, plansDir);
    await deps.writer.writeFile(planPath, markdown);

    const artifactRecorded = await recordArtifactSafely(deps, response.task.title, markdown);
    store.succeed(planPath);
    return { planPath, markdown, artifactRecorded };
  } catch (error) {
    store.fail(error instanceof Error ? error.message : 'Plan Mode failed.');
    throw error;
  }
}

function buildPlannerRequest(request: PlanModeRequest): TaskPlanRequest {
  return {
    userRequest: request.userRequest,
    context: {
      workspaceRoot: request.workspaceRoot,
      currentFile: request.currentFile,
      openFiles: request.openFiles ?? [],
      recentFiles: request.recentFiles ?? [],
    },
  };
}

async function ensureDirectory(writer: PlanFileWriter, path: string): Promise<void> {
  try {
    await writer.createDirectory(path);
  } catch {
    // Directory already exists (or the writer treats mkdir as idempotent).
  }
}

async function recordArtifactSafely(
  deps: PlanModeDeps,
  title: string,
  markdown: string
): Promise<boolean> {
  const record = deps.record ?? recordPlanArtifact;
  try {
    await record(crypto.randomUUID(), `Plan: ${title}`, markdown);
    return true;
  } catch {
    return false;
  }
}
