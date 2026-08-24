import { describe, expect, it, vi } from 'vitest';

import {
  approveStagedMutation,
  consumeApprovedMutation,
  MutationApplyError,
  MutationService,
  stageMutationProposal,
} from '../../../services/agent-runtime/MutationService';
import type { FileSystemService } from '../../../services/FileSystemService';
import type {
  NativeWorkspaceMutationRequest,
  NativeWorkspaceMutationResult,
  WorkspaceMutationBridge,
} from '../../../services/agent-runtime/NativeMutationBridge';
import type { AgentStep } from '../../../types';

const step = {
  id: 'step-1',
  taskId: 'task-1',
  order: 1,
  title: 'Write',
  description: 'Write file',
  action: { type: 'write_file', params: {} },
  status: 'pending',
  requiresApproval: true,
  retryCount: 0,
  maxRetries: 1,
} as AgentStep;

async function authorize(
  mutations: MutationService,
  proposal: Awaited<ReturnType<MutationService['prepareWrite']>>
) {
  await mutations.bindToStep(proposal, 'task-1', step);
  stageMutationProposal(step, proposal);
  approveStagedMutation(step, proposal.id, proposal.hash);
  return consumeApprovedMutation(step);
}

function makeFileSystem(initial: Record<string, string> = {}) {
  const files = new Map(Object.entries(initial));
  const directories = new Set<string>(['/ws', '/ws/src', 'V:\\ws', 'V:\\ws/src']);
  const service = {
    resolveWorkspacePath: (path: string, root: string) => `${root}/${path}`,
    exists: vi.fn(async (path: string) => files.has(path) || directories.has(path)),
    readFile: vi.fn(async (path: string) => {
      const value = files.get(path);
      if (value === undefined) throw new Error(`missing: ${path}`);
      return value;
    }),
    writeFile: vi.fn(async (path: string, content: string) => {
      files.set(path, content);
    }),
    deleteFile: vi.fn(async (path: string) => {
      files.delete(path);
    }),
    createDirectory: vi.fn(async (path: string) => {
      directories.add(path);
    }),
  } as unknown as FileSystemService;
  return { service, files, directories };
}

