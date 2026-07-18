import type { MutationChangeType } from './MutationService';

export type NativeExpectedMutationState = { kind: 'missing' } | { kind: 'file'; sha256: string };

export type NativeValidatedFileState =
  | { kind: 'missing' }
  | { kind: 'file'; sha256: string; bytes: number }
  | { kind: 'directory' };

export interface NativeWorkspaceMutationRequest {
  proposalId: string;
  proposalHash: string;
  taskId: string;
  stepId: string;
  actionType: string;
  workspaceRoot: string;
  targetPath: string;
  changeType: MutationChangeType;
  expectedState: NativeExpectedMutationState;
  newContent: string | null;
}

export interface NativeWorkspaceMutationResult {
  proposalId: string;
  proposalHash: string;
  taskId: string;
  stepId: string;
  actionType: string;
  changeType: MutationChangeType;
  canonicalWorkspaceRoot: string;
  canonicalTargetPath: string;
  priorState: NativeValidatedFileState;
  resultingState: NativeValidatedFileState;
  bytesWritten: number;
  replacementStrategy: string;
  validated: true;
  appliedAtUnixMs: number;
}

export interface WorkspaceMutationBridge {
  isAvailable(): boolean;
  apply(request: NativeWorkspaceMutationRequest): Promise<NativeWorkspaceMutationResult>;
}

export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export class NativeMutationBridge implements WorkspaceMutationBridge {
  isAvailable(): boolean {
    return isTauriRuntime();
  }

  async apply(request: NativeWorkspaceMutationRequest): Promise<NativeWorkspaceMutationResult> {
    if (!this.isAvailable()) {
      throw new Error('Native workspace mutation requires the installed Tauri application');
    }

    const { invoke } = await import('@tauri-apps/api/core');
    let result: NativeWorkspaceMutationResult;
    try {
      result = await invoke<NativeWorkspaceMutationResult>('apply_workspace_mutation', { request });
    } catch (error) {
      throw new Error(`Native workspace mutation failed: ${formatInvokeError(error)}`);
    }
    assertResultIdentity(request, result);
    return result;
  }
}

function assertResultIdentity(
  request: NativeWorkspaceMutationRequest,
  result: NativeWorkspaceMutationResult
): void {
  if (!result || typeof result !== 'object') {
    throw new Error('Native mutation returned no validation metadata');
  }
  const identityMatches =
    result.proposalId === request.proposalId &&
    result.proposalHash === request.proposalHash &&
    result.taskId === request.taskId &&
    result.stepId === request.stepId &&
    result.actionType === request.actionType &&
    result.changeType === request.changeType;
  if (!identityMatches) {
    throw new Error('Native mutation validation identity did not match the approved proposal');
  }
  if (
    result.validated !== true ||
    !result.canonicalWorkspaceRoot ||
    !result.canonicalTargetPath ||
    !Number.isSafeInteger(result.appliedAtUnixMs)
  ) {
    throw new Error('Native mutation returned incomplete validation metadata');
  }
}

function formatInvokeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
