import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentService } from '../AgentService';
import type { ResumeCandidate } from '../AgentService';

// Mock Tauri invoke
const mockInvoke = vi.fn();
const mockListen = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: any[]) => mockInvoke(...args),
}));

vi.mock('@tauri-apps/api/event', () => ({
  listen: (...args: any[]) => mockListen(...args),
}));

describe('AgentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should chat with agent successfully', async () => {
    mockInvoke.mockResolvedValue('Hello user');
    const response = await AgentService.chat('Hello');
    expect(mockInvoke).toHaveBeenCalledWith('chat_with_agent', {
      message: 'Hello',
      projectId: undefined,
    });
    expect(response).toBe('Hello user');
  });

  it('should get status successfully', async () => {
    const mockStatus = {
      memory_count: 5,
      capabilities: [],
      active_conversations: [],
    };
    mockInvoke.mockResolvedValue(mockStatus);
    const status = await AgentService.getStatus();
    expect(mockInvoke).toHaveBeenCalledWith('get_agent_status');
    expect(status).toEqual(mockStatus);
  });

  it('should send IPC message', async () => {
    mockInvoke.mockResolvedValue(undefined);
    const msg = { type: 'test' };
    await AgentService.sendIpcMessage(msg);
    expect(mockInvoke).toHaveBeenCalledWith('send_ipc_message', {
      message: msg,
    });
  });

  it('should listen to IPC messages', async () => {
    const mockUnlisten = vi.fn();
    mockListen.mockResolvedValue(mockUnlisten);
    const callback = vi.fn();

    const unlisten = await AgentService.onIpcMessage(callback);

    expect(mockListen).toHaveBeenCalledWith('ipc-message', expect.any(Function));
    expect(unlisten).toBe(mockUnlisten);
  });

  it('should search web', async () => {
    const mockResults = [{ title: 'Test', link: 'https://test.com', snippet: 'Test snippet' }];
    mockInvoke.mockResolvedValue(mockResults);
    const results = await AgentService.searchWeb('test query');
    expect(mockInvoke).toHaveBeenCalledWith('web_search', {
      query: 'test query',
    });
    expect(results).toEqual(mockResults);
  });

  it('resumes using only checkpoint identity while Rust computes current evidence', async () => {
    const candidate: ResumeCandidate = {
      classification: 'resumable',
      reason: null,
      task_id: 'task-1',
      revision: 4,
      pending_approval: null,
      uncertain_action_ids: [],
    };
    mockInvoke.mockResolvedValue(undefined);

    await AgentService.resumeTask(candidate);

    expect(mockInvoke).toHaveBeenCalledWith('resume_task', {
      taskId: 'task-1',
      revision: 4,
    });
  });

  it('binds approval to the persisted revision and action fingerprint', async () => {
    mockInvoke
      .mockResolvedValueOnce([
        {
          classification: 'awaiting_approval',
          reason: 'approval is still pending',
          task_id: 'task-2',
          revision: 2,
          pending_approval: { action_fingerprint: 'fingerprint-2', approval_digest: 'digest-2' },
          uncertain_action_ids: [],
        },
      ])
      .mockResolvedValueOnce(undefined);

    await AgentService.approveTask('task-2');

    expect(mockInvoke).toHaveBeenLastCalledWith('decide_task_approval', {
      taskId: 'task-2',
      revision: 2,
      actionFingerprint: 'fingerprint-2',
      approved: true,
    });
  });

  it('serializes duplicate resume requests for one task', async () => {
    const candidate = {
      classification: 'resumable',
      reason: null,
      task_id: 'task-race',
      revision: 1,
      pending_approval: null,
      uncertain_action_ids: [],
    } satisfies ResumeCandidate;
    let releaseFirst: (() => void) | undefined;
    mockInvoke
      .mockImplementationOnce(
        async () =>
          await new Promise<void>((resolve) => {
            releaseFirst = resolve;
          }),
      )
      .mockResolvedValueOnce(undefined);

    const first = AgentService.resumeTask(candidate);
    const second = AgentService.resumeTask(candidate);
    await Promise.resolve();
    expect(mockInvoke).toHaveBeenCalledTimes(1);
    releaseFirst?.();
    await Promise.all([first, second]);
    expect(mockInvoke).toHaveBeenCalledTimes(2);
  });
});
