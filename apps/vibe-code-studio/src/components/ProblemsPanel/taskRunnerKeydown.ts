/**
 * Task-runner keyboard shortcuts (separate file for react-refresh compliance):
 *   Ctrl+Shift+M — toggle Problems panel (VS Code parity)
 *   Ctrl+Shift+B — run the default build task
 * Registered on window by ProblemsPanelHost.
 */
import { logger } from '../../services/Logger';
import { runDefaultBuildTask } from '../../services/tasks/taskRunnerIntegration';
import { useProblemsStore } from '../../stores/problemsStore';

export function handleTaskRunnerKeydown(event: KeyboardEvent): void {
  if (!event.ctrlKey || !event.shiftKey) return;
  if (event.key === 'M') {
    event.preventDefault();
    useProblemsStore.getState().actions.togglePanel();
  } else if (event.key === 'B') {
    event.preventDefault();
    void runDefaultBuildTask().catch((err: unknown) => {
      logger.warn('[TaskRunner] Default build task failed to start', err);
    });
  }
}
