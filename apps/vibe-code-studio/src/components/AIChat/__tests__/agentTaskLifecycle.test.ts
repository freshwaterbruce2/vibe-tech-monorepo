/**
 * Unit tests for agentTaskLifecycle pure helpers.
 *
 * These helpers were extracted from AIChat.tsx to keep the component within the
 * size cap; AIChat consumes all seven for task-step updates, terminal snapshots,
 * and the completed/cancelled status text. Tests exercise every branch so the
 * new module lands at full coverage.
 */
import { describe, expect, it } from 'vitest';

import type { AgentStep, AgentTask, StepResult } from '../../../types';
import {
  getCancelledStatus,
  getCompletedStatus,
  getCompletedTaskContent,
  getStepOrdinal,
  snapshotTask,
  snapshotTerminalTask,
  updateTaskStep,
} from '../agentTaskLifecycle';

const makeStep = (overrides: Partial<AgentStep> = {}): AgentStep => ({
  id: 'step-1',
  taskId: 'task-1',
  order: 0,
  title: 'Step',
  description: 'A step',
  action: { type: 'read_file', params: {} },
  status: 'pending',
  requiresApproval: false,
  retryCount: 0,
  maxRetries: 3,
  ...overrides,
});

const makeTask = (overrides: Partial<AgentTask> = {}): AgentTask => ({
  id: 'task-1',
  title: 'Do the thing',
  description: 'Task description',
  userRequest: 'please do the thing',
  steps: [makeStep()],
  status: 'in_progress',
  createdAt: new Date('2026-07-12T00:00:00Z'),
  ...overrides,
});

describe('updateTaskStep', () => {
  it('replaces the matching step and leaves others untouched', () => {
    const task = makeTask({
      steps: [makeStep({ id: 'a' }), makeStep({ id: 'b', title: 'old' })],
    });
    const updated = updateTaskStep(task, makeStep({ id: 'b', title: 'new' }));

    expect(updated.steps).toHaveLength(2);
    expect(updated.steps[0].id).toBe('a');
    expect(updated.steps[1].title).toBe('new');
    // original task is not mutated
    expect(task.steps[1].title).toBe('old');
  });

  it('leaves every step unchanged when no id matches', () => {
    const task = makeTask({ steps: [makeStep({ id: 'a', title: 'keep' })] });
    const updated = updateTaskStep(task, makeStep({ id: 'z', title: 'ignored' }));

    expect(updated.steps[0].title).toBe('keep');
  });
});

describe('getStepOrdinal', () => {
  it('returns the 1-based position of a known step', () => {
    const task = makeTask({
      steps: [makeStep({ id: 'a' }), makeStep({ id: 'b' }), makeStep({ id: 'c' })],
    });
    expect(getStepOrdinal(task, 'c')).toBe(3);
  });

  it('falls back to 1 for an unknown step id', () => {
    expect(getStepOrdinal(makeTask(), 'missing')).toBe(1);
  });
});

describe('snapshotTask', () => {
  it('preserves the current status when none is provided', () => {
    const task = makeTask({ status: 'paused' });
    const snap = snapshotTask(task);

    expect(snap.status).toBe('paused');
    expect(snap.steps).not.toBe(task.steps);
    expect(snap.steps[0]).not.toBe(task.steps[0]);
  });

  it('applies an explicit status override', () => {
    const snap = snapshotTask(makeTask(), 'completed');
    expect(snap.status).toBe('completed');
  });
});

describe('snapshotTerminalTask', () => {
  it('rejects awaiting-approval steps when the task is cancelled', () => {
    const task = makeTask({
      steps: [
        makeStep({ id: 'a', status: 'completed' }),
        makeStep({ id: 'b', status: 'awaiting_approval' }),
      ],
    });
    const snap = snapshotTerminalTask(task, 'cancelled');

    expect(snap.status).toBe('cancelled');
    expect(snap.steps[0].status).toBe('completed');
    expect(snap.steps[1].status).toBe('rejected');
  });

  it('fails awaiting-approval steps when the task fails', () => {
    const task = makeTask({ steps: [makeStep({ status: 'awaiting_approval' })] });
    const snap = snapshotTerminalTask(task, 'failed');

    expect(snap.status).toBe('failed');
    expect(snap.steps[0].status).toBe('failed');
  });
});

describe('getCompletedStatus', () => {
  it('lists the unique changed files across all steps', () => {
    const result: StepResult = {
      success: true,
      filesCreated: ['a.ts'],
      filesModified: ['b.ts', 'a.ts'],
      filesDeleted: ['c.ts'],
    };
    const task = makeTask({ steps: [makeStep({ result })] });

    const status = getCompletedStatus(task);
    expect(status).toContain('a.ts');
    expect(status).toContain('b.ts');
    expect(status).toContain('c.ts');
    // a.ts appears once despite being created and modified
    expect(status.match(/a\.ts/g)).toHaveLength(1);
  });

  it('reports no file changes when steps touched nothing', () => {
    const task = makeTask({ steps: [makeStep({ result: { success: true } })] });
    expect(getCompletedStatus(task)).toBe(
      'Task completed successfully. No workspace file changes were reported.'
    );
  });
});

describe('getCompletedTaskContent', () => {
  it('prefers the canonical finalReport when present', () => {
    const task = makeTask({ finalReport: '  Everything is wired up.  ' });
    expect(getCompletedTaskContent(task)).toBe(
      '**Agent Task**: Do the thing\n\nEverything is wired up.'
    );
  });

  it('falls back to the final step synthesis when there is no finalReport', () => {
    const task = makeTask({
      steps: [
        makeStep({
          result: {
            success: true,
            data: { isSynthesis: true, generatedCode: '  const x = 1;  ' },
          },
        }),
      ],
    });
    expect(getCompletedTaskContent(task)).toBe('**Agent Task**: Do the thing\n\nconst x = 1;');
  });

  it('returns an empty string when neither report nor synthesis exists', () => {
    const task = makeTask({
      steps: [makeStep({ result: { success: true, data: 'not-an-object' } })],
    });
    expect(getCompletedTaskContent(task)).toBe('');
  });
});

describe('getCancelledStatus', () => {
  it('embeds the supplied reason in the cancellation message', () => {
    const message = getCancelledStatus('User aborted.');
    expect(message).toContain('User aborted.');
    expect(message).toContain('The pending proposal was not applied.');
  });
});
