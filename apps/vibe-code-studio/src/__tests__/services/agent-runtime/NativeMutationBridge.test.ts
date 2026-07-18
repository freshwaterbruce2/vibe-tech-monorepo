import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  NativeMutationBridge,
  type NativeWorkspaceMutationRequest,
  type NativeWorkspaceMutationResult,
} from '../../../services/agent-runtime/NativeMutationBridge';

const invoke = vi.hoisted(() => vi.fn());

vi.mock('@tauri-apps/api/core', () => ({ invoke }));

const request: NativeWorkspaceMutationRequest = {
  proposalId: 'proposal-1',
  proposalHash: 'a'.repeat(64),
  taskId: 'task-1',
  stepId: 'step-1',
  actionType: 'write_file',
  workspaceRoot: 'V:\\monorepo',
  targetPath: 'V:\\monorepo\\src\\index.ts',
  changeType: 'create',
  expectedState: { kind: 'missing' },
  newContent: 'approved',
};

function result(overrides: Partial<NativeWorkspaceMutationResult> = {}) {
  return {
    proposalId: request.proposalId,
    proposalHash: request.proposalHash,
    taskId: request.taskId,
    stepId: request.stepId,
    actionType: request.actionType,
    changeType: request.changeType,
    canonicalWorkspaceRoot: request.workspaceRoot,
    canonicalTargetPath: request.targetPath,
    priorState: { kind: 'missing' as const },
    resultingState: { kind: 'file' as const, sha256: 'b'.repeat(64), bytes: 8 },
    bytesWritten: 8,
    replacementStrategy: 'atomic_create',
    validated: true as const,
    appliedAtUnixMs: 1_750_000_000_000,
    ...overrides,
  } satisfies NativeWorkspaceMutationResult;
}

describe('NativeMutationBridge', () => {
  beforeEach(() => {
    invoke.mockReset();
    (window as unknown as Record<string, unknown>)['__TAURI_INTERNALS__'] = {};
  });

  it('invokes the native CAS command exactly once with the approved request', async () => {
    invoke.mockResolvedValue(result());

    await expect(new NativeMutationBridge().apply(request)).resolves.toEqual(result());

    expect(invoke).toHaveBeenCalledOnce();
    expect(invoke).toHaveBeenCalledWith('apply_workspace_mutation', { request });
  });

  it('rejects native metadata with a different proposal identity', async () => {
    invoke.mockResolvedValue(result({ proposalId: 'proposal-other' }));

    await expect(new NativeMutationBridge().apply(request)).rejects.toThrow(
      /identity did not match/
    );
    expect(invoke).toHaveBeenCalledOnce();
  });

  it('surfaces actionable native rejection details', async () => {
    invoke.mockRejectedValue('TARGET_CHANGED: expected approved prior hash');

    await expect(new NativeMutationBridge().apply(request)).rejects.toThrow(
      /TARGET_CHANGED: expected approved prior hash/
    );
  });
});
