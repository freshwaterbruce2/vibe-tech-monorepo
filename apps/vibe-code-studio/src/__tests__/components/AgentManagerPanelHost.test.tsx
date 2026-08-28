/**
 * AgentManagerPanelHost tests — spec 10 Phase 1 host. Mocks useServices (the
 * host reads only backgroundAgentSystem), the integration module, and the
 * presentational panel (captured props) to verify the store-gated mount, the
 * StrictMode-safe subscribe/dispose effect, and action routing including the
 * workspaceFolder ?? '' fallback.
 */
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AgentManagerPanelProps } from '../../components/AgentManagerPanel/AgentManagerPanel';
import { AgentManagerPanelHost } from '../../components/AgentManagerPanel/AgentManagerPanelHost';
import {
  cancelTask,
  dismissInboxEntry,
  initAgentManager,
  replyToTask,
  startAgent,
} from '../../services/agentManager/agentManagerIntegration';
import { useAgentManagerStore } from '../../stores/agentManagerStore';
import { useEditorStore } from '../../stores/useEditorStore';

const { fakeSystem, disposer, captured } = vi.hoisted(() => ({
  fakeSystem: { id: 'fake-background-agent-system' },
  disposer: vi.fn(),
  captured: { props: null as unknown },
}));

vi.mock('../../app/contexts', () => ({
  useServices: () => ({ backgroundAgentSystem: fakeSystem }),
}));

vi.mock('../../services/agentManager/agentManagerIntegration', () => ({
  initAgentManager: vi.fn(() => disposer),
  startAgent: vi.fn(),
  replyToTask: vi.fn(),
  cancelTask: vi.fn(),
  dismissInboxEntry: vi.fn(),
}));

vi.mock('../../components/AgentManagerPanel/AgentManagerPanel', () => ({
  AgentManagerPanel: (props: unknown) => {
    captured.props = props;
    return <div data-testid="panel-stub" />;
  },
}));

const props = (): AgentManagerPanelProps => captured.props as AgentManagerPanelProps;

beforeEach(() => {
  vi.clearAllMocks();
  captured.props = null;
  useAgentManagerStore.getState().actions.reset();
  useAgentManagerStore.getState().actions.setPanelOpen(false);
  useEditorStore.setState({ workspaceFolder: 'V:\\ws' });
});

describe('AgentManagerPanelHost', () => {
  it('subscribes via initAgentManager on mount and disposes on unmount', () => {
    const { unmount } = render(<AgentManagerPanelHost />);
    expect(initAgentManager).toHaveBeenCalledTimes(1);
    expect(initAgentManager).toHaveBeenCalledWith(fakeSystem);
    expect(disposer).not.toHaveBeenCalled();
    unmount();
    expect(disposer).toHaveBeenCalledTimes(1);
  });

  it('renders nothing while the panel is closed (subscription still active)', () => {
    render(<AgentManagerPanelHost />);
    expect(screen.queryByTestId('panel-stub')).toBeNull();
    expect(initAgentManager).toHaveBeenCalledWith(fakeSystem);
  });

  it('routes panel actions to the integration with the open workspace', () => {
    useAgentManagerStore.getState().actions.setPanelOpen(true);
    render(<AgentManagerPanelHost />);
    expect(screen.getByTestId('panel-stub')).toBeTruthy();
    expect(props().workspaceReady).toBe(true);

    props().onStart('do x');
    expect(startAgent).toHaveBeenCalledWith(fakeSystem, 'do x', 'V:\\ws');
    props().onCancel('t1');
    expect(cancelTask).toHaveBeenCalledWith(fakeSystem, 't1');
    props().onReply('t1', 'use the helper');
    expect(replyToTask).toHaveBeenCalledWith(fakeSystem, 't1', 'use the helper');
    expect(props().onDismissInbox).toBe(dismissInboxEntry);

    props().onClose();
    expect(useAgentManagerStore.getState().panelOpen).toBe(false);
  });

  it('falls back to an empty workspace root when no folder is open', () => {
    useEditorStore.setState({ workspaceFolder: null });
    useAgentManagerStore.getState().actions.setPanelOpen(true);
    render(<AgentManagerPanelHost />);

    expect(props().workspaceReady).toBe(false);
    props().onStart('do x');
    expect(startAgent).toHaveBeenCalledWith(fakeSystem, 'do x', '');
  });
});
