/**
 * PlanModeDialogHost — store-gated modal for spec 05 Plan Mode Phase 1.
 * Collects a task description, runs the research+plan pass through the app's
 * real TaskPlanner/FileSystemService, and reports the written plan path.
 * Mounted once in AppLayout (SchedulePanelHost pattern).
 * Spec: FEATURE_SPECS/competitive-gaps/05-PLAN-MODE.md
 */
import { useState } from 'react';
import styled from 'styled-components';
import { useServices } from '../../app/contexts';
import { runPlanMode } from '../../services/ai/planMode/PlanModeRunner';
import { usePlanModeStore } from '../../stores/planModeStore';
import { useEditorStore } from '../../stores/useEditorStore';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const Dialog = styled.div`
  width: min(560px, 92vw);
  background: var(--bg-secondary, #1e1e2e);
  border: 1px solid var(--border-color, #333);
  border-radius: 10px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 15px;
`;

const Prompt = styled.textarea`
  min-height: 110px;
  resize: vertical;
  background: var(--bg-primary, #141420);
  color: var(--text-primary, #d4d4d4);
  border: 1px solid var(--border-color, #333);
  border-radius: 6px;
  padding: 10px;
  font-size: 13px;
`;

const Row = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
`;

const Button = styled.button`
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid var(--border-color, #333);
  background: var(--accent-color, #4f8cff);
  color: white;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }

  &.secondary {
    background: transparent;
    color: var(--text-primary, #d4d4d4);
  }
`;

const Status = styled.p<{ $error?: boolean }>`
  margin: 0;
  font-size: 12px;
  color: ${({ $error }) => ($error ? '#ff6b6b' : 'var(--text-secondary, #9a9ab0)')};
  overflow-wrap: anywhere;
`;

const PHASE_LABELS: Record<string, string> = {
  researching: 'Researching workspace…',
  writing: 'Writing plan file…',
};

export const PlanModeDialogHost = () => {
  const services = useServices();
  const dialogOpen = usePlanModeStore(state => state.dialogOpen);
  const phase = usePlanModeStore(state => state.phase);
  const error = usePlanModeStore(state => state.error);
  const latestPlanPath = usePlanModeStore(state => state.latestPlanPath);
  const storeActions = usePlanModeStore(state => state.actions);
  const workspaceFolder = useEditorStore(state => state.workspaceFolder);
  const [request, setRequest] = useState('');

  if (!dialogOpen) {
    return null;
  }

  const busy = phase === 'researching' || phase === 'writing';

  const createPlan = () => {
    runPlanMode(
      { planner: services.taskPlanner, writer: services.fileSystemService },
      { userRequest: request, workspaceRoot: workspaceFolder ?? '' }
    ).catch(() => {
      // Failure already captured in planModeStore.error.
    });
  };

  return (
    <Overlay data-testid="plan-mode-dialog">
      <Dialog>
        <Title>Plan Mode — research first, then a reviewable plan</Title>
        <Prompt
          data-testid="plan-mode-input"
          placeholder="Describe the task to plan (no files are modified)…"
          value={request}
          onChange={event => setRequest(event.target.value)}
          disabled={busy}
        />
        {busy && <Status>{PHASE_LABELS[phase] ?? 'Working…'}</Status>}
        {phase === 'error' && error && <Status $error>{error}</Status>}
        {phase === 'done' && latestPlanPath && (
          <Status data-testid="plan-mode-done">Plan written: {latestPlanPath}</Status>
        )}
        <Row>
          <Button
            type="button"
            className="secondary"
            onClick={() => storeActions.setDialogOpen(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            data-testid="plan-mode-create"
            onClick={createPlan}
            disabled={busy || !request.trim() || !workspaceFolder}
          >
            {busy ? 'Planning…' : 'Create Plan'}
          </Button>
        </Row>
      </Dialog>
    </Overlay>
  );
};
