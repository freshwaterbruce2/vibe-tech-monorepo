import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useState, type ComponentProps } from 'react';

import { AIChat } from '../../components/AIChat/index';
import { MemoizedStepCard } from '../../components/AIChat/StepCard';
import {
  ApprovalResolverRegistry,
  type ApprovalResolverIdentity,
} from '../../components/AIChat/approvalResolvers';
import { recordMessageFeedback } from '../../services/ai/completionTracker';
import { useAIStore } from '../../stores/useAIStore';
import { useSchedulesStore } from '../../stores/schedulesStore';
import type { AIMessage, AgentStep, AgentTask, ApprovalRequest } from '../../types';
import type { TaskPlanner } from '../../services/ai/TaskPlanner';
import type { ExecutionCallbacks, ExecutionEngine } from '../../services/ai/ExecutionEngine';

vi.mock('../../components/SecureMessageContent', () => ({
  default: ({ content }: { content: string }) => <div>{content}</div>,
}));

vi.mock('../../services/Logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../services/ai/completionTracker', () => ({
  recordMessageFeedback: vi.fn(),
}));

type AIChatProps = ComponentProps<typeof AIChat>;

function createTask(overrides?: Partial<AgentTask>): AgentTask {
  const step: AgentStep = {
    id: 'step-1',
    taskId: 'task-1',
    order: 0,
    title: 'Edit file',
    description: 'Apply the requested update',
    action: { type: 'edit_file', params: { filePath: '/workspace/src/app.ts' } },
    status: 'pending',
    requiresApproval: false,
    retryCount: 0,
    maxRetries: 1,
  };

  return {
    id: 'task-1',
    title: 'Update app file',
    description: 'Make the requested changes in the workspace',
    userRequest: 'Update the app file',
    steps: [step],
    status: 'planning',
    createdAt: new Date(),
    ...overrides,
  };
}

function createApprovalRequest(overrides?: Partial<ApprovalRequest>): ApprovalRequest {
  return {
    taskId: 'task-1',
    stepId: 'step-1',
    action: { type: 'edit_file', params: { filePath: '/workspace/src/app.ts' } },
    reasoning: 'This step edits an existing file',
    impact: {
      filesAffected: ['/workspace/src/app.ts'],
      reversible: true,
      riskLevel: 'medium',
    },
    diff: '--- a/src/app.ts\n+++ b/src/app.ts\n@@ -1 +1 @@\n-old\n+new',
    proposalId: 'proposal-test-1',
    proposalHash: 'hash-test-1',
    changeType: 'modify',
    ...overrides,
  };
}

function createApprovalServices(request = createApprovalRequest(), signal?: AbortSignal) {
  const task = createTask({
    status: 'awaiting_approval',
    steps: [
      {
        ...createTask().steps[0]!,
        status: 'awaiting_approval',
        requiresApproval: true,
      },
    ],
  });
  const decisions: boolean[] = [];
  const taskPlanner = {
    planTask: vi.fn().mockResolvedValue({ task, reasoning: 'Plan generated' }),
  } as unknown as TaskPlanner;
  const executionEngine = {
    setTaskContext: vi.fn(),
    executeTask: vi.fn(async (_task: AgentTask, callbacks: ExecutionCallbacks) => {
      const approved = await callbacks.onStepApprovalRequired?.(task.steps[0], request, signal);
      decisions.push(Boolean(approved));
      if (approved) {
        task.steps[0]!.status = 'completed';
        task.status = 'completed';
        callbacks.onTaskComplete?.(task);
      } else {
        task.status = 'cancelled';
        callbacks.onTaskCancelled?.(task, 'Approval was rejected or cancelled.');
      }
    }),
  } as unknown as ExecutionEngine;
  return { decisions, executionEngine, task, taskPlanner };
}

