import type { FileSystemService } from '../FileSystemService';
import type { AgentStep, ApprovalRequest } from '../../types';
import { resolveFilePath } from '../ai/execution/utils';
import type { ActionContext } from '../ai/execution/types';
import {
  NativeMutationBridge,
  type NativeValidatedFileState,
  type NativeWorkspaceMutationRequest,
  type NativeWorkspaceMutationResult,
  type WorkspaceMutationBridge,
} from './NativeMutationBridge';

export type MutationChangeType = 'create' | 'modify' | 'delete' | 'create_directory';

export interface MutationProposal {
  id: string;
  hash: string;
  path: string;
  changeType: MutationChangeType;
  oldContent: string | null;
  newContent: string | null;
  diff: string;
  taskId?: string;
  stepId?: string;
  actionType?: string;
}

export interface MutationFailureMetadata {
  proposalId: string;
  proposalHash: string;
  path: string;
  changeType: MutationChangeType;
  validated: false;
  error: string;
}

export class MutationApplyError extends Error {
  readonly proposalId: string;
  readonly proposalHash: string;
  readonly path: string;
  readonly changeType: MutationChangeType;
  readonly validated = false as const;
  readonly mutation: MutationFailureMetadata;
  readonly originalError: unknown;

  constructor(proposal: MutationProposal, error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    super(message);
    this.name = 'MutationApplyError';
    this.proposalId = proposal.id;
    this.proposalHash = proposal.hash;
    this.path = proposal.path;
    this.changeType = proposal.changeType;
    this.originalError = error;
    this.mutation = {
      proposalId: proposal.id,
      proposalHash: proposal.hash,
      path: proposal.path,
      changeType: proposal.changeType,
      validated: false,
      error: message,
    };
  }
}

const stagedProposals = new WeakMap<AgentStep, { proposal: MutationProposal; approved: boolean }>();
const applicableProposals = new WeakSet<MutationProposal>();

export class MutationService {
  constructor(
    private readonly fileSystemService: FileSystemService,
    private readonly workspaceRoot: string,
    private readonly nativeBridge: WorkspaceMutationBridge = new NativeMutationBridge()
  ) {}

  async prepareWrite(filePath: string, newContent: string): Promise<MutationProposal> {
    const path = resolveFilePath(filePath, this.workspaceRoot, this.fileSystemService);
    await this.assertParentExists(path);
    const exists = await this.fileSystemService.exists(path);
    const oldContent = exists ? await this.fileSystemService.readFile(path) : null;
    return this.createProposal(path, exists ? 'modify' : 'create', oldContent, newContent);
  }

  async prepareEdit(
    filePath: string,
    expectedContent: string,
    replacement: string
  ): Promise<MutationProposal> {
    const path = resolveFilePath(filePath, this.workspaceRoot, this.fileSystemService);
    const oldContent = await this.fileSystemService.readFile(path);
    if (!expectedContent || !oldContent.includes(expectedContent)) {
      throw new Error(`Edit target was not found in ${path}; refusing a no-op or guessed edit`);
    }
    return this.createProposal(
      path,
      'modify',
      oldContent,
      oldContent.replace(expectedContent, replacement)
    );
  }

  async prepareDelete(filePath: string): Promise<MutationProposal> {
    const path = resolveFilePath(filePath, this.workspaceRoot, this.fileSystemService);
    const oldContent = await this.fileSystemService.readFile(path);
    return this.createProposal(path, 'delete', oldContent, null);
  }

  async prepareDirectory(pathInput: string): Promise<MutationProposal> {
    const path = resolveFilePath(pathInput, this.workspaceRoot, this.fileSystemService);
    await this.assertParentExists(path);
    const exists = await this.fileSystemService.exists(path);
    if (exists) throw new Error(`Directory already exists: ${path}`);
    return this.createProposal(path, 'create_directory', null, null);
  }

