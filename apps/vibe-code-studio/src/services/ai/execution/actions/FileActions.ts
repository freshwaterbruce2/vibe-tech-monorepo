/**
 * File Action Executors
 *
 * Handles file system operations: read, write, edit, delete, create directory
 */
import { logger } from '../../../../services/Logger';
import {
  consumeApprovedMutation,
  MutationApplyError,
  MutationService,
} from '../../../agent-runtime/MutationService';
import type { ActionContext, StepResult } from '../types';
import { findFileInCommonLocations, resolveFilePath } from '../utils';

/**
 * Read file action executor
 */
export async function executeReadFile(
  params: Record<string, unknown>,
  context: ActionContext
): Promise<StepResult> {
  try {
    if (!params['filePath']) {
      throw new Error('Missing required parameter: filePath');
    }

    const { fileSystemService, taskState } = context;
    let resolvedPath = resolveFilePath(
      params['filePath'] as string,
      taskState.workspaceRoot,
      fileSystemService
    );

    // Try to find file in alternate locations if it doesn't exist at exact path
    try {
      await fileSystemService.getFileStats(resolvedPath);
    } catch {
      logger.debug(
        `[FileActions] File not found at exact path: ${resolvedPath}, searching alternate locations...`
      );
      const foundPath = await findFileInCommonLocations(
        resolvedPath,
        taskState.workspaceRoot,
        fileSystemService
      );

      if (foundPath) {
        logger.debug(`[FileActions] ✓ Found file at alternate location: ${foundPath}`);
        resolvedPath = foundPath;
      } else {
        throw new Error(`File not found: ${resolvedPath}`);
      }
    }

    const content = await fileSystemService.readFile(resolvedPath);
    return {
      success: true,
      data: { content, filePath: resolvedPath },
      message: `Read file: ${resolvedPath}`,
    };
  } catch (error) {
    throw new Error(`Failed to read file: ${error}`);
  }
}

/**
 * Write file action executor
 */
export async function executeWriteFile(
  params: Record<string, unknown>,
  context: ActionContext
): Promise<StepResult> {
  try {
    if (!params['filePath']) {
      throw new Error('Missing required parameter: filePath');
    }
    if (typeof params['content'] !== 'string') {
      throw new Error('Missing required parameter: content');
    }

    const { fileSystemService, taskState, callbacks } = context;
    const proposal = consumeApprovedMutation(taskState.currentStep);
    const mutationService = new MutationService(fileSystemService, taskState.workspaceRoot);

    // PHASE 7: Stream content to editor before writing file
    const mutation = await mutationService.apply(proposal);

    const action = proposal.changeType === 'create' ? 'created' : 'modified';
    callbacks?.onFileChanged?.(proposal.path, action);

    return {
      success: true,
      data: { mutation },
      ...(proposal.changeType === 'modify'
        ? { filesModified: [proposal.path] }
        : { filesCreated: [proposal.path] }),
      message: `${proposal.changeType === 'modify' ? 'Modified' : 'Created'} file: ${proposal.path}`,
    };
  } catch (error) {
    if (error instanceof MutationApplyError) throw error;
    throw new Error(`Failed to write file: ${error}`);
  }
}

/**
 * Edit file action executor
 */
export async function executeEditFile(
  _params: Record<string, unknown>,
  context: ActionContext
): Promise<StepResult> {
  try {
    const { fileSystemService, taskState, callbacks } = context;
    const proposal = consumeApprovedMutation(taskState.currentStep);
    const mutation = await new MutationService(fileSystemService, taskState.workspaceRoot).apply(
      proposal
    );

    if (callbacks?.onFileChanged) {
      callbacks.onFileChanged(proposal.path, 'modified');
    }

    return {
      success: true,
      data: { mutation },
      filesModified: [proposal.path],
      message: `Edited file: ${proposal.path}`,
    };
  } catch (error) {
    if (error instanceof MutationApplyError) throw error;
    throw new Error(`Failed to edit file: ${error}`);
  }
}

/**
 * Delete file action executor
 */
export async function executeDeleteFile(
  _params: Record<string, unknown>,
  context: ActionContext
): Promise<StepResult> {
  try {
    const { fileSystemService, taskState, callbacks } = context;
    const proposal = consumeApprovedMutation(taskState.currentStep);
    const mutation = await new MutationService(fileSystemService, taskState.workspaceRoot).apply(
      proposal
    );

    if (callbacks?.onFileChanged) {
      callbacks.onFileChanged(proposal.path, 'deleted');
    }

    return {
      success: true,
      data: { mutation },
      filesDeleted: [proposal.path],
      message: `Deleted file: ${proposal.path}`,
    };
  } catch (error) {
    if (error instanceof MutationApplyError) throw error;
    throw new Error(`Failed to delete file: ${error}`);
  }
}

/**
 * Create directory action executor
 */
export async function executeCreateDirectory(
  _params: Record<string, unknown>,
  context: ActionContext
): Promise<StepResult> {
  try {
    const { fileSystemService, taskState } = context;
    const proposal = consumeApprovedMutation(taskState.currentStep);
    const mutation = await new MutationService(fileSystemService, taskState.workspaceRoot).apply(
      proposal
    );
    return {
      success: true,
      data: { mutation },
      message: `Created directory: ${proposal.path}`,
    };
  } catch (error) {
    if (error instanceof MutationApplyError) throw error;
    throw new Error(`Failed to create directory: ${error}`);
  }
}
