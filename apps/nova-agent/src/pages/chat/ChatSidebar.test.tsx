import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResumeCandidate } from '@/services/AgentService';
import { ChatSidebar } from './ChatSidebar';

const resumeTask = vi.fn();
const startTaskOver = vi.fn();
const getResumeCandidates = vi.fn();

vi.mock('@/services/AgentService', () => ({
  AgentService: {
    approveTask: vi.fn(),
    rejectTask: vi.fn(),
    resumeTask: (...args: unknown[]) => resumeTask(...args),
    startTaskOver: (...args: unknown[]) => startTaskOver(...args),
    getResumeCandidates: (...args: unknown[]) => getResumeCandidates(...args),
    filterResumeCandidates: (candidates: ResumeCandidate[]) =>
      candidates.filter((item) =>
        ['resumable', 'stale', 'corrupt', 'needs_review'].includes(item.classification),
      ),
  },
}));

const candidate = {
  classification: 'resumable' as const,
  reason: null,
  task_id: 'task-1',
  revision: 3,
  pending_approval: null,
  uncertain_action_ids: [],
};

describe('ChatSidebar task recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resumeTask.mockResolvedValue(undefined);
    startTaskOver.mockResolvedValue(undefined);
    getResumeCandidates.mockResolvedValue([]);
  });

  it('offers explicit resume for a valid checkpoint', async () => {
    const onRecoveryChange = vi.fn();
    render(
      <ChatSidebar
        agentState={null}
        pendingTasks={[]}
        onTasksChange={vi.fn()}
        resumeCandidates={[candidate]}
        onRecoveryChange={onRecoveryChange}
      />,
    );

    expect(screen.getByText('Ready to resume')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
    await waitFor(() => expect(resumeTask).toHaveBeenCalledWith(candidate));
    expect(onRecoveryChange).toHaveBeenCalledWith([]);
  });

  it('shows needs-review state without a resume action', () => {
    render(
      <ChatSidebar
        agentState={null}
        pendingTasks={[]}
        onTasksChange={vi.fn()}
        resumeCandidates={[
          { ...candidate, classification: 'needs_review', reason: 'uncertain action' },
        ]}
        onRecoveryChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/Needs review: uncertain action/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resume' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start over' })).toBeInTheDocument();
  });

  it('applies recovery filtering again after a mutation refresh', async () => {
    getResumeCandidates.mockResolvedValue([
      candidate,
      { ...candidate, task_id: 'done', classification: 'completed' },
      { ...candidate, task_id: 'approval', classification: 'awaiting_approval' },
    ]);
    const onRecoveryChange = vi.fn();
    render(
      <ChatSidebar
        agentState={null}
        pendingTasks={[]}
        onTasksChange={vi.fn()}
        resumeCandidates={[candidate]}
        onRecoveryChange={onRecoveryChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
    await waitFor(() => expect(onRecoveryChange).toHaveBeenCalledWith([candidate]));
  });
});