  async apply(proposal: MutationProposal): Promise<NativeWorkspaceMutationResult> {
    try {
      if (!applicableProposals.has(proposal)) {
        throw new Error('Mutation proposal has not passed exact approval authorization');
      }
      applicableProposals.delete(proposal);
      await this.assertProposalIntegrity(proposal, false);
      if (this.nativeBridge.isAvailable()) {
        const request = await this.buildNativeRequest(proposal);
        const result = await this.nativeBridge.apply(request);
        await this.validateNativeResult(proposal, result);
        return result;
      }

      await this.assertProposalIntegrity(proposal, true);
      if (proposal.changeType === 'delete') await this.fileSystemService.deleteFile(proposal.path);
      else if (proposal.changeType === 'create_directory') {
        await this.fileSystemService.createDirectory(proposal.path);
      } else await this.fileSystemService.writeFile(proposal.path, proposal.newContent ?? '');
      await this.validateApplied(proposal);
      return await this.buildWebFallbackResult(proposal);
    } catch (error) {
      if (error instanceof MutationApplyError) throw error;
      throw new MutationApplyError(proposal, error);
    }
  }

  async bindToStep(
    proposal: MutationProposal,
    taskId: string,
    step: AgentStep
  ): Promise<MutationProposal> {
    proposal.taskId = taskId;
    proposal.stepId = step.id;
    proposal.actionType = step.action.type;
    proposal.hash = await this.hash(this.hashPayload(proposal));
    return proposal;
  }

  toApprovalRequest(taskId: string, step: AgentStep, proposal: MutationProposal): ApprovalRequest {
    return {
      taskId,
      stepId: step.id,
      action: step.action,
      reasoning: step.description,
      impact: {
        filesAffected: [proposal.path],
        reversible: proposal.changeType !== 'delete',
        riskLevel: proposal.changeType === 'delete' ? 'high' : 'medium',
      },
      diff: proposal.diff,
      proposalId: proposal.id,
      proposalHash: proposal.hash,
      changeType: proposal.changeType,
    };
  }

  private async createProposal(
    path: string,
    changeType: MutationChangeType,
    oldContent: string | null,
    newContent: string | null
  ): Promise<MutationProposal> {
    const proposal: MutationProposal = {
      id: `proposal_${crypto.randomUUID()}`,
      hash: '',
      path,
      changeType,
      oldContent,
      newContent,
      diff: this.buildDiff(path, changeType, oldContent, newContent),
    };
    proposal.hash = await this.hash(this.hashPayload(proposal));
    return proposal;
  }

  private async assertProposalIntegrity(
    proposal: MutationProposal,
    validateTarget: boolean
  ): Promise<void> {
    if (!proposal.taskId || !proposal.stepId || !proposal.actionType) {
      throw new Error('Mutation proposal is not bound to a task step');
    }
    const expectedHash = await this.hash(this.hashPayload(proposal));
    if (expectedHash !== proposal.hash) throw new Error('Mutation proposal hash mismatch');
    if (!validateTarget) return;
    const exists = await this.fileSystemService.exists(proposal.path);
    if (proposal.oldContent === null) {
      if (exists) throw new Error(`Mutation target changed after approval: ${proposal.path}`);
    } else {
      if (
        !exists ||
        (await this.fileSystemService.readFile(proposal.path)) !== proposal.oldContent
      ) {
        throw new Error(`Mutation target changed after approval: ${proposal.path}`);
      }
    }
  }

  private async buildNativeRequest(
    proposal: MutationProposal
  ): Promise<NativeWorkspaceMutationRequest> {
    if (!proposal.taskId || !proposal.stepId || !proposal.actionType) {
      throw new Error('Mutation proposal is not bound to a task step');
    }
    return {
      proposalId: proposal.id,
      proposalHash: proposal.hash,
      taskId: proposal.taskId,
      stepId: proposal.stepId,
      actionType: proposal.actionType,
      workspaceRoot: this.workspaceRoot,
      targetPath: proposal.path,
      changeType: proposal.changeType,
      expectedState:
        proposal.oldContent === null
          ? { kind: 'missing' }
          : { kind: 'file', sha256: await this.hash(proposal.oldContent) },
      newContent: proposal.newContent,
    };
  }

