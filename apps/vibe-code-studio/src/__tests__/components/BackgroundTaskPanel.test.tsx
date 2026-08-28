/**
 * BackgroundTaskPanel Component Tests
 *
 * Renders the REAL BackgroundTaskPanel against a lightweight stub of
 * BackgroundAgentSystem. The component only consumes four methods of the
 * system (getAllTasks, getStats, cancel, clearCompleted), so the stub
 * implements exactly those plus a mutable task list. No production source
 * is modified.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BackgroundTaskPanel } from '../../components/BackgroundTaskPanel';
import type { BackgroundTask, BackgroundAgentSystem } from '../../services/BackgroundAgentSystem';

type Stats = ReturnType<BackgroundAgentSystem['getStats']>;

/**
 * Build a fully-typed BackgroundTask with sensible defaults that the test
 * can override per case.
 */
const makeTask = (overrides: Partial<BackgroundTask> = {}): BackgroundTask => ({
  id: 'task-1',
  agentId: 'code-agent',
  userRequest: 'Refactor the auth module',
  workspaceRoot: 'V:\\monorepo',
  parameters: {},
  status: 'running',
  ...overrides,
});

/** Compute stats the same way the real system does, from a task list. */
const computeStats = (tasks: BackgroundTask[]): Stats => ({
  total: tasks.length,
  pending: tasks.filter((t) => t.status === 'pending').length,
  running: tasks.filter((t) => t.status === 'running').length,
  completed: tasks.filter((t) => t.status === 'completed').length,
  failed: tasks.filter((t) => t.status === 'failed').length,
  cancelled: tasks.filter((t) => t.status === 'cancelled').length,
});

/**
 * Minimal stand-in for BackgroundAgentSystem exposing only the surface the
 * component touches. Cast to the real type at the call site.
 */
const makeAgent = (tasks: BackgroundTask[]) => {
  const cancel = vi.fn((taskId: string) => {
    const t = tasks.find((x) => x.id === taskId);
    if (t) {
      t.status = 'cancelled';
    }
    return true;
  });
  const clearCompleted = vi.fn(() => {
    for (let i = tasks.length - 1; i >= 0; i--) {
      const s = tasks[i].status;
      if (s === 'completed' || s === 'failed' || s === 'cancelled') {
        tasks.splice(i, 1);
      }
    }
  });
  const agent = {
    getAllTasks: vi.fn(() => [...tasks]),
    getStats: vi.fn(() => computeStats(tasks)),
    cancel,
    clearCompleted,
  };
  // The component only uses the four methods above; the real type is large.
  return agent as unknown as BackgroundAgentSystem & {
    getAllTasks: ReturnType<typeof vi.fn>;
    getStats: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>;
    clearCompleted: ReturnType<typeof vi.fn>;
  };
};

