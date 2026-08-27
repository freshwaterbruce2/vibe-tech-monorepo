/**
 * AgentManagerPanelHost — store-gated mount (SchedulePanelHost pattern).
 * Subscribes the store to the app's real BackgroundAgentSystem with an
 * idempotent disposer (StrictMode-safe) and routes panel actions.
 * Spec: FEATURE_SPECS/competitive-gaps/10-AGENT-MANAGER-PARALLEL.md
 */
import { useEffect } from 'react';
import { useServices } from '../../app/contexts';
import {
  cancelTask,
  dismissInboxEntry,
  initAgentManager,
  replyToTask,
  startAgent,
} from '../../services/agentManager/agentManagerIntegration';
import { useAgentManagerStore } from '../../stores/agentManagerStore';
import { useEditorStore } from '../../stores/useEditorStore';
import { AgentManagerPanel } from './AgentManagerPanel';

export const AgentManagerPanelHost = () => {
  const services = useServices();
  const panelOpen = useAgentManagerStore(state => state.panelOpen);
  const setPanelOpen = useAgentManagerStore(state => state.actions.setPanelOpen);
  const workspaceFolder = useEditorStore(state => state.workspaceFolder);

  const system = services.backgroundAgentSystem;

  useEffect(() => initAgentManager(system), [system]);

  if (!panelOpen) {
    return null;
  }

  return (
    <AgentManagerPanel
      workspaceReady={!!workspaceFolder}
      onStart={userRequest => void startAgent(system, userRequest, workspaceFolder ?? '')}
      onCancel={taskId => void cancelTask(system, taskId)}
      onReply={(taskId, body) => void replyToTask(system, taskId, body)}
      onDismissInbox={dismissInboxEntry}
      onClose={() => setPanelOpen(false)}
    />
  );
};