  private async validateNativeResult(
    proposal: MutationProposal,
    result: NativeWorkspaceMutationResult
  ): Promise<void> {
    if (
      result.proposalId !== proposal.id ||
      result.proposalHash !== proposal.hash ||
      result.taskId !== proposal.taskId ||
      result.stepId !== proposal.stepId ||
      result.actionType !== proposal.actionType ||
      result.changeType !== proposal.changeType
    ) {
      throw new Error('Native mutation validation identity did not match the approved proposal');
    }
    const expectedPrior =
      proposal.oldContent === null
        ? { kind: 'missing' as const }
        : {
            kind: 'file' as const,
            sha256: await this.hash(proposal.oldContent),
            bytes: new TextEncoder().encode(proposal.oldContent).byteLength,
          };
    if (!this.statesMatch(result.priorState, expectedPrior)) {
      throw new Error('Native mutation prior-state metadata did not match the approved proposal');
    }

    let expectedResult: NativeValidatedFileState;
    if (proposal.changeType === 'delete') expectedResult = { kind: 'missing' };
    else if (proposal.changeType === 'create_directory') expectedResult = { kind: 'directory' };
    else {
      const content = proposal.newContent ?? '';
      expectedResult = {
        kind: 'file',
        sha256: await this.hash(content),
        bytes: new TextEncoder().encode(content).byteLength,
      };
    }
    if (!this.statesMatch(result.resultingState, expectedResult)) {
      throw new Error('Native mutation readback metadata did not match the approved content');
    }
  }

  private statesMatch(
    actual: NativeValidatedFileState,
    expected: NativeValidatedFileState
  ): boolean {
    if (actual.kind !== expected.kind) return false;
    if (actual.kind !== 'file' || expected.kind !== 'file') return true;
    return actual.sha256 === expected.sha256 && actual.bytes === expected.bytes;
  }

  private async buildWebFallbackResult(
    proposal: MutationProposal
  ): Promise<NativeWorkspaceMutationResult> {
    if (!proposal.taskId || !proposal.stepId || !proposal.actionType) {
      throw new Error('Mutation proposal is not bound to a task step');
    }
    const priorState: NativeValidatedFileState =
      proposal.oldContent === null
        ? { kind: 'missing' }
        : {
            kind: 'file',
            sha256: await this.hash(proposal.oldContent),
            bytes: new TextEncoder().encode(proposal.oldContent).byteLength,
          };
    const resultingState: NativeValidatedFileState =
      proposal.changeType === 'delete'
        ? { kind: 'missing' }
        : proposal.changeType === 'create_directory'
          ? { kind: 'directory' }
          : {
              kind: 'file',
              sha256: await this.hash(proposal.newContent ?? ''),
              bytes: new TextEncoder().encode(proposal.newContent ?? '').byteLength,
            };
    return {
      proposalId: proposal.id,
      proposalHash: proposal.hash,
      taskId: proposal.taskId,
      stepId: proposal.stepId,
      actionType: proposal.actionType,
      changeType: proposal.changeType,
      canonicalWorkspaceRoot: this.workspaceRoot,
      canonicalTargetPath: proposal.path,
      priorState,
      resultingState,
      bytesWritten:
        proposal.newContent === null ? 0 : new TextEncoder().encode(proposal.newContent).byteLength,
      replacementStrategy: 'web_test_fallback',
      validated: true,
      appliedAtUnixMs: Date.now(),
    };
  }

  private async validateApplied(proposal: MutationProposal): Promise<void> {
    const exists = await this.fileSystemService.exists(proposal.path);
    if (proposal.changeType === 'delete') {
      if (exists) throw new Error(`Delete validation failed: ${proposal.path}`);
      return;
    }
    if (!exists) throw new Error(`Mutation validation failed: ${proposal.path}`);
    if (proposal.changeType !== 'create_directory') {
      const actual = await this.fileSystemService.readFile(proposal.path);
      if (actual !== proposal.newContent)
        throw new Error(`Content validation failed: ${proposal.path}`);
    }
  }

