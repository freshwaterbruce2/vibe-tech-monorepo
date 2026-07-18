import type { AgentStep, AgentTask } from '../../types';

export const updateTaskStep = (task: AgentTask, step: AgentStep): AgentTask => ({
  ...task,
  steps: task.steps.map(existingStep => (existingStep.id === step.id ? { ...step } : existingStep)),
});

export const getStepOrdinal = (task: AgentTask, stepId: string): number => {
  const index = task.steps.findIndex(step => step.id === stepId);
  return index >= 0 ? index + 1 : 1;
};

export const snapshotTask = (task: AgentTask, status = task.status): AgentTask => ({
  ...task,
  status,
  steps: task.steps.map(step => ({ ...step })),
});

export const snapshotTerminalTask = (
  task: AgentTask,
  status: 'failed' | 'cancelled'
): AgentTask => ({
  ...snapshotTask(task, status),
  steps: task.steps.map(step =>
    step.status === 'awaiting_approval'
      ? { ...step, status: status === 'cancelled' ? 'rejected' : 'failed' }
      : { ...step }
  ),
});

export const getCompletedStatus = (task: AgentTask): string => {
  const changedFiles = task.steps.flatMap(step => [
    ...(step.result?.filesCreated ?? []),
    ...(step.result?.filesModified ?? []),
    ...(step.result?.filesDeleted ?? []),
  ]);
  const uniqueFiles = [...new Set(changedFiles)];
  return uniqueFiles.length > 0
    ? `Task completed successfully. Applied and validated changes to: ${uniqueFiles.join(', ')}.`
    : 'Task completed successfully. No workspace file changes were reported.';
};

export const getCompletedTaskContent = (task: AgentTask): string => {
  const canonicalReport = task.finalReport?.trim();
  if (canonicalReport) return `**Agent Task**: ${task.title}\n\n${canonicalReport}`;
  const finalStep = task.steps[task.steps.length - 1];
  const data = finalStep?.result?.data;
  const synthesis =
    typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : undefined;
  const report =
    synthesis?.['isSynthesis'] === true && typeof synthesis['generatedCode'] === 'string'
      ? synthesis['generatedCode'].trim()
      : '';
  return report ? `**Agent Task**: ${task.title}\n\n${report}` : '';
};

export const getCancelledStatus = (reason: string): string =>
  `Task cancelled: ${reason} The pending proposal was not applied. ` +
  'Review any earlier completed steps before retrying.';
