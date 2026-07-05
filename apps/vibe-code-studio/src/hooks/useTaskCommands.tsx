/**
 * useTaskCommands — command-palette entries for the task runner: toggle the
 * Problems panel, run the default build task, and run/cancel each task loaded
 * from .vcs/tasks.json. Consumed by useAICommandPalette.
 * Spec: FEATURE_SPECS/competitive-gaps/02-TASK-RUNNER.md
 */
import { ListChecks, Play, Square } from 'lucide-react';
import type { ReactNode } from 'react';
import { logger } from '../services/Logger';
import {
  cancelWorkspaceTask,
  runDefaultBuildTask,
  runWorkspaceTask,
} from '../services/tasks/taskRunnerIntegration';
import { useProblemsStore } from '../stores/problemsStore';
import { useTasksStore } from '../stores/tasksStore';

export interface TaskCommand {
  id: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  shortcut?: string;
  action: () => void;
  category?: string;
  keywords?: string[];
}

/** Fire-and-forget task start with logged (never thrown) failures */
export function startTaskSafely(run: () => Promise<number | null>, label: string): void {
  void run().catch((err: unknown) => {
    logger.warn(`[TaskRunner] Task "${label}" failed to start`, err);
  });
}

export const useTaskCommands = (): TaskCommand[] => {
  const tasks = useTasksStore(state => state.tasks);
  const running = useTasksStore(state => state.running);

  const commands: TaskCommand[] = [
    {
      id: 'view-toggle-problems',
      title: 'View: Toggle Problems',
      description: 'Show/hide the Problems panel',
      icon: <ListChecks size={18} />,
      shortcut: 'Ctrl+Shift+M',
      action: () => useProblemsStore.getState().actions.togglePanel(),
      category: 'View',
      keywords: ['problems', 'diagnostics', 'errors', 'warnings', 'panel'],
    },
    {
      id: 'task-run-default-build',
      title: 'Tasks: Run Build Task',
      description: 'Run the default build task from .vcs/tasks.json',
      icon: <Play size={18} />,
      shortcut: 'Ctrl+Shift+B',
      action: () => startTaskSafely(runDefaultBuildTask, 'default build'),
      category: 'Tasks',
      keywords: ['task', 'build', 'run', 'compile'],
    },
  ];

  for (const task of tasks) {
    if (running[task.label]) {
      commands.push({
        id: `task-cancel-${task.label}`,
        title: `Tasks: Cancel "${task.label}"`,
        description: 'Stop the running task',
        icon: <Square size={18} />,
        action: () => {
          cancelWorkspaceTask(task.label);
        },
        category: 'Tasks',
        keywords: ['task', 'cancel', 'stop', 'kill', task.label],
      });
    } else {
      commands.push({
        id: `task-run-${task.label}`,
        title: `Tasks: Run "${task.label}"`,
        description: `${task.command} ${(task.args ?? []).join(' ')}`.trim(),
        icon: <Play size={18} />,
        action: () => startTaskSafely(() => runWorkspaceTask(task.label), task.label),
        category: 'Tasks',
        keywords: ['task', 'run', task.label],
      });
    }
  }

  return commands;
};
