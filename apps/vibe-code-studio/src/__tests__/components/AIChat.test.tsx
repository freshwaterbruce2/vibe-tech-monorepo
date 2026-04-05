import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useState, type ComponentProps } from 'react';

import { AIChat } from '../../components/AIChat';
import type { AIMessage, AgentStep, AgentTask, ApprovalRequest } from '../../types';

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

function AIChatHarness(props: Partial<AIChatProps>) {
  const [messages, setMessages] = useState<AIMessage[]>(props.messages ?? []);

  return (
    <AIChat
      messages={messages}
      onSendMessage={vi.fn()}
      onClose={vi.fn()}
      onAddMessage={(message) => {
        setMessages((prev) => [...prev, message]);
        props.onAddMessage?.(message);
      }}
      onUpdateMessage={(messageId, updater) => {
        setMessages((prev) => prev.map((message) => (
          message.id === messageId ? updater(message) : message
        )));
        props.onUpdateMessage?.(messageId, updater);
      }}
      {...props}
    />
  );
}

describe('AIChat', () => {
  it('shows the agent empty state when switching into agent mode', async () => {
    render(<AIChatHarness />);

    fireEvent.click(screen.getByTestId('mode-agent'));

    expect(await screen.findByTestId('agent-empty-state')).toHaveTextContent('Agent mode is ready');
    expect(screen.getByPlaceholderText('Open a folder to use agent mode effectively...')).toBeInTheDocument();
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
    };
    const onFileChanged = vi.fn();
    const executionEngine = {
      setTaskContext: vi.fn(),
      executeTask: vi.fn(async (_task: AgentTask, callbacks: any) => {
        task.steps[0]!.status = 'in_progress';
        callbacks.onStepStart?.(task.steps[0]);
        callbacks.onFileChanged?.('/workspace/src/new.ts', 'created');
        task.steps[0]!.status = 'completed';
        callbacks.onStepComplete?.(task.steps[0], { success: true });
        task.status = 'completed';
        callbacks.onTaskComplete?.(task);
      }),
    };

    render(
      <AIChatHarness
        mode="agent"
        taskPlanner={taskPlanner}
        executionEngine={executionEngine}
        workspaceContext={{ workspaceRoot: '/workspace', openFiles: [], recentFiles: [] }}
        onFileChanged={onFileChanged}
      />
    );

    fireEvent.change(screen.getByTestId('chat-input'), { target: { value: 'Update the app file' } });
    fireEvent.click(screen.getByTitle('Send message (Enter)'));

    expect(await screen.findByText('Task completed successfully.')).toBeInTheDocument();
    expect(screen.getByText('Review generated changes before committing.')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('step-card')).toHaveAttribute('data-status', 'completed');
    });
    expect(onFileChanged).toHaveBeenCalledWith('/workspace/src/new.ts', 'created');
  });

  it('waits for inline approval and resumes after approval is granted', async () => {
    const approvalRequest: ApprovalRequest = {
      taskId: 'task-1',
      stepId: 'step-1',
      action: { type: 'edit_file', params: { filePath: '/workspace/src/app.ts' } },
      reasoning: 'This step edits an existing file',
      impact: {
        filesAffected: ['/workspace/src/app.ts'],
        reversible: true,
        riskLevel: 'medium',
      },
    };
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
    };
    const executionEngine = {
      setTaskContext: vi.fn(),
      executeTask: vi.fn(async (_task: AgentTask, callbacks: any) => {
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
    };

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
    expect(screen.getByText(/Waiting for approval on "Edit file"\./)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Approve'));

    expect(await screen.findByText('Task completed successfully.')).toBeInTheDocument();
  });
});
