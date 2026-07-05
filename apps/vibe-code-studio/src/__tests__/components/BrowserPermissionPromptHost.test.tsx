/**
 * BrowserPermissionPromptHost tests — the spec-11 consent surface: pending
 * request renders a blocking prompt whose Approve/Deny route to the service
 * (AC #1), the active-session chip exposes a working revoke (AC #9), task
 * lifecycle binding happens against the real backgroundAgentSystem, and
 * nothing renders when there is neither a request nor a session.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ServicesContext } from '../../app/contexts';
import type { ServicesContextValue } from '../../app/contexts';
import { BrowserPermissionPromptHost } from '../../components/BrowserVerification/BrowserPermissionPromptHost';
import type { BrowserSessionService } from '../../services/browser/BrowserSessionService';
import { setBrowserSessionServiceForTests } from '../../services/browser/BrowserSessionService';
import type { BrowserPermissionRequest, BrowserSession } from '../../services/browser/types';
import { initBrowserVerificationLoop } from '../../services/browser/verificationLoop';
import { useBrowserSessionStore } from '../../stores/browserSessionStore';

vi.mock('../../services/browser/verificationLoop', () => ({
  initBrowserVerificationLoop: vi.fn(),
}));

const backgroundAgentSystem = { on: vi.fn(), off: vi.fn() };
const fileSystemService = { readFile: vi.fn().mockResolvedValue('{}') };
const services = { backgroundAgentSystem, fileSystemService } as unknown as ServicesContextValue;

const wrapper = ({ children }: { children: ReactNode }) => (
  <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>
);

const serviceStub = {
  bindTaskEvents: vi.fn(),
  approvePendingRequest: vi.fn().mockResolvedValue(undefined),
  denyPendingRequest: vi.fn(),
  revokeActiveSession: vi.fn(),
};

const request: BrowserPermissionRequest = {
  id: 'perm-1',
  taskId: 'task-1',
  intent: 'Open http://localhost:5173/ and verify the dashboard renders',
  requestedAt: new Date(1000).toISOString(),
};

const session: BrowserSession = {
  id: 'session-1',
  taskId: 'task-1',
  intent: 'verify',
  approvedAt: new Date(2000).toISOString(),
  status: 'active',
  actionLog: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  setBrowserSessionServiceForTests(serviceStub as unknown as BrowserSessionService);
  useBrowserSessionStore.setState({ pendingRequest: null, activeSession: null });
});

afterEach(() => {
  setBrowserSessionServiceForTests(null);
});

describe('BrowserPermissionPromptHost', () => {
  it('binds task lifecycle events to the real backgroundAgentSystem', () => {
    render(<BrowserPermissionPromptHost />, { wrapper });
    expect(serviceStub.bindTaskEvents).toHaveBeenCalledWith(backgroundAgentSystem);
  });

  it('wires the spec-11 verification loop with a workspace file reader', async () => {
    render(<BrowserPermissionPromptHost />, { wrapper });
    expect(initBrowserVerificationLoop).toHaveBeenCalledTimes(1);
    const readFile = vi.mocked(initBrowserVerificationLoop).mock.calls[0]![0];
    await readFile('V:\\ws\\package.json');
    expect(fileSystemService.readFile).toHaveBeenCalledWith('V:\\ws\\package.json');
  });

  it('renders nothing without a request or session', () => {
    const { container } = render(<BrowserPermissionPromptHost />, { wrapper });
    expect(container.firstChild).toBeNull();
  });

  it('shows the intent in the prompt and approves through the service', () => {
    useBrowserSessionStore.setState({ pendingRequest: request });
    render(<BrowserPermissionPromptHost />, { wrapper });

    expect(screen.getByTestId('browser-permission-prompt')).toBeTruthy();
    expect(screen.getByText(request.intent)).toBeTruthy();
    fireEvent.click(screen.getByTestId('browser-permission-approve'));
    expect(serviceStub.approvePendingRequest).toHaveBeenCalledTimes(1);
  });

  it('denies through the service', () => {
    useBrowserSessionStore.setState({ pendingRequest: request });
    render(<BrowserPermissionPromptHost />, { wrapper });
    fireEvent.click(screen.getByTestId('browser-permission-deny'));
    expect(serviceStub.denyPendingRequest).toHaveBeenCalledTimes(1);
  });

  it('shows the active-session chip with the action count and revokes (AC #9)', () => {
    useBrowserSessionStore.setState({
      activeSession: { ...session, actionLog: ['a — ok', 'b — ok'] },
    });
    render(<BrowserPermissionPromptHost />, { wrapper });

    const chip = screen.getByTestId('browser-session-chip');
    expect(chip.textContent).toContain('2 actions');
    fireEvent.click(screen.getByTestId('browser-session-revoke'));
    expect(serviceStub.revokeActiveSession).toHaveBeenCalledTimes(1);
  });

  it('pluralizes a single logged action correctly', () => {
    useBrowserSessionStore.setState({ activeSession: { ...session, actionLog: ['a — ok'] } });
    render(<BrowserPermissionPromptHost />, { wrapper });
    expect(screen.getByTestId('browser-session-chip').textContent).toContain('1 action');
    expect(screen.getByTestId('browser-session-chip').textContent).not.toContain('1 actions');
  });

  it('prefers the prompt over the chip when both exist', () => {
    useBrowserSessionStore.setState({ pendingRequest: request, activeSession: session });
    render(<BrowserPermissionPromptHost />, { wrapper });
    expect(screen.getByTestId('browser-permission-prompt')).toBeTruthy();
    expect(screen.queryByTestId('browser-session-chip')).toBeNull();
  });
});
