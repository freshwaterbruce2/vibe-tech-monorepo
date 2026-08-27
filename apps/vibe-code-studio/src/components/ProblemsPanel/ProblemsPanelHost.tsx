/**
 * ProblemsPanelHost — store-driven mount for the ProblemsPanel plus the
 * task-runner keyboard shortcuts (see ./taskRunnerKeydown.ts). Mounted once
 * in AppLayout; owns its open/close state via problemsStore so the app shell
 * stays untouched.
 * Spec: FEATURE_SPECS/competitive-gaps/02-TASK-RUNNER.md
 */
import { useEffect } from 'react';
import { logger } from '../../services/Logger';
import { loadWorkspaceTasks } from '../../services/tasks/taskRunnerIntegration';
import { useProblemsStore } from '../../stores/problemsStore';
import { useEditorStore } from '../../stores/useEditorStore';
import { ProblemsPanel } from './index';
import { handleTaskRunnerKeydown } from './taskRunnerKeydown';

export interface ProblemsPanelHostProps {
  onOpenFile?: (file: string, line?: number, column?: number) => void;
}

export const ProblemsPanelHost = ({ onOpenFile }: ProblemsPanelHostProps) => {
  const panelOpen = useProblemsStore(state => state.panelOpen);
  const setPanelOpen = useProblemsStore(state => state.actions.setPanelOpen);
  const workspaceFolder = useEditorStore(state => state.workspaceFolder);

  useEffect(() => {
    globalThis.addEventListener('keydown', handleTaskRunnerKeydown);
    return () => globalThis.removeEventListener('keydown', handleTaskRunnerKeydown);
  }, []);

  useEffect(() => {
    if (!workspaceFolder) return;
    void loadWorkspaceTasks(workspaceFolder).then(result => {
      if (!result.ok) {
        logger.warn(`[TaskRunner] Failed to load .vcs/tasks.json: ${result.error}`);
      }
    });
  }, [workspaceFolder]);

  return (
    <ProblemsPanel isOpen={panelOpen} onClose={() => setPanelOpen(false)} onOpenFile={onOpenFile} />
  );
};