function AIChatHarness(props: Partial<AIChatProps>) {
  const {
    messages: initialMessages,
    onAddMessage,
    onClearMessages,
    onUpdateMessage,
    ...rest
  } = props;
  const [messages, setMessages] = useState<AIMessage[]>(initialMessages ?? []);
  const onSendMessage = props.onSendMessage ?? vi.fn();

  return (
    <AIChat
      {...rest}
      messages={messages}
      onSendMessage={onSendMessage}
      onClose={vi.fn()}
      onAddMessage={message => {
        setMessages(prev => [...prev, message]);
        onAddMessage?.(message);
      }}
      onUpdateMessage={(messageId, updater) => {
        setMessages(prev =>
          prev.map(message => (message.id === messageId ? updater(message) : message))
        );
        onUpdateMessage?.(messageId, updater);
      }}
      onClearMessages={
        onClearMessages
          ? () => {
              setMessages([]);
              onClearMessages();
            }
          : undefined
      }
    />
  );
}

function renderApprovalTask(
  services: ReturnType<typeof createApprovalServices>,
  props: Partial<AIChatProps> = {}
) {
  return render(
    <AIChatHarness
      mode="agent"
      taskPlanner={services.taskPlanner}
      executionEngine={services.executionEngine}
      workspaceContext={{ workspaceRoot: '/workspace', openFiles: [], recentFiles: [] }}
      {...props}
    />
  );
}

async function submitAgentRequest(): Promise<void> {
  fireEvent.change(screen.getByTestId('chat-input'), {
    target: { value: 'Apply the proposed edit' },
  });
  fireEvent.click(screen.getByTitle('Send message (Enter)'));
  expect(await screen.findByText('Approval Required')).toBeInTheDocument();
}

function ReplaceableApprovalHarness({
  services,
}: {
  services: ReturnType<typeof createApprovalServices>;
}) {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  return (
    <>
      <button
        type="button"
        data-testid="replace-agent-task"
        onClick={() => {
          setMessages(current =>
            current.map(message =>
              message.agentTask
                ? {
                    ...message,
                    content: 'Replacement task remains active.',
                    agentTask: {
                      ...message.agentTask,
                      task: {
                        ...message.agentTask.task,
                        id: 'replacement-task',
                        status: 'in_progress',
                      },
                      pendingApproval: undefined,
                      phase: 'executing',
                      statusMessage: 'Replacement task is active.',
                    },
                  }
                : message
            )
          );
        }}
      >
        Replace task
      </button>
      <AIChat
        messages={messages}
        onSendMessage={vi.fn()}
        onClose={vi.fn()}
        mode="agent"
        taskPlanner={services.taskPlanner}
        executionEngine={services.executionEngine}
        workspaceContext={{ workspaceRoot: '/workspace', openFiles: [], recentFiles: [] }}
        onAddMessage={message => setMessages(current => [...current, message])}
        onUpdateMessage={(messageId, updater) => {
          setMessages(current =>
            current.map(message => (message.id === messageId ? updater(message) : message))
          );
        }}
      />
    </>
  );
}