  private async assertParentExists(path: string): Promise<void> {
    const parent = path.replace(/[\\/][^\\/]+$/, '');
    if (parent && !(await this.fileSystemService.exists(parent))) {
      throw new Error(
        `Parent directory requires its own approved create_directory step: ${parent}`
      );
    }
  }

  private buildDiff(
    path: string,
    changeType: MutationChangeType,
    oldContent: string | null,
    newContent: string | null
  ): string {
    if (changeType === 'create_directory') return `create directory ${path}`;
    const oldLabel = oldContent === null ? '/dev/null' : `a/${path}`;
    const newLabel = newContent === null ? '/dev/null' : `b/${path}`;
    const oldLines = oldContent?.split('\n') ?? [];
    const newLines = newContent?.split('\n') ?? [];
    return [
      `--- ${oldLabel}`,
      `+++ ${newLabel}`,
      `@@ -1,${oldLines.length} +1,${newLines.length} @@`,
      ...oldLines.map(line => `-${line}`),
      ...newLines.map(line => `+${line}`),
    ].join('\n');
  }

  private async hash(value: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private hashPayload(proposal: MutationProposal): string {
    return JSON.stringify({
      id: proposal.id,
      path: proposal.path,
      changeType: proposal.changeType,
      oldContent: proposal.oldContent,
      newContent: proposal.newContent,
      diff: proposal.diff,
      taskId: proposal.taskId,
      stepId: proposal.stepId,
      actionType: proposal.actionType,
    });
  }
}

export function isMutationStep(step: AgentStep): boolean {
  return ['write_file', 'edit_file', 'delete_file', 'create_directory'].includes(step.action.type);
}

export function usesDeferredMutationApproval(step: AgentStep): boolean {
  return step.action.type === 'generate_code' && typeof step.action.params['filePath'] === 'string';
}

export async function prepareStepMutation(
  step: AgentStep,
  context: ActionContext
): Promise<{ service: MutationService; proposal: MutationProposal }> {
  const service = new MutationService(context.fileSystemService, context.taskState.workspaceRoot);
  const params = step.action.params;
  const requiredString = (name: string, allowEmpty = false): string => {
    const value = params[name];
    if (typeof value !== 'string' || (!allowEmpty && !value.trim())) {
      throw new Error(`${step.action.type} requires a valid ${name}`);
    }
    return value;
  };
  let proposal: MutationProposal;
  switch (step.action.type) {
    case 'write_file':
      proposal = await service.prepareWrite(
        requiredString('filePath'),
        requiredString('content', true)
      );
      break;
    case 'edit_file':
      proposal = await service.prepareEdit(
        requiredString('filePath'),
        requiredString('oldContent'),
        requiredString('newContent', true)
      );
      break;
    case 'delete_file':
      proposal = await service.prepareDelete(requiredString('filePath'));
      break;
    case 'create_directory':
      proposal = await service.prepareDirectory(requiredString('path'));
      break;
    default:
      throw new Error(`Action is not a preparable mutation: ${step.action.type}`);
  }
  const taskId = context.taskState.task?.id;
  if (!taskId) throw new Error('Cannot prepare a mutation outside an active task');
  await service.bindToStep(proposal, taskId, step);
  stageMutationProposal(step, proposal);
  return { service, proposal };
}

export function stageMutationProposal(step: AgentStep, proposal: MutationProposal): void {
  stagedProposals.set(step, { proposal, approved: false });
}

export function approveStagedMutation(
  step: AgentStep,
  proposalId: string,
  proposalHash: string
): void {
  const staged = stagedProposals.get(step);
  if (staged?.proposal.id !== proposalId || staged?.proposal.hash !== proposalHash) {
    throw new Error('Approval does not match the staged mutation proposal');
  }
  staged.approved = true;
}

export function consumeApprovedMutation(step: AgentStep | undefined): MutationProposal {
  const staged = step ? stagedProposals.get(step) : undefined;
  if (!step || !staged?.approved) {
    throw new Error('Exact mutation proposal was not prepared and approved');
  }
  stagedProposals.delete(step);
  applicableProposals.add(staged.proposal);
  return staged.proposal;
}
