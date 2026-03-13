import type { BackgroundTask, TaskStats } from '@vibetech/types/tasks';

export interface TaskMonitorPanelProps {
  tasks: BackgroundTask[];
  stats: TaskStats;
  onPauseTask: (taskId: string) => void;
  onResumeTask: (taskId: string) => void;
  onCancelTask: (taskId: string) => void;
  onClearCompleted: () => void;
  onClearAll: () => void;
  history?: BackgroundTask[];
}