async function contentHash(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function nativeResult(
  request: NativeWorkspaceMutationRequest
): Promise<NativeWorkspaceMutationResult> {
  const content = request.newContent ?? '';
  return {
    proposalId: request.proposalId,
    proposalHash: request.proposalHash,
    taskId: request.taskId,
    stepId: request.stepId,
    actionType: request.actionType,
    changeType: request.changeType,
    canonicalWorkspaceRoot: 'V:\\ws',
    canonicalTargetPath: request.targetPath,
    priorState:
      request.expectedState.kind === 'missing'
        ? { kind: 'missing' }
        : { kind: 'file', sha256: request.expectedState.sha256, bytes: 3 },
    resultingState:
      request.changeType === 'delete'
        ? { kind: 'missing' }
        : request.changeType === 'create_directory'
          ? { kind: 'directory' }
          : {
              kind: 'file',
              sha256: await contentHash(content),
              bytes: new TextEncoder().encode(content).byteLength,
            },
    bytesWritten: new TextEncoder().encode(content).byteLength,
    replacementStrategy: 'atomic_create',
    validated: true,
    appliedAtUnixMs: Date.now(),
  };
}

describe('MutationService exact approval boundary', () => {
  it('classifies, diffs, applies, and validates a new file', async () => {
    const { service, files } = makeFileSystem();
    const mutations = new MutationService(service, '/ws');
    const proposal = await mutations.prepareWrite('src/new.ts', 'export const x = 1;');

    expect(proposal).toMatchObject({ changeType: 'create', path: '/ws/src/new.ts' });
    expect(proposal.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(proposal.diff).toContain('--- /dev/null');
    expect(files.has('/ws/src/new.ts')).toBe(false);

    await mutations.apply(await authorize(mutations, proposal));
    expect(files.get('/ws/src/new.ts')).toBe('export const x = 1;');
  });

  it('refuses to apply when the target changed after approval', async () => {
    const { service, files } = makeFileSystem({ '/ws/a.ts': 'old' });
    const mutations = new MutationService(service, '/ws');
    const proposal = await mutations.prepareWrite('a.ts', 'approved');
    files.set('/ws/a.ts', 'changed concurrently');

    await expect(mutations.apply(await authorize(mutations, proposal))).rejects.toThrow(
      /changed after approval/
    );
    expect(files.get('/ws/a.ts')).toBe('changed concurrently');
  });

  it('refuses a tampered proposal hash', async () => {
    const { service, files } = makeFileSystem();
    const mutations = new MutationService(service, '/ws');
    const proposal = await mutations.prepareWrite('a.ts', 'approved');
    await mutations.bindToStep(proposal, 'task-1', step);
    stageMutationProposal(step, proposal);
    approveStagedMutation(step, proposal.id, proposal.hash);
    proposal.newContent = 'tampered';
    await expect(mutations.apply(consumeApprovedMutation(step))).rejects.toThrow(/hash mismatch/);
    expect(files.has('/ws/a.ts')).toBe(false);
  });

  it('binds the displayed diff and proposal identity into the approval hash', async () => {
    const { service, files } = makeFileSystem();
    const mutations = new MutationService(service, '/ws');
    const proposal = await mutations.prepareWrite('a.ts', 'approved');
    await mutations.bindToStep(proposal, 'task-1', step);
    stageMutationProposal(step, proposal);
    approveStagedMutation(step, proposal.id, proposal.hash);
    proposal.diff = '--- forged\n+++ forged';

    await expect(mutations.apply(consumeApprovedMutation(step))).rejects.toThrow(/hash mismatch/);
    expect(files.has('/ws/a.ts')).toBe(false);
  });

  it('cannot apply a prepared proposal without approval or replay it after use', async () => {
    const { service } = makeFileSystem();
    const mutations = new MutationService(service, '/ws');
    const proposal = await mutations.prepareWrite('a.ts', 'approved');
    await mutations.bindToStep(proposal, 'task-1', step);
    await expect(mutations.apply(proposal)).rejects.toThrow(/authorization/);

    const approved = await authorize(mutations, proposal);
    await mutations.apply(approved);
    await expect(mutations.apply(approved)).rejects.toThrow(/authorization/);
  });

  it('rejects guessed edits whose expected content is absent', async () => {
    const { service } = makeFileSystem({ '/ws/a.ts': 'actual' });
    const mutations = new MutationService(service, '/ws');
    await expect(mutations.prepareEdit('a.ts', 'guessed', 'replacement')).rejects.toThrow(
      /not found/
    );
  });

  it('uses one native CAS invocation in Tauri and never performs a direct plugin-FS write', async () => {
    const { service } = makeFileSystem();
    const apply = vi.fn(nativeResult);
    const bridge: WorkspaceMutationBridge = { isAvailable: () => true, apply };
    const mutations = new MutationService(service, 'V:\\ws', bridge);
    const proposal = await mutations.prepareWrite('src/new.ts', 'approved');
    vi.mocked(service.exists).mockClear();
    vi.mocked(service.readFile).mockClear();
    vi.mocked(service.writeFile).mockClear();

    const result = await mutations.apply(await authorize(mutations, proposal));

    expect(apply).toHaveBeenCalledOnce();
    expect(apply).toHaveBeenCalledWith(
      expect.objectContaining({
        proposalId: proposal.id,
        proposalHash: proposal.hash,
        workspaceRoot: 'V:\\ws',
        targetPath: 'V:\\ws/src/new.ts',
        changeType: 'create',
        expectedState: { kind: 'missing' },
        newContent: 'approved',
      })
    );
    expect(service.exists).not.toHaveBeenCalled();
    expect(service.readFile).not.toHaveBeenCalled();
    expect(service.writeFile).not.toHaveBeenCalled();
    expect(result.validated).toBe(true);
  });

  it('fails closed when native metadata identity does not match the approved proposal', async () => {
    const { service } = makeFileSystem();
    const bridge: WorkspaceMutationBridge = {
      isAvailable: () => true,
      apply: async request => ({ ...(await nativeResult(request)), proposalHash: '0'.repeat(64) }),
    };
    const mutations = new MutationService(service, 'V:\\ws', bridge);
    const proposal = await mutations.prepareWrite('src/new.ts', 'approved');

    await expect(mutations.apply(await authorize(mutations, proposal))).rejects.toThrow(
      /identity did not match/
    );
    expect(service.writeFile).not.toHaveBeenCalled();
  });

  it('exposes typed failed-proposal metadata when native CAS rejects the mutation', async () => {
    const { service } = makeFileSystem();
    const bridge: WorkspaceMutationBridge = {
      isAvailable: () => true,
      apply: vi.fn(async () => {
        throw new Error('TARGET_CHANGED: approved prior hash no longer matches');
      }),
    };
    const mutations = new MutationService(service, 'V:\\ws', bridge);
    const proposal = await mutations.prepareWrite('src/new.ts', 'approved');

    let failure: unknown;
    try {
      await mutations.apply(await authorize(mutations, proposal));
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(MutationApplyError);
    expect(failure).toMatchObject({
      proposalId: proposal.id,
      proposalHash: proposal.hash,
      path: proposal.path,
      changeType: 'create',
      validated: false,
      mutation: expect.objectContaining({
        proposalId: proposal.id,
        validated: false,
        error: expect.stringContaining('TARGET_CHANGED'),
      }),
    });
  });
});
