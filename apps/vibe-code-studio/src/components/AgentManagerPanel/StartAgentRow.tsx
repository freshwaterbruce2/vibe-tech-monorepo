/**
 * StartAgentRow — the missing UI submit() entry point (spec 10). Textarea +
 * Start button; disabled without a workspace.
 * Spec: FEATURE_SPECS/competitive-gaps/10-AGENT-MANAGER-PARALLEL.md
 */
import { useState } from 'react';
import styled from 'styled-components';

const Row = styled.div`
  display: flex;
  gap: 8px;
  align-items: flex-start;
`;

const Prompt = styled.textarea`
  flex: 1;
  min-height: 54px;
  resize: vertical;
  background: var(--bg-primary, #141420);
  color: var(--text-primary, #d4d4d4);
  border: 1px solid var(--border-color, #333);
  border-radius: 6px;
  padding: 8px;
  font-size: 12px;
`;

const Button = styled.button`
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid var(--border-color, #333);
  background: var(--accent-color, #4f8cff);
  color: white;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;

export interface StartAgentRowProps {
  workspaceReady: boolean;
  onStart: (userRequest: string) => void;
}

export const StartAgentRow = ({ workspaceReady, onStart }: StartAgentRowProps) => {
  const [request, setRequest] = useState('');

  const start = () => {
    onStart(request);
    setRequest('');
  };

  return (
    <Row>
      <Prompt
        data-testid="agent-start-input"
        placeholder={
          workspaceReady ? 'Describe a task to run in the background…' : 'Open a workspace first…'
        }
        value={request}
        onChange={event => setRequest(event.target.value)}
        disabled={!workspaceReady}
      />
      <Button
        type="button"
        data-testid="agent-start"
        onClick={start}
        disabled={!workspaceReady || !request.trim()}
      >
        Start
      </Button>
    </Row>
  );
};
