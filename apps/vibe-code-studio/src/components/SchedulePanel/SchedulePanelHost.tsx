/**
 * SchedulePanelHost — store-driven mount for the SchedulePanel. Mounted once
 * in AppLayout; owns its open/close state via schedulesStore (same pattern as
 * ProblemsPanelHost) and boots the scheduling engine against the app's real
 * BackgroundAgentSystem, workspace state, and notification system.
 * Spec: FEATURE_SPECS/competitive-gaps/16-AGENT-SCHEDULING.md
 */
import { useEffect } from 'react';
import { useAppExtras, useServices } from '../../app/contexts';
import {
  createSchedule,
  deleteSchedule,
  editSchedule,
  initScheduling,
  pauseSchedule,
  resumeSchedule,
  runScheduleAction,
} from '../../services/scheduling/schedulerIntegration';
import { useEditorStore } from '../../stores/useEditorStore';
import { useSchedulesStore } from '../../stores/schedulesStore';
import { SchedulePanel } from './index';

export const SchedulePanelHost = () => {
  const services = useServices();
  const extras = useAppExtras();
  const panelOpen = useSchedulesStore(state => state.panelOpen);
  const setPanelOpen = useSchedulesStore(state => state.actions.setPanelOpen);
  const workspaceFolder = useEditorStore(state => state.workspaceFolder);

  const { showSuccess, showError } = extras;
  useEffect(() => {
    runScheduleAction(
      () =>
        initScheduling({
          submitter: services.backgroundAgentSystem,
          getWorkspaceRoot: () => useEditorStore.getState().workspaceFolder,
          notify: (kind, title, message) => {
            if (kind === 'success') showSuccess(title, message);
            else showError(title, message);
          },
        }),
      'init'
    );
  }, [services.backgroundAgentSystem, showSuccess, showError]);

  return (
    <SchedulePanel
      isOpen={panelOpen}
      workspaceRoot={workspaceFolder}
      onClose={() => setPanelOpen(false)}
      onCreate={draft => runScheduleAction(() => createSchedule(draft), 'create')}
      onEdit={(id, draft) => runScheduleAction(() => editSchedule(id, draft), 'edit')}
      onPause={id => runScheduleAction(() => pauseSchedule(id), 'pause')}
      onResume={id => runScheduleAction(() => resumeSchedule(id), 'resume')}
      onDelete={id => runScheduleAction(() => deleteSchedule(id), 'delete')}
    />
  );
};
