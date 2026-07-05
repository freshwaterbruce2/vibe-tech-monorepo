/**
 * BrowserPermissionPromptHost — store-driven consent gate for spec 11
 * browser sessions (same host pattern as ArtifactsPanelHost). Renders the
 * blocking permission prompt while a request is pending (spec AC #1: states
 * what the agent intends to do before anything launches) and, once approved,
 * a persistent session chip with a revoke control (spec AC #9/#12).
 * Spec: FEATURE_SPECS/competitive-gaps/11-BROWSER-VERIFICATION.md
 */
import { Globe, ShieldAlert, X } from 'lucide-react';
import { useEffect } from 'react';
import styled from 'styled-components';
import { useServices } from '../../app/contexts';
import { getBrowserSessionService } from '../../services/browser/BrowserSessionService';
import { useBrowserSessionStore } from '../../stores/browserSessionStore';
import { vibeTheme } from '../../styles/theme';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const Dialog = styled.div`
  background: ${vibeTheme.colors.secondary};
  border: 1px solid ${vibeTheme.colors.border};
  border-radius: 8px;
  padding: 20px;
  width: 440px;
  max-width: 90vw;
  color: ${vibeTheme.colors.text};
`;

const Title = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: ${vibeTheme.typography.fontSize.md};
  font-weight: 600;
  margin-bottom: 12px;
`;

const Intent = styled.div`
  font-size: ${vibeTheme.typography.fontSize.sm};
  color: ${vibeTheme.colors.textSecondary};
  background: ${vibeTheme.colors.primary};
  border-radius: 4px;
  padding: 10px;
  margin-bottom: 8px;
  word-break: break-word;
`;

const Scope = styled.div`
  font-size: ${vibeTheme.typography.fontSize.xs};
  color: ${vibeTheme.colors.textSecondary};
  margin-bottom: 16px;
`;

const Buttons = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
`;

const Button = styled.button<{ $primary?: boolean }>`
  padding: 6px 14px;
  border-radius: 4px;
  cursor: pointer;
  font-size: ${vibeTheme.typography.fontSize.sm};
  border: 1px solid ${vibeTheme.colors.border};
  background: ${({ $primary }) => ($primary ? vibeTheme.colors.cyan : 'transparent')};
  color: ${({ $primary }) => ($primary ? '#fff' : vibeTheme.colors.text)};
`;

const SessionChip = styled.div`
  position: fixed;
  bottom: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: ${vibeTheme.colors.secondary};
  border: 1px solid ${vibeTheme.colors.cyan};
  border-radius: 999px;
  padding: 6px 12px;
  font-size: ${vibeTheme.typography.fontSize.xs};
  color: ${vibeTheme.colors.text};
  z-index: 900;
`;

const RevokeButton = styled.button`
  display: flex;
  align-items: center;
  border: none;
  background: transparent;
  color: ${vibeTheme.colors.textSecondary};
  cursor: pointer;
  padding: 2px;
`;

export const BrowserPermissionPromptHost = () => {
  const services = useServices();
  const pending = useBrowserSessionStore(state => state.pendingRequest);
  const session = useBrowserSessionStore(state => state.activeSession);

  useEffect(() => {
    getBrowserSessionService().bindTaskEvents(services.backgroundAgentSystem);
  }, [services.backgroundAgentSystem]);

  if (pending) {
    return (
      <Overlay data-testid="browser-permission-prompt">
        <Dialog role="alertdialog" aria-label="Browser session permission">
          <Title>
            <ShieldAlert size={18} />
            Allow agent browser session?
          </Title>
          <Intent>{pending.intent}</Intent>
          <Scope>
            Task {pending.taskId} wants to drive a controlled browser (navigate, click, type,
            snapshot, read console, screenshot — no arbitrary scripts). Consent covers this task
            only and ends when it finishes or you revoke it.
          </Scope>
          <Buttons>
            <Button
              data-testid="browser-permission-deny"
              onClick={() => getBrowserSessionService().denyPendingRequest()}
            >
              Deny
            </Button>
            <Button
              data-testid="browser-permission-approve"
              $primary
              onClick={() => void getBrowserSessionService().approvePendingRequest()}
            >
              Allow session
            </Button>
          </Buttons>
        </Dialog>
      </Overlay>
    );
  }

  if (session) {
    return (
      <SessionChip data-testid="browser-session-chip">
        <Globe size={14} />
        Browser session active · {session.actionLog.length} action
        {session.actionLog.length === 1 ? '' : 's'}
        <RevokeButton
          data-testid="browser-session-revoke"
          aria-label="Revoke browser session"
          title="Revoke browser session"
          onClick={() => getBrowserSessionService().revokeActiveSession()}
        >
          <X size={14} />
        </RevokeButton>
      </SessionChip>
    );
  }

  return null;
};
