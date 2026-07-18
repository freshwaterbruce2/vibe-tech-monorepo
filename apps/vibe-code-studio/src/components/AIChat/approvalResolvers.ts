import type { AIMessage, ApprovalRequest } from '../../types';

export interface ApprovalResolverIdentity {
  messageId: string;
  taskId: string;
  stepId: string;
  proposalId: string;
}

export type IdentifiedApprovalRequest = ApprovalRequest & { proposalId: string };

export interface ApprovalRenderState {
  messageId: string;
  taskId?: string;
  pendingApproval?: {
    taskId: string;
    stepId: string;
    proposalId?: string;
  };
}

interface ApprovalResolverEntry {
  identity: ApprovalResolverIdentity;
  observedInUi: boolean;
  finish: (approved: boolean, error?: unknown) => void;
}

export const createApprovalResolverKey = (identity: ApprovalResolverIdentity): string =>
  JSON.stringify([identity.messageId, identity.taskId, identity.stepId, identity.proposalId]);

const MUTATION_APPROVAL_ACTIONS = new Set([
  'write_file',
  'edit_file',
  'delete_file',
  'create_directory',
]);

const isMutationApproval = (request: ApprovalRequest): boolean =>
  request.changeType !== undefined ||
  MUTATION_APPROVAL_ACTIONS.has(request.action.type) ||
  (request.action.type === 'generate_code' && typeof request.action.params.filePath === 'string');

export const withApprovalIdentity = (request: ApprovalRequest): IdentifiedApprovalRequest => {
  const proposalId = request.proposalId?.trim();
  const proposalHash = request.proposalHash?.trim();
  if (isMutationApproval(request) && (!proposalId || !proposalHash)) {
    throw new Error(
      'Mutation approval is missing its exact proposal identity. No workspace changes were applied.'
    );
  }

  return {
    ...request,
    proposalId: proposalId ?? `approval_${crypto.randomUUID()}`,
  };
};

export const matchesApproval = (
  message: AIMessage,
  identity: ApprovalResolverIdentity
): boolean => {
  const pending = message.agentTask?.pendingApproval;
  return (
    message.id === identity.messageId &&
    message.agentTask?.task.id === identity.taskId &&
    pending?.taskId === identity.taskId &&
    pending.stepId === identity.stepId &&
    pending.proposalId === identity.proposalId
  );
};

export class ApprovalResolverRegistry {
  private readonly entries = new Map<string, ApprovalResolverEntry>();

  register(identity: ApprovalResolverIdentity, signal?: AbortSignal): Promise<boolean> {
    const key = createApprovalResolverKey(identity);
    this.settleKey(key, false);

    return new Promise<boolean>((resolve, reject) => {
      let settled = false;
      const abort = () => {
        this.settleKey(key, false);
      };
      const finish = (approved: boolean, error?: unknown) => {
        if (settled) return;
        settled = true;
        signal?.removeEventListener('abort', abort);
        if (error !== undefined) {
          reject(error);
          return;
        }
        resolve(approved);
      };

      this.entries.set(key, { identity, observedInUi: false, finish });
      if (signal?.aborted) {
        this.settleKey(key, false);
      } else {
        signal?.addEventListener('abort', abort, { once: true });
      }
    });
  }

  settle(identity: ApprovalResolverIdentity, approved: boolean): boolean {
    return this.settleKey(createApprovalResolverKey(identity), approved);
  }

  reject(identity: ApprovalResolverIdentity, error: unknown): boolean {
    return this.settleKey(createApprovalResolverKey(identity), false, error);
  }

  settleStep(messageId: string, taskId: string, stepId: string): void {
    this.settleMatching(
      entry =>
        entry.identity.messageId === messageId &&
        entry.identity.taskId === taskId &&
        entry.identity.stepId === stepId,
      false
    );
  }

  settleTask(taskId: string): void {
    this.settleMatching(entry => entry.identity.taskId === taskId, false);
  }

  settleMessage(messageId: string): void {
    this.settleMatching(entry => entry.identity.messageId === messageId, false);
  }

  settleAll(): void {
    this.settleMatching(() => true, false);
  }

  reconcile(renderState: readonly ApprovalRenderState[]): void {
    const renderedTaskIds = new Map<string, string>();
    const renderedApprovals = new Set<string>();

    for (const state of renderState) {
      if (state.taskId) renderedTaskIds.set(state.messageId, state.taskId);
      const pending = state.pendingApproval;
      if (!pending?.proposalId) continue;
      renderedApprovals.add(
        createApprovalResolverKey({
          messageId: state.messageId,
          taskId: pending.taskId,
          stepId: pending.stepId,
          proposalId: pending.proposalId,
        })
      );
    }

    for (const [key, entry] of [...this.entries]) {
      if (renderedApprovals.has(key)) {
        entry.observedInUi = true;
        continue;
      }

      const renderedTaskId = renderedTaskIds.get(entry.identity.messageId);
      const taskWasReplaced =
        renderedTaskId !== undefined && renderedTaskId !== entry.identity.taskId;
      if (entry.observedInUi || taskWasReplaced) {
        this.settleKey(key, false);
      }
    }
  }

  private settleMatching(
    predicate: (entry: ApprovalResolverEntry) => boolean,
    approved: boolean
  ): void {
    for (const [key, entry] of [...this.entries]) {
      if (predicate(entry)) this.settleKey(key, approved);
    }
  }

  private settleKey(key: string, approved: boolean, error?: unknown): boolean {
    const entry = this.entries.get(key);
    if (!entry) return false;
    this.entries.delete(key);
    entry.finish(approved, error);
    return true;
  }
}
