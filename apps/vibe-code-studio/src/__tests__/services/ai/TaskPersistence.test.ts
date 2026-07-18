import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TaskPersistence, type TaskOutcomeSummary } from '../../../services/ai/TaskPersistence';
import type { AgentTask } from '../../../types';

const originalElectron = window.electron;

function makeTask(status: AgentTask['status'] = 'in_progress'): AgentTask {
  return {
    id: 'task-1',
    title: 'Persist task',
    description: 'Exercise task persistence',
    userRequest: 'persist this task',
    status,
    createdAt: new Date('2026-07-11T00:00:00.000Z'),
    startedAt: new Date('2026-07-11T00:00:01.000Z'),
    steps: [
      {
        id: 'step-1',
        taskId: 'task-1',
        order: 1,
        title: 'Read',
        description: 'Read a file',
        action: { type: 'read_file', params: { filePath: 'a.ts' } },
        status: 'pending',
        requiresApproval: false,
        retryCount: 0,
        maxRetries: 0,
        startedAt: new Date('2026-07-11T00:00:02.000Z'),
      },
    ],
    metadata: {
      provider: 'openrouter',
      model: 'deepseek/deepseek-v4-pro',
      planningProtocol: 'agent_plan_v1',
      responseShape: 'json_schema_content',
      validationSummary: { schemaVersion: 1, valid: true, attemptCount: 1 },
    },
  };
}

const terminalOutcome = (): TaskOutcomeSummary => ({
  summary: 'Final inspection report: no workspace changes were required.',
  reasonCode: 'completed',
  changedFiles: ['V:\\monorepo\\a.ts'],
  validation: { validated: true },
  event: { eventType: 'task_completed', reasonCode: 'completed' },
});

beforeEach(() => {
  delete window.electron;
  localStorage.clear();
});

afterEach(() => {
  window.electron = originalElectron;
  localStorage.clear();
});

describe('TaskPersistence local fallback', () => {
  it('hydrates dates and returns only executable checkpoints', async () => {
    const persistence = new TaskPersistence();
    await persistence.recordTransition(makeTask(), 'persist this task', 'V:\\monorepo', 0, {
      eventType: 'execution_started',
    });

    const tasks = await new TaskPersistence().getPersistedTasks();

    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.timestamp).toBeInstanceOf(Date);
    expect(tasks[0]?.originalTask.createdAt).toBeInstanceOf(Date);
    expect(tasks[0]?.originalTask.steps[0]?.startedAt).toBeInstanceOf(Date);
  });

  it('archives terminal tasks separately and never returns them as resumable', async () => {
    const persistence = new TaskPersistence();
    const task = makeTask();
    await persistence.recordTransition(task, task.userRequest, 'V:\\monorepo', 0);
    task.status = 'completed';
    task.completedAt = new Date('2026-07-11T00:00:03.000Z');

    const result = await persistence.recordTerminalOutcome(
      task,
      task.userRequest,
      'V:\\monorepo',
      terminalOutcome()
    );
    const duplicate = await persistence.recordTerminalOutcome(
      task,
      task.userRequest,
      'V:\\monorepo',
      terminalOutcome()
    );

    expect(result.learningDelivery.supported).toBe(false);
    expect(duplicate.duplicate).toBe(true);
    await expect(persistence.getPersistedTasks()).resolves.toEqual([]);
    expect(JSON.parse(localStorage.getItem('deepcode_agent_tasks') ?? '[]')).toEqual([]);
    const audit = JSON.parse(localStorage.getItem('deepcode_agent_task_audit') ?? '[]');
    expect(audit).toHaveLength(2);
    expect(audit[1]).toMatchObject({ status: 'completed', outcome: { reasonCode: 'completed' } });
    await expect(new TaskPersistence().getChatOutcomes(task.id)).resolves.toEqual([
      {
        taskId: task.id,
        outcome: 'completed',
        finalReport: 'Final inspection report: no workspace changes were required.',
        createdAt: expect.any(String),
      },
    ]);
  });

  it('filters planning, terminal, and malformed fallback records', async () => {
    const planning = makeTask('planning');
    const terminal = makeTask('failed');
    localStorage.setItem(
      'deepcode_agent_tasks',
      JSON.stringify([
        {
          id: planning.id,
          originalTask: planning,
          currentStepIndex: 0,
          completedSteps: [],
          timestamp: new Date(),
          metadata: {
            userRequest: planning.userRequest,
            workspaceRoot: 'V:\\monorepo',
            totalSteps: 1,
            completedStepsCount: 0,
          },
        },
        {
          id: terminal.id,
          originalTask: terminal,
          currentStepIndex: 0,
          completedSteps: [],
          timestamp: new Date(),
          metadata: {
            userRequest: terminal.userRequest,
            workspaceRoot: 'V:\\monorepo',
            totalSteps: 1,
            completedStepsCount: 0,
          },
        },
        { invalid: true },
      ])
    );

    await expect(new TaskPersistence().getPersistedTasks()).resolves.toEqual([]);
  });
});

describe('TaskPersistence native bridge', () => {
  it('uses dedicated native commands and flushes the durable learning outbox', async () => {
    const recordAgentTransition = vi.fn().mockResolvedValue({ success: true });
    const recordAgentTerminal = vi.fn().mockResolvedValue({
      success: true,
      duplicate: false,
      learningDelivery: { pending: true },
    });
    const flushAgentLearningOutbox = vi.fn().mockResolvedValue({
      delivered: 1,
      pending: 0,
      failed: 0,
    });
    const execute = vi.fn();
    window.electron = {
      db: {
        recordAgentTransition,
        recordAgentTerminal,
        flushAgentLearningOutbox,
        getResumableAgentTasks: vi.fn().mockResolvedValue({ success: true, data: [] }),
        execute,
      },
    } as unknown as Window['electron'];
    const persistence = new TaskPersistence();
    const task = makeTask();

    await persistence.recordTransition(task, task.userRequest, 'V:\\monorepo', 0);
    task.status = 'completed';
    task.completedAt = new Date('2026-07-11T00:00:03.000Z');
    const result = await persistence.recordTerminalOutcome(
      task,
      task.userRequest,
      'V:\\monorepo',
      terminalOutcome()
    );

    expect(recordAgentTransition).toHaveBeenCalledOnce();
    expect(recordAgentTerminal).toHaveBeenCalledOnce();
    expect(flushAgentLearningOutbox).toHaveBeenCalledOnce();
    expect(execute).not.toHaveBeenCalled();
    expect(result.learningDelivery).toMatchObject({ pending: false, delivered: 1 });
  });

  it('retrieves the exact persisted native final report for reload rendering', async () => {
    const getAgentChatOutcomes = vi.fn().mockResolvedValue({
      success: true,
      data: [
        {
          taskId: 'task-1',
          outcome: 'completed',
          finalReport: 'Exact persisted report.',
          createdAt: '2026-07-11T00:00:03.000Z',
        },
      ],
    });
    window.electron = { db: { getAgentChatOutcomes } } as unknown as Window['electron'];

    await expect(new TaskPersistence().getChatOutcomes('task-1')).resolves.toEqual([
      expect.objectContaining({ finalReport: 'Exact persisted report.' }),
    ]);
    expect(getAgentChatOutcomes).toHaveBeenCalledWith('task-1', 1);
  });
});
