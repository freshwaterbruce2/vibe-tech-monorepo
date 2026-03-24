import { randomUUID } from 'crypto';
import { CONFIG } from '../config.js';
import { runCommand } from '../tools/process-tools.js';
import { ProjectClassifier, type ProjectMetadata, type ProjectType } from './project-classifier.js';
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

export interface RouteResult {
  goal: string;
  projects: ProjectMetadata[];
  tasks: RoutedTask[];
}

export class MonorepoTaskRouter {
  constructor(private readonly classifier = new ProjectClassifier()) {}

  route(goal: string, explicitProjects?: string[]): RouteResult {
    const projects =
      explicitProjects && explicitProjects.length > 0
        ? explicitProjects.map((name) => this.classifier.classify(name))
        : this.detectAffectedProjects();
    const tasks = projects.map((project) => ({
      project,
      task: this.buildTaskSpec(goal, project),
    }));
    return { goal, projects, tasks };
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
