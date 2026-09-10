/**
 * File Action Executors
 *
 * Handles file system operations: read, write, edit, delete, create directory
 */
import { logger } from '../../../../services/Logger';
import { recordFileUndo } from '../FileUndo';
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
        return { success: false, message: `File not found: ${resolvedPath}` };
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

    const { fileSystemService, taskState, liveStream, callbacks } = context;
    const resolvedPath = resolveFilePath(
      params['filePath'] as string,
      taskState.workspaceRoot,
      fileSystemService
    );

    const existed = await fileSystemService.exists(resolvedPath);
    const before = existed ? await fileSystemService.readFile(resolvedPath) : null;

    // PHASE 7: Stream content to editor before writing file
    if (liveStream) {
      await liveStream.streamToEditor(resolvedPath, params['content'] as string);
    }

    await fileSystemService.writeFile(resolvedPath, params['content'] as string);
    recordFileUndo(context, { path: resolvedPath, before, after: params['content'] as string });

    if (callbacks?.onFileChanged) {
      callbacks.onFileChanged(resolvedPath, existed ? 'modified' : 'created');
    }

    return {
      success: true,
      ...(existed ? { filesModified: [resolvedPath] } : { filesCreated: [resolvedPath] }),
      message: `Created file: ${resolvedPath}`,
    };
  } catch (error) {
    throw new Error(`Failed to write file: ${error}`);
  }
}

/**
 * Edit file action executor
 */
export async function executeEditFile(
  params: Record<string, unknown>,
  context: ActionContext
): Promise<StepResult> {
  try {
    const { fileSystemService, taskState, liveStream, callbacks } = context;
    const resolvedPath = resolveFilePath(
      params['filePath'] as string,
      taskState.workspaceRoot,
      fileSystemService
    );

    const oldContent = await fileSystemService.readFile(resolvedPath);
    const newContent = oldContent.replace(
      params['oldContent'] as string,
      params['newContent'] as string
    );

    // PHASE 7: Show diff and request approval before applying
    if (liveStream) {
      const changes = await liveStream.showDiffPreview(resolvedPath, oldContent, newContent);
      const approved = await liveStream.requestApproval(resolvedPath, changes);

      if (!approved) {
        liveStream.clearDecorations();
        return {
          success: false,
          message: `Edit rejected by user: ${resolvedPath}`,
        };
      }

      liveStream.clearDecorations();
    }

    await fileSystemService.writeFile(resolvedPath, newContent);
    recordFileUndo(context, { path: resolvedPath, before: oldContent, after: newContent });

    if (callbacks?.onFileChanged) {
      callbacks.onFileChanged(resolvedPath, 'modified');
    }

    return {
      success: true,
      filesModified: [resolvedPath],
      message: `Edited file: ${resolvedPath}`,
    };
  } catch (error) {
    throw new Error(`Failed to edit file: ${error}`);
  }
}

/**
 * Delete file action executor
 */
export async function executeDeleteFile(
  params: Record<string, unknown>,
  context: ActionContext
): Promise<StepResult> {
  try {
    const { fileSystemService, taskState, callbacks } = context;
    const resolvedPath = resolveFilePath(
      params['filePath'] as string,
      taskState.workspaceRoot,
      fileSystemService
    );

    await fileSystemService.deleteFile(resolvedPath);

    if (callbacks?.onFileChanged) {
      callbacks.onFileChanged(resolvedPath, 'deleted');
    }

    return {
      success: true,
      filesDeleted: [resolvedPath],
      message: `Deleted file: ${resolvedPath}`,
    };
  } catch (error) {
    throw new Error(`Failed to delete file: ${error}`);
  }
}

/**
 * Create directory action executor
 */
export async function executeCreateDirectory(
  params: Record<string, unknown>,
  context: ActionContext
): Promise<StepResult> {
  try {
    const { fileSystemService, taskState } = context;
    const resolvedPath = resolveFilePath(
      params['path'] as string,
      taskState.workspaceRoot,
      fileSystemService
    );

    await fileSystemService.createDirectory(resolvedPath);
    return {
      success: true,
      message: `Created directory: ${resolvedPath}`,
    };
  } catch (error) {
    throw new Error(`Failed to create directory: ${error}`);
  }
}
