import { useState } from 'react';
import type { BackgroundTask } from '@vibetech/types/tasks';
import { TaskStatus } from '@vibetech/types/tasks';

export function useTaskMonitor(tasks: BackgroundTask[]) {
  const [filter, setFilter] = useState<'all' | 'running' | 'queued' | 'completed'>('all');
  const [showHistory, setShowHistory] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'all') return true;
    if (filter === 'running') return task.status === TaskStatus.RUNNING;
    if (filter === 'queued') return task.status === TaskStatus.QUEUED;
    if (filter === 'completed') {
      return task.status === TaskStatus.COMPLETED || task.status === TaskStatus.FAILED;
    }
    return true;
  });

  const toggleTaskExpanded = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  return {
    filter,
    setFilter,
    showHistory,
    setShowHistory,
    expandedTasks,
    toggleTaskExpanded,
    filteredTasks,
  };
}