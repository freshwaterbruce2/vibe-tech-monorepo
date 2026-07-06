/**
 * AgentManagerPanel component tests — spec 10 Phase 1 UI. RTL over the real
 * agentManagerStore: StartAgentRow gating, InboxSection badges + deep-link
 * select/dismiss, AgentListItem status/meta/cancel variants, and the panel's
 * ordering, reply row, and close affordance.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentListItem } from '../../components/AgentManagerPanel/AgentListItem';
import type { AgentManagerPanelProps } from '../../components/AgentManagerPanel/AgentManagerPanel';
import { AgentManagerPanel } from '../../components/AgentManagerPanel/AgentManagerPanel';
import { InboxSection } from '../../components/AgentManagerPanel/InboxSection';
import { StartAgentRow } from '../../components/AgentManagerPanel/StartAgentRow';
import type { InboxEntry } from '../../services/agentManager/inbox';
import type { BackgroundTask } from '../../services/BackgroundAgentSystem';
import { useAgentManagerStore } from '../../stores/agentManagerStore';

const makeTask = (overrides: Partial<BackgroundTask> = {}): BackgroundTask => ({
  id: 'task-1',
  agentId: 'agent-manager',
  userRequest: 'do work',
  workspaceRoot: 'V:\\ws',
  parameters: {},
  status: 'running',
  ...overrides,
});

const makeEntry = (overrides: Partial<InboxEntry> = {}): InboxEntry => ({
  id: 'msg-1',
  taskId: 'task-1',
  kind: 'queued',
  summary: 'hello agent',
  at: 1_000,
  ...overrides,
});

const button = (testId: string): HTMLButtonElement =>
  screen.getByTestId(testId) as HTMLButtonElement;

const input = (testId: string): HTMLInputElement => screen.getByTestId(testId) as HTMLInputElement;

beforeEach(() => {
  useAgentManagerStore.getState().actions.reset();
});

describe('StartAgentRow', () => {
  it('disables the prompt and Start without a workspace', () => {
    render(<StartAgentRow workspaceReady={false} onStart={vi.fn()} />);
    const prompt = screen.getByTestId('agent-start-input') as HTMLTextAreaElement;
    expect(prompt.disabled).toBe(true);
    expect(prompt.placeholder).toBe('Open a workspace first…');
    expect(button('agent-start').disabled).toBe(true);
  });

  it('keeps Start disabled while the request is blank', () => {
    render(<StartAgentRow workspaceReady onStart={vi.fn()} />);
    expect(button('agent-start').disabled).toBe(true);
    fireEvent.change(screen.getByTestId('agent-start-input'), { target: { value: '   ' } });
    expect(button('agent-start').disabled).toBe(true);
  });

  it('starts with the typed request and clears the input', () => {
    const onStart = vi.fn();
    render(<StartAgentRow workspaceReady onStart={onStart} />);
    fireEvent.change(screen.getByTestId('agent-start-input'), {
      target: { value: 'refactor the parser' },
    });
    expect(button('agent-start').disabled).toBe(false);
    fireEvent.click(button('agent-start'));
    expect(onStart).toHaveBeenCalledWith('refactor the parser');
    expect((screen.getByTestId('agent-start-input') as HTMLTextAreaElement).value).toBe('');
  });
});

describe('InboxSection', () => {
  it('renders nothing when empty', () => {
    const { container } = render(
      <InboxSection entries={[]} onSelect={vi.fn()} onDismiss={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows a count header and a badge per entry kind', () => {
    const entries = [
      makeEntry({ id: 'q', kind: 'queued' }),
      makeEntry({ id: 'd', kind: 'dropped' }),
      makeEntry({ id: 'f', kind: 'failed' }),
    ];
    render(<InboxSection entries={entries} onSelect={vi.fn()} onDismiss={vi.fn()} />);
    expect(screen.getByText('Inbox (3)')).toBeTruthy();
    expect(screen.getByText('[reply queued]')).toBeTruthy();
    expect(screen.getByText('[undelivered]')).toBeTruthy();
    expect(screen.getByText('[failed]')).toBeTruthy();
  });

  it('selects the entry task on click', () => {
    const onSelect = vi.fn();
    render(
      <InboxSection
        entries={[makeEntry({ taskId: 'task-9' })]}
        onSelect={onSelect}
        onDismiss={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTestId('inbox-msg-1'));
    expect(onSelect).toHaveBeenCalledWith('task-9');
  });

  it('dismiss stops propagation and does not select', () => {
    const onSelect = vi.fn();
    const onDismiss = vi.fn();
    render(<InboxSection entries={[makeEntry()]} onSelect={onSelect} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByTestId('inbox-dismiss-msg-1'));
    expect(onDismiss).toHaveBeenCalledWith('msg-1');
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe('AgentListItem', () => {
  const renderItem = (task: BackgroundTask, selected = false) => {
    const onSelect = vi.fn();
    const onCancel = vi.fn();
    render(
      <AgentListItem task={task} selected={selected} onSelect={onSelect} onCancel={onCancel} />
    );
    return { onSelect, onCancel };
  };

  it('shows the status chip text', () => {
    renderItem(makeTask({ status: 'completed', startTime: 1_000, endTime: 4_000 }));
    expect(screen.getByTestId('agent-status').textContent).toBe('completed');
  });

  it('shows "queued" elapsed before the task starts', () => {
    renderItem(makeTask({ status: 'pending' }));
    const meta = screen.getByTestId('agent-item-task-1').textContent;
    expect(meta).toContain('agent-manager · queued');
  });

  it('shows elapsed seconds from start/end times', () => {
    renderItem(makeTask({ status: 'completed', startTime: 1_000, endTime: 4_000 }));
    expect(screen.getByTestId('agent-item-task-1').textContent).toContain('· 3s');
  });

  it('renders step, description and progress meta for a running task', () => {
    renderItem(
      makeTask({
        startTime: Date.now(),
        currentStep: 1,
        totalSteps: 3,
        stepDescription: 'Fixing imports',
        progress: 42,
      })
    );
    const meta = screen.getByTestId('agent-item-task-1').textContent;
    expect(meta).toContain('step 1/3');
    expect(meta).toContain('— Fixing imports');
    expect(meta).toContain('· 42%');
  });

  it('omits step/progress meta when absent or finished', () => {
    renderItem(makeTask({ status: 'completed', startTime: 1_000, endTime: 4_000, progress: 100 }));
    const meta = screen.getByTestId('agent-item-task-1').textContent;
    expect(meta).not.toContain('step ');
    expect(meta).not.toContain('%');
  });

  it('offers Cancel only while pending/running and stops propagation', () => {
    const { onSelect, onCancel } = renderItem(makeTask({ status: 'running' }));
    fireEvent.click(screen.getByTestId('agent-cancel'));
    expect(onCancel).toHaveBeenCalledWith('task-1');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('hides Cancel for finished tasks', () => {
    renderItem(makeTask({ status: 'cancelled' }));
    expect(screen.queryByTestId('agent-cancel')).toBeNull();
  });

  it('selects the task on item click', () => {
    const { onSelect } = renderItem(makeTask({ status: 'pending' }));
    fireEvent.click(screen.getByTestId('agent-item-task-1'));
    expect(onSelect).toHaveBeenCalledWith('task-1');
  });
});

describe('AgentManagerPanel', () => {
  const renderPanel = (overrides: Partial<AgentManagerPanelProps> = {}) => {
    const props: AgentManagerPanelProps = {
      workspaceReady: true,
      onStart: vi.fn(),
      onCancel: vi.fn(),
      onReply: vi.fn(),
      onDismissInbox: vi.fn(),
      onClose: vi.fn(),
      ...overrides,
    };
    render(<AgentManagerPanel {...props} />);
    return props;
  };

  it('renders the empty state without tasks', () => {
    renderPanel();
    expect(screen.getByTestId('agent-empty')).toBeTruthy();
  });

  it('renders tasks in first-seen order, skipping unknown order ids', () => {
    useAgentManagerStore
      .getState()
      .actions.setTasks([
        makeTask({ id: 't1', userRequest: 'first' }),
        makeTask({ id: 't2', userRequest: 'second' }),
      ]);
    useAgentManagerStore.setState(state => ({ order: ['ghost', ...state.order] }));
    renderPanel();
    const items = screen.getAllByTestId(/^agent-item-/);
    expect(items.map(el => el.getAttribute('data-testid'))).toEqual([
      'agent-item-t1',
      'agent-item-t2',
    ]);
    expect(screen.queryByTestId('agent-empty')).toBeNull();
  });

  it('selecting a task via its item writes the store selection', () => {
    useAgentManagerStore.getState().actions.setTasks([makeTask({ id: 't1' })]);
    renderPanel();
    fireEvent.click(screen.getByTestId('agent-item-t1'));
    expect(useAgentManagerStore.getState().selectedTaskId).toBe('t1');
  });

  it('shows the reply row for a selected running task and sends replies', () => {
    useAgentManagerStore.getState().actions.setTasks([makeTask({ id: 't1' })]);
    useAgentManagerStore.getState().actions.selectTask('t1');
    const props = renderPanel();

    fireEvent.change(input('agent-reply-input'), { target: { value: 'use the helper' } });
    fireEvent.click(button('agent-reply'));

    expect(props.onReply).toHaveBeenCalledWith('t1', 'use the helper');
    expect(input('agent-reply-input').value).toBe('');
  });

  it('does not send a blank reply', () => {
    useAgentManagerStore.getState().actions.setTasks([makeTask({ id: 't1', status: 'pending' })]);
    useAgentManagerStore.getState().actions.selectTask('t1');
    const props = renderPanel();
    fireEvent.click(button('agent-reply'));
    expect(props.onReply).not.toHaveBeenCalled();
  });

  it('hides the reply row when the selected task is finished', () => {
    useAgentManagerStore.getState().actions.setTasks([makeTask({ id: 't1', status: 'completed' })]);
    useAgentManagerStore.getState().actions.selectTask('t1');
    renderPanel();
    expect(screen.queryByTestId('agent-reply-input')).toBeNull();
  });

  it('routes inbox select and dismiss through the store and props', () => {
    useAgentManagerStore.getState().actions.setTasks([makeTask({ id: 't1' })]);
    useAgentManagerStore.getState().actions.setInbox([makeEntry({ taskId: 't1' })]);
    const props = renderPanel();

    fireEvent.click(screen.getByTestId('inbox-msg-1'));
    expect(useAgentManagerStore.getState().selectedTaskId).toBe('t1');
    fireEvent.click(screen.getByTestId('inbox-dismiss-msg-1'));
    expect(props.onDismissInbox).toHaveBeenCalledWith('msg-1');
  });

  it('Close invokes onClose', () => {
    const props = renderPanel();
    fireEvent.click(screen.getByText('Close'));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});
