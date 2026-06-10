import { randomUUID } from 'crypto';
import { CONFIG } from '../config.js';
import { runCommand } from '../tools/process-tools.js';
import { ProjectClassifier, type ProjectMetadata, type ProjectType } from './project-classifier.js';
import { ParlRewardShaper, type ParlRewardResult } from './parl-reward-shaper.js';
import type { TaskSpec } from '../types.js';

const TYPE_CONSTRAINTS: Record<ProjectType, string[]> = {
  typescript: ['Use pnpm nx lint/typecheck/test for validation', 'Follow TypeScript strict mode'],
  rust: [
    'Run cargo check and cargo test before marking complete',
    'No unsafe blocks without explicit approval',
  ],
  python: [
    'Run ruff and pytest before marking complete',
    'Pin new dependencies in requirements.txt',
  ],
  android: ['Validate with pnpm nx android:build', 'Ensure compatibility with minSdk 23'],
  unknown: ['Use Nx-backed validation where available'],
};

export interface RoutedTask {
  project: ProjectMetadata;
  task: TaskSpec;
}

export type ExecutionStrategy = 'parallel' | 'sequential';

export interface RouteResult {
  goal: string;
  projects: ProjectMetadata[];
  tasks: RoutedTask[];
  strategy: ExecutionStrategy;
  rewardInfo?: ParlRewardResult;
}

/** Goals with explicit ordering language cannot be parallelized safely. */
const SEQUENTIAL_GOAL_PATTERN = /\b(first|then|after|before|finally|step\s*\d)\b/i;

export class MonorepoTaskRouter {
  private readonly rewardShaper = new ParlRewardShaper();

  constructor(private readonly classifier = new ProjectClassifier()) {}

  route(goal: string, explicitProjects?: string[], epoch = 0, maxEpochs = 100): RouteResult {
    const projects =
      explicitProjects && explicitProjects.length > 0
        ? explicitProjects.map((name) => this.classifier.classify(name))
        : this.detectAffectedProjects();
    const tasks = projects.map((project) => ({
      project,
      task: this.buildTaskSpec(goal, project),
    }));
    const { strategy, rewardInfo } = this.selectStrategy(goal, projects.length, epoch, maxEpochs);
    return { goal, projects, tasks, strategy, rewardInfo };
  }

  /**
   * Scores parallel vs sequential execution with the PARL reward shaper and
   * picks the strategy with the higher terminal reward (quality + efficiency).
   * The annealed r_parallel exploration bonus is deliberately excluded from the
   * comparison: it is a training-time incentive, not task value.
   */
  private selectStrategy(
    goal: string,
    projectCount: number,
    epoch: number,
    maxEpochs: number,
  ): { strategy: ExecutionStrategy; rewardInfo: ParlRewardResult } {
    // Planning-time priors: outcomes are unknown before execution, so quality
    // metrics are held at their optimum and the comparison reduces to the
    // efficiency term E(tau), which is what actually differs between strategies.
    const qualityPriors = {
      taskCompletionRate: 1.0,
      regressionFreeRate: 1.0,
      safetyViolationRate: 0.0,
    };
    const sequentialStrict = SEQUENTIAL_GOAL_PATTERN.test(goal);

    const parallelReward = this.rewardShaper.calculateReward({
      epoch,
      maxEpochs,
      subAgentCount: projectCount,
      ...qualityPriors,
      // Ordering constraints keep the critical path at full length even when
      // sub-agents are instantiated, so parallelism only adds overhead.
      criticalSteps: sequentialStrict ? projectCount : 1,
      totalTasks: projectCount,
      isParallelExecution: true,
    });
    const sequentialReward = this.rewardShaper.calculateReward({
      epoch,
      maxEpochs,
      subAgentCount: 1,
      ...qualityPriors,
      criticalSteps: projectCount,
      totalTasks: projectCount,
      isParallelExecution: false,
    });

    return parallelReward.terminalReward > sequentialReward.terminalReward
      ? { strategy: 'parallel', rewardInfo: parallelReward }
      : { strategy: 'sequential', rewardInfo: sequentialReward };
  }

  private detectAffectedProjects(): ProjectMetadata[] {
    const result = runCommand('pnpm nx show projects --affected', {
      cwd: CONFIG.WORKSPACE_ROOT,
      timeout: CONFIG.NX_TIMEOUT_MS,
    });
    if (result.success && result.stdout.trim()) {
      let names: string[] = [];
      try {
        names = JSON.parse(result.stdout.trim()) as string[];
      } catch {
        names = result.stdout.trim().split(/\s+/).filter(Boolean);
      }
      if (names.length > 0) {
        return names.slice(0, 12).map((name) => this.classifier.classify(name));
      }
    }
    return [this.classifier.classify('agent-engine')];
  }

  private buildTaskSpec(goal: string, project: ProjectMetadata): TaskSpec {
    return {
      id: randomUUID(),
      title: `[${project.type}:${project.name}] ${goal}`,
      objective: `Apply the following goal to ${project.name} (${project.root}):\n\n${goal}`,
      constraints: [
        'Local monorepo only',
        'No destructive git commands',
        `Scope changes to project root: ${project.root}`,
        ...(TYPE_CONSTRAINTS[project.type] ?? TYPE_CONSTRAINTS.unknown),
      ],
      acceptanceCriteria: [
        'Quality gates pass for this project',
        'No regressions in dependent projects',
        'Run trace persisted',
      ],
      affectedProjects: [project.name],
      filesHint: [`${project.root}/`],
    };
  }
}
