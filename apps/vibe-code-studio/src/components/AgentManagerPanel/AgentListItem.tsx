/**
 * AgentListItem — one background task: live status chip (event-driven),
 * progress/step line, select + cancel affordances (spec 10 AC #2/#3).
 * Spec: FEATURE_SPECS/competitive-gaps/10-AGENT-MANAGER-PARALLEL.md
 */
import styled from 'styled-components';
import type { BackgroundTask } from '../../services/BackgroundAgentSystem';

const Item = styled.div<{ $selected: boolean }>`
  border: 1px solid
    ${({ $selected }) => ($selected ? 'var(--accent-color, #4f8cff)' : 'var(--border-color, #333)')};
  border-radius: 8px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  span.request {
    flex: 1;
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const STATUS_COLORS: Record<BackgroundTask['status'], string> = {
  pending: '#9a9ab0',
  running: '#e5c07b',
  completed: '#7ec699',
  failed: '#ff6b6b',
  cancelled: '#9a9ab0',
};

const Chip = styled.span<{ $status: BackgroundTask['status'] }>`
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 10px;
  border: 1px solid ${({ $status }) => STATUS_COLORS[$status]};
  color: ${({ $status }) => STATUS_COLORS[$status]};
`;

const Meta = styled.span`
  font-size: 11px;
  color: var(--text-secondary, #9a9ab0);
`;

const Small = styled.button`
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid var(--border-color, #333);
  background: transparent;
  color: var(--text-primary, #d4d4d4);
  cursor: pointer;
`;

const elapsed = (task: BackgroundTask): string => {
  if (!task.startTime) {
    return 'queued';
  }
  const end = task.endTime ?? Date.now();
  return `${Math.max(0, Math.round((end - task.startTime) / 1000))}s`;
};

export interface AgentListItemProps {
  task: BackgroundTask;
  selected: boolean;
  onSelect: (taskId: string) => void;
  onCancel: (taskId: string) => void;
}

export const AgentListItem = ({ task, selected, onSelect, onCancel }: AgentListItemProps) => {
  const active = task.status === 'pending' || task.status === 'running';
  return (
    <Item
      $selected={selected}
      data-testid={`agent-item-${task.id}`}
      onClick={() => onSelect(task.id)}
    >
      <Head>
        <Chip $status={task.status} data-testid="agent-status">
          {task.status}
        </Chip>
        <span className="request" title={task.userRequest}>
          {task.userRequest}
        </span>
        {active && (
          <Small
            data-testid="agent-cancel"
            onClick={event => {
              event.stopPropagation();
              onCancel(task.id);
            }}
          >
            Cancel
          </Small>
        )}
      </Head>
      <Meta>
        {task.agentId} · {elapsed(task)}
        {task.totalSteps ? ` · step ${task.currentStep}/${task.totalSteps}` : ''}
        {task.stepDescription ? ` — ${task.stepDescription}` : ''}
        {typeof task.progress === 'number' && task.status === 'running'
          ? ` · ${task.progress}%`
          : ''}
      </Meta>
    </Item>
  );
};
