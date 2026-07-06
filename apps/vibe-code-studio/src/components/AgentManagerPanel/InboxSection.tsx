/**
 * InboxSection — attention items (reply in flight / undelivered / failed)
 * with deep-link selection and dismissal (spec 10 AC #5/#6).
 * Spec: FEATURE_SPECS/competitive-gaps/10-AGENT-MANAGER-PARALLEL.md
 */
import styled from 'styled-components';
import type { InboxEntry, InboxEntryKind } from '../../services/agentManager/inbox';

const Box = styled.div`
  border: 1px solid var(--border-color, #333);
  border-radius: 8px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;

  h3 {
    margin: 0;
    font-size: 12px;
    color: var(--text-secondary, #9a9ab0);
  }
`;

const Entry = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  text-align: left;
  background: transparent;
  border: none;
  color: var(--text-primary, #d4d4d4);
  font-size: 12px;
  cursor: pointer;
  padding: 3px 4px;
  border-radius: 4px;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  span.summary {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const KIND_BADGES: Record<InboxEntryKind, { label: string; color: string }> = {
  queued: { label: 'reply queued', color: '#e5c07b' },
  dropped: { label: 'undelivered', color: '#ff9d5c' },
  failed: { label: 'failed', color: '#ff6b6b' },
};

const Badge = ({ kind }: { kind: InboxEntryKind }) => (
  <span style={{ color: KIND_BADGES[kind].color, fontSize: 11 }}>[{KIND_BADGES[kind].label}]</span>
);

export interface InboxSectionProps {
  entries: InboxEntry[];
  onSelect: (taskId: string) => void;
  onDismiss: (id: string) => void;
}

export const InboxSection = ({ entries, onSelect, onDismiss }: InboxSectionProps) => {
  if (entries.length === 0) {
    return null;
  }
  return (
    <Box data-testid="agent-inbox">
      <h3>Inbox ({entries.length})</h3>
      {entries.map(entry => (
        <Entry
          key={entry.id}
          data-testid={`inbox-${entry.id}`}
          onClick={() => onSelect(entry.taskId)}
        >
          <Badge kind={entry.kind} />
          <span className="summary">{entry.summary}</span>
          <span
            data-testid={`inbox-dismiss-${entry.id}`}
            onClick={event => {
              event.stopPropagation();
              onDismiss(entry.id);
            }}
          >
            ✕
          </span>
        </Entry>
      ))}
    </Box>
  );
};