describe('BackgroundTaskPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Header and shell', () => {
    it('renders the panel title and queries the agent for tasks/stats', async () => {
      const agent = makeAgent([]);
      render(<BackgroundTaskPanel backgroundAgent={agent} />);

      expect(screen.getByText('Background Tasks')).toBeInTheDocument();

      // Initial load happens in a queued microtask.
      await waitFor(() => {
        expect(agent.getAllTasks).toHaveBeenCalled();
        expect(agent.getStats).toHaveBeenCalled();
      });
    });

    it('renders Running/Completed/Failed stat counters from getStats', async () => {
      const tasks = [
        makeTask({ id: 'r1', status: 'running' }),
        makeTask({ id: 'c1', status: 'completed' }),
        makeTask({ id: 'c2', status: 'completed' }),
        makeTask({ id: 'f1', status: 'failed' }),
      ];
      const agent = makeAgent(tasks);
      render(<BackgroundTaskPanel backgroundAgent={agent} />);

      // Stat labels.
      expect(await screen.findByText('Running')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('Failed')).toBeInTheDocument();

      // The "All" filter button reflects the full task count of 4.
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'All (4)' })).toBeInTheDocument();
      });
    });
  });

  describe('Empty state', () => {
    it('shows the empty state when there are no tasks', async () => {
      const agent = makeAgent([]);
      render(<BackgroundTaskPanel backgroundAgent={agent} />);

      expect(await screen.findByText('No tasks yet')).toBeInTheDocument();
      expect(
        screen.getByText(/Background tasks will appear here/i)
      ).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'All (0)' })).toBeInTheDocument();
    });
  });

  describe('Active / running tasks', () => {
    it('renders a running task with its request, status, progress and step counter', async () => {
      const task = makeTask({
        id: 'run-1',
        status: 'running',
        userRequest: 'Generate unit tests',
        stepDescription: 'Writing assertions',
        progress: 42,
        currentStep: 2,
        totalSteps: 5,
        startTime: Date.now(),
      });
      const agent = makeAgent([task]);
      render(<BackgroundTaskPanel backgroundAgent={agent} />);

      expect(await screen.findByText('Generate unit tests')).toBeInTheDocument();
      // Status label is lowercased text from the model, rendered in a span.
      expect(screen.getByText('running')).toBeInTheDocument();
      // Step description only shows for running tasks.
      expect(screen.getByText('Writing assertions')).toBeInTheDocument();
      // Progress percentage (Math.round(42) = 42) and step counter.
      expect(screen.getByText(/42%/)).toBeInTheDocument();
      expect(screen.getByText(/Step 2\/5/)).toBeInTheDocument();
    });

    it('rounds the progress percentage for display', async () => {
      const task = makeTask({
        id: 'run-2',
        status: 'running',
        progress: 66.7,
      });
      const agent = makeAgent([task]);
      render(<BackgroundTaskPanel backgroundAgent={agent} />);

      expect(await screen.findByText(/67%/)).toBeInTheDocument();
    });

    it('does not render a progress bar for non-running tasks', async () => {
      const task = makeTask({
        id: 'done-1',
        status: 'completed',
        userRequest: 'Build project',
        progress: 100,
      });
      const agent = makeAgent([task]);
      render(<BackgroundTaskPanel backgroundAgent={agent} />);

      expect(await screen.findByText('Build project')).toBeInTheDocument();
      // No percentage text because the progress bar only renders for running.
      expect(screen.queryByText(/100%/)).not.toBeInTheDocument();
    });
  });

  describe('Completed tasks', () => {
    it('renders a completed task with its status and agent metadata', async () => {
      const task = makeTask({
        id: 'cmp-1',
        agentId: 'builder-agent',
        status: 'completed',
        userRequest: 'Compile and bundle',
        startTime: 1_000,
        endTime: 4_000,
      });
      const agent = makeAgent([task]);
      render(<BackgroundTaskPanel backgroundAgent={agent} />);

      expect(await screen.findByText('Compile and bundle')).toBeInTheDocument();
      expect(screen.getByText('completed')).toBeInTheDocument();
      expect(screen.getByText('Agent: builder-agent')).toBeInTheDocument();
      // Duration: (4000 - 1000)/1000 = 3s, computed from start/end times.
      expect(screen.getByText('3s')).toBeInTheDocument();
    });
  });

  describe('Error states', () => {
    it('renders the error message for a failed task', async () => {
      const task = makeTask({
        id: 'err-1',
        status: 'failed',
        userRequest: 'Deploy to production',
        error: new Error('Connection refused'),
      });
      const agent = makeAgent([task]);
      render(<BackgroundTaskPanel backgroundAgent={agent} />);

      expect(await screen.findByText('Deploy to production')).toBeInTheDocument();
      expect(screen.getByText('failed')).toBeInTheDocument();
      expect(screen.getByText('Connection refused')).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('shows only completed tasks when the Completed filter is selected', async () => {
      const tasks = [
        makeTask({ id: 'r1', status: 'running', userRequest: 'Running task' }),
        makeTask({ id: 'c1', status: 'completed', userRequest: 'Completed task' }),
        makeTask({ id: 'f1', status: 'failed', userRequest: 'Failed task' }),
      ];
      const agent = makeAgent(tasks);
      render(<BackgroundTaskPanel backgroundAgent={agent} />);

      // All three visible under the default "all" filter.
      expect(await screen.findByText('Running task')).toBeInTheDocument();
      expect(screen.getByText('Completed task')).toBeInTheDocument();
      expect(screen.getByText('Failed task')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Completed (1)' }));

      expect(screen.getByText('Completed task')).toBeInTheDocument();
      expect(screen.queryByText('Running task')).not.toBeInTheDocument();
      expect(screen.queryByText('Failed task')).not.toBeInTheDocument();
    });

    it('shows running and pending tasks under the Active filter', async () => {
      const tasks = [
        makeTask({ id: 'r1', status: 'running', userRequest: 'Running task' }),
        makeTask({ id: 'p1', status: 'pending', userRequest: 'Pending task' }),
        makeTask({ id: 'c1', status: 'completed', userRequest: 'Completed task' }),
      ];
      const agent = makeAgent(tasks);
      render(<BackgroundTaskPanel backgroundAgent={agent} />);

      // Active filter count is running(1) + pending(1) = 2.
      const activeBtn = await screen.findByRole('button', { name: 'Active (2)' });
      fireEvent.click(activeBtn);

      expect(screen.getByText('Running task')).toBeInTheDocument();
      expect(screen.getByText('Pending task')).toBeInTheDocument();
      expect(screen.queryByText('Completed task')).not.toBeInTheDocument();
    });

    it('shows only failed tasks under the Failed filter', async () => {
      const tasks = [
        makeTask({ id: 'c1', status: 'completed', userRequest: 'Completed task' }),
        makeTask({
          id: 'f1',
          status: 'failed',
          userRequest: 'Failed task',
          error: new Error('boom'),
        }),
      ];
      const agent = makeAgent(tasks);
      render(<BackgroundTaskPanel backgroundAgent={agent} />);

      fireEvent.click(await screen.findByRole('button', { name: 'Failed (1)' }));

      expect(screen.getByText('Failed task')).toBeInTheDocument();
      expect(screen.queryByText('Completed task')).not.toBeInTheDocument();
    });
  });

  describe('Cancellation', () => {
    it('shows a cancel button only for running tasks and calls agent.cancel', async () => {
      const task = makeTask({
        id: 'run-cancel',
        status: 'running',
        userRequest: 'Long running job',
      });
      const agent = makeAgent([task]);
      render(<BackgroundTaskPanel backgroundAgent={agent} />);

      const cancelBtn = await screen.findByTitle('Cancel task');
      fireEvent.click(cancelBtn);

      expect(agent.cancel).toHaveBeenCalledWith('run-cancel');
    });

    it('does not render a cancel button for completed tasks', async () => {
      const task = makeTask({
        id: 'cmp-no-cancel',
        status: 'completed',
        userRequest: 'Finished job',
      });
      const agent = makeAgent([task]);
      render(<BackgroundTaskPanel backgroundAgent={agent} />);

      expect(await screen.findByText('Finished job')).toBeInTheDocument();
      expect(screen.queryByTitle('Cancel task')).not.toBeInTheDocument();
    });

    it('stops propagation so cancelling does not trigger onTaskClick', async () => {
      const onTaskClick = vi.fn();
      const task = makeTask({
        id: 'run-stop-prop',
        status: 'running',
        userRequest: 'Job with click handler',
      });
      const agent = makeAgent([task]);
      render(
        <BackgroundTaskPanel backgroundAgent={agent} onTaskClick={onTaskClick} />
      );

      const cancelBtn = await screen.findByTitle('Cancel task');
      fireEvent.click(cancelBtn);

      expect(agent.cancel).toHaveBeenCalledWith('run-stop-prop');
      expect(onTaskClick).not.toHaveBeenCalled();
    });
  });

  describe('Task click', () => {
    it('calls onTaskClick with the task when a task item is clicked', async () => {
      const onTaskClick = vi.fn();
      const task = makeTask({
        id: 'click-1',
        status: 'completed',
        userRequest: 'Clickable task',
      });
      const agent = makeAgent([task]);
      render(
        <BackgroundTaskPanel backgroundAgent={agent} onTaskClick={onTaskClick} />
      );

      fireEvent.click(await screen.findByText('Clickable task'));

      expect(onTaskClick).toHaveBeenCalledTimes(1);
      expect(onTaskClick).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'click-1', userRequest: 'Clickable task' })
      );
    });
  });

  describe('Clear completed', () => {
    it('shows the Clear Completed button only when completed tasks exist', async () => {
      const agent = makeAgent([
        makeTask({ id: 'c1', status: 'completed', userRequest: 'Done' }),
      ]);
      render(<BackgroundTaskPanel backgroundAgent={agent} />);

      const clearBtn = await screen.findByRole('button', {
        name: 'Clear Completed',
      });
      fireEvent.click(clearBtn);

      expect(agent.clearCompleted).toHaveBeenCalledTimes(1);
    });

    it('hides the Clear Completed button when no tasks are completed', async () => {
      const agent = makeAgent([
        makeTask({ id: 'r1', status: 'running', userRequest: 'Active only' }),
      ]);
      render(<BackgroundTaskPanel backgroundAgent={agent} />);

      expect(await screen.findByText('Active only')).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Clear Completed' })
      ).not.toBeInTheDocument();
    });
  });

  describe('Multiple concurrent tasks', () => {
    it('renders every task in the list under the default filter', async () => {
      const tasks = [
        makeTask({ id: 't1', status: 'running', userRequest: 'Task one' }),
        makeTask({ id: 't2', status: 'pending', userRequest: 'Task two' }),
        makeTask({ id: 't3', status: 'completed', userRequest: 'Task three' }),
        makeTask({
          id: 't4',
          status: 'failed',
          userRequest: 'Task four',
          error: new Error('nope'),
        }),
      ];
      const agent = makeAgent(tasks);
      render(<BackgroundTaskPanel backgroundAgent={agent} />);

      expect(await screen.findByText('Task one')).toBeInTheDocument();
      expect(screen.getByText('Task two')).toBeInTheDocument();
      expect(screen.getByText('Task three')).toBeInTheDocument();
      expect(screen.getByText('Task four')).toBeInTheDocument();

      // All filter reflects the full count.
      expect(
        screen.getByRole('button', { name: 'All (4)' })
      ).toBeInTheDocument();
    });
  });
});
