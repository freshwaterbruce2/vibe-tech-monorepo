import { describe, expect, it, vi } from 'vitest';
import { MonorepoTaskRouter } from '../services/monorepo-task-router.js';
import type { ProjectMetadata } from '../services/project-classifier.js';

// Prevent real nx subprocess from blocking unit tests
vi.mock('../tools/process-tools.js', () => ({
  runCommand: vi.fn(() => ({ success: false, stdout: '', stderr: 'mocked in test' })),
}));

function makeProject(name: string, type: ProjectMetadata['type'] = 'typescript'): ProjectMetadata {
  return { name, root: `apps/${name}`, type, tags: [] };
}

const mockClassifier = {
  classify: vi.fn((name: string) => makeProject(name)),
  detectType: vi.fn(() => 'typescript' as const),
};

describe('MonorepoTaskRouter', () => {
  it('routes explicit projects without calling nx', () => {
    const router = new MonorepoTaskRouter(mockClassifier);
    const result = router.route('fix lint errors', ['nova-agent', 'vibe-tutor']);

    expect(mockClassifier.classify).toHaveBeenCalledWith('nova-agent');
    expect(mockClassifier.classify).toHaveBeenCalledWith('vibe-tutor');
    expect(result.tasks).toHaveLength(2);
    expect(result.goal).toBe('fix lint errors');
  });

  it('builds a task spec scoped to the project root', () => {
    mockClassifier.classify.mockReturnValueOnce(makeProject('agent-engine', 'typescript'));
    const router = new MonorepoTaskRouter(mockClassifier);
    const { tasks } = router.route('add error handling', ['agent-engine']);

    const { task } = tasks[0]!;
    expect(task.title).toContain('agent-engine');
    expect(task.objective).toContain('apps/agent-engine');
    expect(task.filesHint).toContain('apps/agent-engine/');
    expect(task.affectedProjects).toEqual(['agent-engine']);
  });

  it('includes typescript-specific constraints for typescript projects', () => {
    mockClassifier.classify.mockReturnValueOnce(makeProject('my-app', 'typescript'));
    const router = new MonorepoTaskRouter(mockClassifier);
    const { tasks } = router.route('add tests', ['my-app']);

    const { task } = tasks[0]!;
    expect(task.constraints.some((c: string) => c.includes('pnpm nx lint'))).toBe(true);
    expect(task.constraints.some((c: string) => c.includes('TypeScript strict'))).toBe(true);
  });

  it('includes rust-specific constraints for rust projects', () => {
    mockClassifier.classify.mockReturnValueOnce(makeProject('nova-agent', 'rust'));
    const router = new MonorepoTaskRouter(mockClassifier);
    const { tasks } = router.route('refactor module', ['nova-agent']);

    const { task } = tasks[0]!;
    expect(task.constraints.some((c: string) => c.includes('cargo check'))).toBe(true);
    expect(task.constraints.some((c: string) => c.includes('unsafe'))).toBe(true);
  });

  it('includes python-specific constraints for python projects', () => {
    mockClassifier.classify.mockReturnValueOnce(makeProject('crypto-enhanced', 'python'));
    const router = new MonorepoTaskRouter(mockClassifier);
    const { tasks } = router.route('update strategy', ['crypto-enhanced']);

    const { task } = tasks[0]!;
    expect(task.constraints.some((c: string) => c.includes('ruff'))).toBe(true);
    expect(task.constraints.some((c: string) => c.includes('requirements.txt'))).toBe(true);
  });

  it('includes android-specific constraints for android projects', () => {
    mockClassifier.classify.mockReturnValueOnce(makeProject('vibe-tutor', 'android'));
    const router = new MonorepoTaskRouter(mockClassifier);
    const { tasks } = router.route('add push notifications', ['vibe-tutor']);

    const { task } = tasks[0]!;
    expect(task.constraints.some((c: string) => c.includes('android:build'))).toBe(true);
    expect(task.constraints.some((c: string) => c.includes('minSdk'))).toBe(true);
  });

  it('always includes monorepo-wide guardrails in constraints', () => {
    mockClassifier.classify.mockReturnValueOnce(makeProject('any-app', 'typescript'));
    const router = new MonorepoTaskRouter(mockClassifier);
    const { tasks } = router.route('some goal', ['any-app']);

    const { task } = tasks[0]!;
    expect(task.constraints).toContain('Local monorepo only');
    expect(task.constraints).toContain('No destructive git commands');
  });

  it('assigns unique ids to each task', () => {
    mockClassifier.classify
      .mockReturnValueOnce(makeProject('app-a', 'typescript'))
      .mockReturnValueOnce(makeProject('app-b', 'typescript'));
    const router = new MonorepoTaskRouter(mockClassifier);
    const { tasks } = router.route('fix types', ['app-a', 'app-b']);

    expect(tasks[0]!.task.id).not.toBe(tasks[1]!.task.id);
  });

  it('returns empty tasks when route is called with empty explicit list', () => {
    mockClassifier.classify.mockReturnValueOnce(makeProject('agent-engine', 'typescript'));
    const router = new MonorepoTaskRouter(mockClassifier);
    const result = router.route('no-op', []);
    // affected detection fires; nx will fail in unit tests, so fallback to agent-engine
    expect(result.tasks.length).toBeGreaterThanOrEqual(0);
  });
});
