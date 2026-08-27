/**
 * AgentManagerPanel — spec 10 Phase 1: start agents, live event-driven task
 * list, Inbox with deep-link, reply-to-task via the shared injectMessage
 * channel. Rendered by AgentManagerPanelHost. (BackgroundTaskPanel stays
 * untouched; it retires in Phase 2.)
 * Spec: FEATURE_SPECS/competitive-gaps/10-AGENT-MANAGER-PARALLEL.md
 */
import { useState } from 'react';
import styled from 'styled-components';
import type { BackgroundTask } from '../../services/BackgroundAgentSystem';
import { useAgentManagerStore } from '../../stores/agentManagerStore';
import { AgentListItem } from './AgentListItem';
import { InboxSection } from './InboxSection';
import { StartAgentRow } from './StartAgentRow';

const Panel = styled.div`
  position: fixed;
  top: 48px;
  right: 12px;
  bottom: 12px;
  width: min(460px, 92vw);
  background: var(--bg-secondary, #1e1e2e);
  border: 1px solid var(--border-color, #333);
  border-radius: 10px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 900;
  overflow-y: auto;
`;

const Head = styled.div`
  display: flex;
  align-items: center;

  h2 {
    margin: 0;
    font-size: 14px;
    flex: 1;
  }
`;

const Button = styled.button`
  font-size: 12px;
  padding: 5px 10px;
  border-radius: 6px;
  border: 1px solid var(--border-color, #333);
  background: transparent;
  color: var(--text-primary, #d4d4d4);
  cursor: pointer;
`;

const Empty = styled.p`
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary, #9a9ab0);
`;

const ReplyRow = styled.div`
  display: flex;
  gap: 8px;

  input {
    flex: 1;
    background: var(--bg-primary, #141420);
    color: var(--text-primary, #d4d4d4);
    border: 1px solid var(--border-color, #333);
    border-radius: 6px;
    padding: 6px 8px;
    font-size: 12px;
  }
`;

export interface AgentManagerPanelProps {
  workspaceReady: boolean;
  onStart: (userRequest: string) => void;
  onCancel: (taskId: string) => void;
  onReply: (taskId: string, body: string) => void;
  onDismissInbox: (id: string) => void;
  onClose: () => void;
}

export const AgentManagerPanel = ({
  workspaceReady,
  onStart,
  onCancel,
  onReply,
  onDismissInbox,
  onClose,
}: AgentManagerPanelProps) => {
  const tasksById = useAgentManagerStore(state => state.tasksById);
  const order = useAgentManagerStore(state => state.order);
  const inbox = useAgentManagerStore(state => state.inbox);
  const selectedTaskId = useAgentManagerStore(state => state.selectedTaskId);
  const selectTask = useAgentManagerStore(state => state.actions.selectTask);
  const [reply, setReply] = useState('');

  const tasks = order
    .map(id => tasksById[id])
    .filter((task): task is BackgroundTask => Boolean(task));
  const selected = selectedTaskId ? tasksById[selectedTaskId] : undefined;
  const canReply = !!selected && (selected.status === 'pending' || selected.status === 'running');

  const sendReply = () => {
    if (selected && reply.trim()) {
      onReply(selected.id, reply);
      setReply('');
    }
  };

  return (
    <Panel data-testid="agent-manager-panel">
      <Head>
        <h2>Agent Manager</h2>
        <Button type="button" onClick={onClose}>
          Close
        </Button>
      </Head>
      <StartAgentRow workspaceReady={workspaceReady} onStart={onStart} />
      <InboxSection entries={inbox} onSelect={selectTask} onDismiss={onDismissInbox} />
      {tasks.length === 0 && <Empty data-testid="agent-empty">No background agents yet.</Empty>}
      {tasks.map(task => (
        <AgentListItem
          key={task.id}
          task={task}
          selected={task.id === selectedTaskId}
          onSelect={selectTask}
          onCancel={onCancel}
        />
      ))}
      {canReply && (
        <ReplyRow>
          <input
            data-testid="agent-reply-input"
            placeholder="Send a message to the selected agent (next step boundary)…"
            value={reply}
            onChange={event => setReply(event.target.value)}
          />
          <Button type="button" data-testid="agent-reply" onClick={sendReply}>
            Send
          </Button>
        </ReplyRow>
      )}
    </Panel>
  );
};