describe('AIChat', () => {
  it('shows the agent empty state when switching into agent mode', async () => {
    render(<AIChatHarness />);

    fireEvent.click(screen.getByTestId('mode-agent'));

    expect(await screen.findByTestId('agent-empty-state')).toHaveTextContent('Agent mode is ready');
    expect(
      screen.getByPlaceholderText('Open a folder to use agent mode effectively...')
    ).toBeInTheDocument();
  });

  it('intercepts /schedule and opens the schedule flow instead of sending', async () => {
    useSchedulesStore.setState({ schedules: [], panelOpen: false, createPrefill: null });
    const onSendMessage = vi.fn();
    render(<AIChatHarness onSendMessage={onSendMessage} />);

    const input = screen.getByTestId('chat-input');
    fireEvent.change(input, { target: { value: '/schedule run the nightly audit' } });
    fireEvent.keyPress(input, { key: 'Enter', charCode: 13 });

    expect(onSendMessage).not.toHaveBeenCalled();
    expect(useSchedulesStore.getState().panelOpen).toBe(true);
    expect(useSchedulesStore.getState().createPrefill).toBe('run the nightly audit');
    expect((input as HTMLTextAreaElement).value).toBe('');
  });

  it('sends non-command messages through to the AI as before', async () => {
    useSchedulesStore.setState({ schedules: [], panelOpen: false, createPrefill: null });
    const onSendMessage = vi.fn().mockResolvedValue(undefined);
    render(<AIChatHarness onSendMessage={onSendMessage} />);

    const input = screen.getByTestId('chat-input');
    fireEvent.change(input, { target: { value: 'explain this code' } });
    fireEvent.keyPress(input, { key: 'Enter', charCode: 13 });

    await waitFor(() => expect(onSendMessage).toHaveBeenCalledWith('explain this code'));
    expect(useSchedulesStore.getState().panelOpen).toBe(false);
  });

  it('surfaces a user-facing preflight error when agent prerequisites are missing', async () => {
    render(<AIChatHarness mode="agent" />);

    fireEvent.change(screen.getByTestId('chat-input'), { target: { value: 'Create a feature' } });
    fireEvent.click(screen.getByTitle('Send message (Enter)'));

    expect(await screen.findByText(/Agent Mode Needs Attention/)).toBeInTheDocument();
    expect(
      screen.getAllByText(/Open a workspace folder before starting agent mode/i).length
    ).toBeGreaterThan(0);
  });

  it('updates the task card through planning, execution, and completion', async () => {
    const task = createTask();
    const taskPlanner = {
      planTask: vi.fn().mockResolvedValue({
        task,
        reasoning: 'Plan generated',
        warnings: ['Review generated changes before committing.'],
      }),
    } as unknown as TaskPlanner;
    const onFileChanged = vi.fn();
    const executionEngine = {
      setTaskContext: vi.fn(),
      executeTask: vi.fn(async (_task: AgentTask, callbacks: ExecutionCallbacks) => {
        task.steps[0]!.status = 'in_progress';
        callbacks.onStepStart?.(task.steps[0]);
        callbacks.onFileChanged?.('/workspace/src/new.ts', 'created');
        task.steps[0]!.status = 'completed';
        callbacks.onStepComplete?.(task.steps[0], { success: true });
        task.status = 'completed';
        callbacks.onTaskComplete?.(task);
      }),
    } as unknown as ExecutionEngine;

    render(
      <AIChatHarness
        mode="agent"
        taskPlanner={taskPlanner}
        executionEngine={executionEngine}
        workspaceContext={{ workspaceRoot: '/workspace', openFiles: [], recentFiles: [] }}
        onFileChanged={onFileChanged}
      />
    );

    fireEvent.change(screen.getByTestId('chat-input'), {
      target: { value: 'Update the app file' },
    });
    fireEvent.click(screen.getByTitle('Send message (Enter)'));

    expect(await screen.findByText(/Task completed successfully\./)).toBeInTheDocument();
    expect(screen.getByText('Review generated changes before committing.')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('step-card')).toHaveAttribute('data-status', 'completed');
    });
    expect(onFileChanged).toHaveBeenCalledWith('/workspace/src/new.ts', 'created');
  });

  it('shows a completed display synthesis as the user-facing Agent Task report', async () => {
    const report = '## Verified review\n\ndist/index.js is the only compiled artifact.';
    const task = createTask({
      title: 'Read-only artifact review',
      description: 'Inspect known files and synthesize a report.',
      steps: [
        {
          id: 'step-synthesis',
          taskId: 'task-1',
          order: 1,
          title: 'Synthesize review',
          description: 'Report verified findings.',
          action: { type: 'generate_code', params: { displayOnly: true } },
          status: 'completed',
          requiresApproval: false,
          retryCount: 0,
          maxRetries: 1,
          result: {
            success: true,
            data: { generatedCode: report, isSynthesis: true },
          },
        },
      ],
    });
    const taskPlanner = {
      planTask: vi.fn().mockResolvedValue({ task, reasoning: 'Plan generated' }),
    } as unknown as TaskPlanner;
    const executionEngine = {
      setTaskContext: vi.fn(),
      executeTask: vi.fn(async (_task: AgentTask, callbacks: ExecutionCallbacks) => {
        task.status = 'completed';
        callbacks.onTaskComplete?.(task);
      }),
    } as unknown as ExecutionEngine;

    render(
      <AIChatHarness
        mode="agent"
        taskPlanner={taskPlanner}
        executionEngine={executionEngine}
        workspaceContext={{ workspaceRoot: '/workspace', openFiles: [], recentFiles: [] }}
      />
    );

    fireEvent.change(screen.getByTestId('chat-input'), { target: { value: 'Review artifacts' } });
    fireEvent.click(screen.getByTitle('Send message (Enter)'));

    expect(
      await screen.findByText(/dist\/index\.js is the only compiled artifact/i)
    ).toBeInTheDocument();
  });

  it('waits for inline approval and resumes after approval is granted', async () => {
    const approvalRequest = createApprovalRequest();
    const task = createTask({
      status: 'awaiting_approval',
      steps: [
        {
          ...createTask().steps[0]!,
          status: 'awaiting_approval',
          requiresApproval: true,
        },
      ],
    });
    const taskPlanner = {
      planTask: vi.fn().mockResolvedValue({
        task,
        reasoning: 'Plan generated',
      }),
    } as unknown as TaskPlanner;
    const executionEngine = {
      setTaskContext: vi.fn(),
      executeTask: vi.fn(async (_task: AgentTask, callbacks: ExecutionCallbacks) => {
        const approved = await callbacks.onStepApprovalRequired?.(task.steps[0], approvalRequest);
        if (approved) {
          task.steps[0]!.status = 'completed';
          task.status = 'completed';
          callbacks.onTaskComplete?.(task);
        } else {
          task.status = 'failed';
          callbacks.onTaskError?.(task, new Error('Rejected'));
        }
      }),
    } as unknown as ExecutionEngine;

    render(
      <AIChatHarness
        mode="agent"
        taskPlanner={taskPlanner}
        executionEngine={executionEngine}
        workspaceContext={{ workspaceRoot: '/workspace', openFiles: [], recentFiles: [] }}
      />
    );

    fireEvent.change(screen.getByTestId('chat-input'), { target: { value: 'Make a risky edit' } });
    fireEvent.click(screen.getByTitle('Send message (Enter)'));

    expect(await screen.findByText('Approval Required')).toBeInTheDocument();
    expect(screen.getByText(/Review the exact proposal for "Edit file"/)).toBeInTheDocument();
    expect(screen.getByText('/workspace/src/app.ts')).toBeInTheDocument();
    expect(screen.getByLabelText('Proposed changes')).toHaveTextContent('+new');

    fireEvent.click(screen.getByText('Approve'));

    expect(await screen.findByText(/Task completed successfully\./)).toBeInTheDocument();
  });

  it('routes and replaces resolvers only by exact message, task, step, and proposal identity', async () => {
    const registry = new ApprovalResolverRegistry();
    const identity: ApprovalResolverIdentity = {
      messageId: 'message-1',
      taskId: 'task-1',
      stepId: 'step-1',
      proposalId: 'proposal-1',
    };
    const firstDecision = registry.register(identity);

    expect(registry.settle({ ...identity, messageId: 'message-2' }, true)).toBe(false);
    expect(registry.settle({ ...identity, taskId: 'task-2' }, true)).toBe(false);
    expect(registry.settle({ ...identity, stepId: 'step-2' }, true)).toBe(false);
    expect(registry.settle({ ...identity, proposalId: 'proposal-2' }, true)).toBe(false);

    const replacementDecision = registry.register(identity);
    await expect(firstDecision).resolves.toBe(false);
    expect(registry.settle(identity, true)).toBe(true);
    await expect(replacementDecision).resolves.toBe(true);
  });

  it('rejects an exact proposal and renders cancellation instead of failure', async () => {
    const services = createApprovalServices();
    renderApprovalTask(services);
    await submitAgentRequest();

    fireEvent.click(screen.getByText('Reject'));

    await waitFor(() => expect(services.decisions).toEqual([false]));
    expect(await screen.findByText(/Task cancelled:/)).toHaveTextContent(
      'The pending proposal was not applied'
    );
    expect(screen.queryByText('Approval Required')).not.toBeInTheDocument();
    expect(screen.queryByText(/Task failed\./)).not.toBeInTheDocument();
  });

  it('settles and removes approval when the timeout AbortSignal fires', async () => {
    const controller = new AbortController();
    const services = createApprovalServices(createApprovalRequest(), controller.signal);
    renderApprovalTask(services);
    await submitAgentRequest();

    act(() => controller.abort());

    await waitFor(() => expect(services.decisions).toEqual([false]));
    expect(await screen.findByText(/Task cancelled:/)).toBeInTheDocument();
    expect(screen.queryByText('Approval Required')).not.toBeInTheDocument();
  });

  it('ignores a late external approval result after abort', async () => {
    const controller = new AbortController();
    const services = createApprovalServices(createApprovalRequest(), controller.signal);
    let resolveExternalApproval!: (approved: boolean) => void;
    const externalApproval = new Promise<boolean>(resolve => {
      resolveExternalApproval = resolve;
    });
    renderApprovalTask(services, {
      onApprovalRequired: vi.fn().mockReturnValue(externalApproval),
    });
    await submitAgentRequest();

    act(() => controller.abort());
    await waitFor(() => expect(services.decisions).toEqual([false]));
    act(() => resolveExternalApproval(true));

    await waitFor(() => {
      expect(screen.getByText(/Task cancelled:/)).toBeInTheDocument();
      expect(screen.queryByText(/Task completed successfully\./)).not.toBeInTheDocument();
    });
  });

  it('settles approval before clearing away its sole decision surface', async () => {
    const services = createApprovalServices();
    renderApprovalTask(services, { onClearMessages: vi.fn() });
    await submitAgentRequest();

    fireEvent.click(screen.getByTestId('clear-chat'));

    await waitFor(() => expect(services.decisions).toEqual([false]));
    expect(screen.queryByText('Approval Required')).not.toBeInTheDocument();
    expect(screen.getByTestId('agent-empty-state')).toBeInTheDocument();
  });

  it('settles approval when AIChat unmounts', async () => {
    const services = createApprovalServices();
    const view = renderApprovalTask(services);
    await submitAgentRequest();

    view.unmount();

    await waitFor(() => expect(services.decisions).toEqual([false]));
  });

  it('settles an observed approval without republishing over a replacement task', async () => {
    const services = createApprovalServices();
    render(<ReplaceableApprovalHarness services={services} />);
    await submitAgentRequest();

    fireEvent.click(screen.getByTestId('replace-agent-task'));

    await waitFor(() => expect(services.decisions).toEqual([false]));
    expect(screen.getByText('Replacement task is active.')).toBeInTheDocument();
    expect(screen.queryByText('Approval Required')).not.toBeInTheDocument();
    expect(screen.queryByText(/Task cancelled:/)).not.toBeInTheDocument();
  });

  it('terminal failure settles a pending resolver and clears the approval controls', async () => {
    const services = createApprovalServices();
    let failTask!: () => void;
    let decision: boolean | undefined;
    services.executionEngine = {
      setTaskContext: vi.fn(),
      executeTask: vi.fn(async (_task: AgentTask, callbacks: ExecutionCallbacks) => {
        const pendingDecision = callbacks.onStepApprovalRequired?.(
          services.task.steps[0],
          createApprovalRequest()
        );
        await new Promise<void>(resolve => {
          failTask = () => {
            services.task.status = 'failed';
            callbacks.onTaskError?.(services.task, new Error('Target changed before apply.'));
            resolve();
          };
        });
        decision = await pendingDecision;
      }),
    } as unknown as ExecutionEngine;
    renderApprovalTask(services);
    await submitAgentRequest();

    act(() => failTask());

    await waitFor(() => expect(decision).toBe(false));
    expect(await screen.findByText(/Task failed\. Review the error below/)).toBeInTheDocument();
    expect(screen.getByText('Target changed before apply.')).toBeInTheDocument();
    expect(screen.queryByText('Approval Required')).not.toBeInTheDocument();
  });

  it('fails closed when a mutation approval lacks proposal identity', async () => {
    const invalidRequest = createApprovalRequest();
    delete invalidRequest.proposalId;
    delete invalidRequest.proposalHash;
    const services = createApprovalServices(invalidRequest);
    renderApprovalTask(services);

    fireEvent.change(screen.getByTestId('chat-input'), {
      target: { value: 'Apply an unidentified mutation' },
    });
    fireEvent.click(screen.getByTitle('Send message (Enter)'));

    expect(
      (await screen.findAllByText(/Mutation approval is missing its exact proposal identity/))
        .length
    ).toBeGreaterThan(0);
    expect(screen.queryByText('Approval Required')).not.toBeInTheDocument();
    expect(screen.getByTestId('step-card')).toHaveAttribute('data-status', 'failed');
  });

  it('rerenders memoized step text from a new immutable step object', () => {
    const originalStep = createTask().steps[0]!;
    const handleApproval = vi.fn();
    const view = render(
      <MemoizedStepCard
        messageId="message-1"
        step={originalStep}
        pendingApproval={null}
        handleApproval={handleApproval}
      />
    );

    view.rerender(
      <MemoizedStepCard
        messageId="message-1"
        step={{ ...originalStep, title: 'Updated title', description: 'Updated description' }}
        pendingApproval={null}
        handleApproval={handleApproval}
      />
    );

    expect(screen.getByText('Updated title')).toBeInTheDocument();
    expect(screen.getByText('Updated description')).toBeInTheDocument();
    expect(screen.queryByText('Edit file')).not.toBeInTheDocument();

    const updatedStep = {
      ...originalStep,
      title: 'Updated title',
      description: 'Updated description',
    };
    view.rerender(
      <MemoizedStepCard
        messageId="message-1"
        step={updatedStep}
        pendingApproval={createApprovalRequest({ taskId: 'different-task' })}
        handleApproval={handleApproval}
      />
    );
    expect(screen.queryByText('Approval Required')).not.toBeInTheDocument();

    view.rerender(
      <MemoizedStepCard
        messageId="message-1"
        step={{ ...updatedStep }}
        pendingApproval={createApprovalRequest()}
        handleApproval={handleApproval}
      />
    );
    expect(screen.getByText('Approval Required')).toBeInTheDocument();
  });

  it('derives displayed ordinals from plan position instead of model-provided order', async () => {
    const task = createTask({
      steps: [{ ...createTask().steps[0]!, order: 99, status: 'pending' }],
    });
    let finishExecution!: () => void;
    const executionDone = new Promise<void>(resolve => {
      finishExecution = resolve;
    });
    const taskPlanner = {
      planTask: vi.fn().mockResolvedValue({ task, reasoning: 'Plan generated' }),
    } as unknown as TaskPlanner;
    const executionEngine = {
      setTaskContext: vi.fn(),
      executeTask: vi.fn(async (_task: AgentTask, callbacks: ExecutionCallbacks) => {
        callbacks.onStepStart?.({ ...task.steps[0]!, status: 'in_progress' });
        await executionDone;
      }),
    } as unknown as ExecutionEngine;

    render(
      <AIChatHarness
        mode="agent"
        taskPlanner={taskPlanner}
        executionEngine={executionEngine}
        workspaceContext={{ workspaceRoot: '/workspace', openFiles: [], recentFiles: [] }}
      />
    );
    fireEvent.change(screen.getByTestId('chat-input'), { target: { value: 'Run one step' } });
    fireEvent.click(screen.getByTitle('Send message (Enter)'));

    expect(await screen.findByText(/Executing step 1 of 1:/)).toBeInTheDocument();
    expect(screen.getByTestId('step-card')).toHaveAttribute('data-status', 'in_progress');
    finishExecution();
  });

  it('shows cancel controls while a chat response is active', () => {
    const onCancelResponse = vi.fn();

    render(
      <AIChatHarness isAiResponding responseState="streaming" onCancelResponse={onCancelResponse} />
    );

    expect(screen.getByTestId('ai-response-state')).toHaveTextContent('AI is responding...');
    fireEvent.click(screen.getByTestId('cancel-response'));
    expect(onCancelResponse).toHaveBeenCalledTimes(1);
  });

  it('cancels pending agent planning and never starts execution', async () => {
    let planningSignal: AbortSignal | undefined;
    const taskPlanner = {
      planTask: vi.fn(({ signal }: { signal?: AbortSignal }) => {
        planningSignal = signal;
        return new Promise<never>((_, reject) =>
          signal?.addEventListener(
            'abort',
            () => reject(new DOMException('aborted', 'AbortError')),
            { once: true }
          )
        );
      }),
    } as unknown as TaskPlanner;
    const executionEngine = {
      setTaskContext: vi.fn(),
      executeTask: vi.fn(),
    } as unknown as ExecutionEngine;
    render(
      <AIChatHarness
        mode="agent"
        taskPlanner={taskPlanner}
        executionEngine={executionEngine}
        workspaceContext={{ workspaceRoot: '/workspace', openFiles: [], recentFiles: [] }}
      />
    );

    fireEvent.change(screen.getByTestId('chat-input'), { target: { value: 'Plan slowly' } });
    fireEvent.click(screen.getByTitle('Send message (Enter)'));
    await waitFor(() => expect(taskPlanner.planTask).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByTestId('cancel-agent-task'));

    await waitFor(() => expect(planningSignal?.aborted).toBe(true));
    expect(await screen.findByText(/Task cancelled:/)).toHaveTextContent('earlier completed steps');
    expect(executionEngine.executeTask).not.toHaveBeenCalled();
  });

  it('aborts pending planning when AIChat unmounts', async () => {
    let planningSignal: AbortSignal | undefined;
    const taskPlanner = {
      planTask: vi.fn(({ signal }: { signal?: AbortSignal }) => {
        planningSignal = signal;
        return new Promise<never>(() => undefined);
      }),
    } as unknown as TaskPlanner;
    const executionEngine = {
      setTaskContext: vi.fn(),
      executeTask: vi.fn(),
    } as unknown as ExecutionEngine;
    const view = render(
      <AIChatHarness
        mode="agent"
        taskPlanner={taskPlanner}
        executionEngine={executionEngine}
        workspaceContext={{ workspaceRoot: '/workspace', openFiles: [], recentFiles: [] }}
      />
    );

    fireEvent.change(screen.getByTestId('chat-input'), { target: { value: 'Plan slowly' } });
    fireEvent.click(screen.getByTitle('Send message (Enter)'));
    await waitFor(() => expect(planningSignal).toBeDefined());
    view.unmount();

    expect(planningSignal?.aborted).toBe(true);
  });

  it('ignores late execution completion after user cancellation', async () => {
    const task = createTask({ status: 'in_progress' });
    let finishExecution!: () => void;
    const taskPlanner = {
      planTask: vi.fn().mockResolvedValue({ task, reasoning: 'ready' }),
    } as unknown as TaskPlanner;
    const executionEngine = {
      setTaskContext: vi.fn(),
      pause: vi.fn(),
      executeTask: vi.fn(async (_task: AgentTask, callbacks: ExecutionCallbacks) => {
        await new Promise<void>(resolve => {
          finishExecution = resolve;
        });
        task.status = 'completed';
        callbacks.onTaskComplete?.(task);
      }),
    } as unknown as ExecutionEngine;
    render(
      <AIChatHarness
        mode="agent"
        taskPlanner={taskPlanner}
        executionEngine={executionEngine}
        workspaceContext={{ workspaceRoot: '/workspace', openFiles: [], recentFiles: [] }}
      />
    );

    fireEvent.change(screen.getByTestId('chat-input'), { target: { value: 'Execute slowly' } });
    fireEvent.click(screen.getByTitle('Send message (Enter)'));
    await waitFor(() => expect(executionEngine.executeTask).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByTestId('cancel-agent-task'));
    act(() => finishExecution());

    expect(await screen.findByText(/Task cancelled:/)).toBeInTheDocument();
    expect(screen.queryByText(/Task completed successfully/)).not.toBeInTheDocument();
    expect(executionEngine.pause).toHaveBeenCalledOnce();
  });

  describe('clear-chat header button', () => {
    beforeEach(() => {
      useAIStore.setState({ messages: [] });
    });

    it('invokes onClearMessages AND empties the AI store messages on click', () => {
      const { actions } = useAIStore.getState();
      actions.addMessage({ id: 'm1', role: 'user', content: 'hello', timestamp: new Date() });
      actions.addMessage({ id: 'm2', role: 'assistant', content: 'hi!', timestamp: new Date() });
      expect(useAIStore.getState().messages).toHaveLength(2);

      const onClearMessages = vi.fn();
      render(<AIChatHarness onClearMessages={onClearMessages} />);

      const button = screen.getByTestId('clear-chat');
      expect(button).toHaveAttribute('aria-label', 'Clear chat');
      expect(button).not.toBeDisabled();

      fireEvent.click(button);

      // handleClearChat clears BOTH the useAIChat-owned copy (onClearMessages)
      // and the useAIStore copy so no layer keeps stale history.
      expect(onClearMessages).toHaveBeenCalledTimes(1);
      expect(useAIStore.getState().messages).toHaveLength(0);
    });

    it('still clears the store (and does not throw) when onClearMessages is omitted', () => {
      const { actions } = useAIStore.getState();
      actions.addMessage({ id: 'm1', role: 'user', content: 'hello', timestamp: new Date() });
      expect(useAIStore.getState().messages).toHaveLength(1);

      render(<AIChatHarness />);

      expect(() => fireEvent.click(screen.getByTestId('clear-chat'))).not.toThrow();
      expect(useAIStore.getState().messages).toHaveLength(0);
    });

    it('is disabled while the chat is busy responding', () => {
      render(<AIChatHarness isAiResponding responseState="streaming" />);
      expect(screen.getByTestId('clear-chat')).toBeDisabled();
    });

    it('is NOT disabled by a chat response while in agent mode', () => {
      render(<AIChatHarness mode="agent" isAiResponding />);
      expect(screen.getByTestId('clear-chat')).not.toBeDisabled();
    });
  });

  it('persists thumbs-up and thumbs-down feedback for assistant messages', () => {
    vi.mocked(recordMessageFeedback).mockClear();
    const assistantMessage: AIMessage = {
      id: 'assistant-1',
      role: 'assistant',
      content: 'Here is some help',
      timestamp: new Date(),
    };

    render(<AIChatHarness messages={[assistantMessage]} />);

    fireEvent.click(screen.getByTitle('Good response'));
    expect(recordMessageFeedback).toHaveBeenCalledWith('assistant-1', 'positive');

    fireEvent.click(screen.getByTitle('Poor response'));
    expect(recordMessageFeedback).toHaveBeenCalledWith('assistant-1', 'negative');
  });

  it('blocks quick-action sends while cancellation is in progress', () => {
    const onSendMessage = vi.fn();

    render(<AIChatHarness responseState="cancelling" onSendMessage={onSendMessage} />);

    fireEvent.click(screen.getByText('Explain this code'));

    expect(onSendMessage).not.toHaveBeenCalled();
  });
});
