import { useEffect } from 'react';
import { WebMCPManager } from '@vibetech/shared-utils';
import { logger } from '../../services/Logger';
import type { EditorFile } from '../../types';

export interface UseWebMCPProps {
  currentFile: EditorFile | null;
  openFiles: EditorFile[];
  workspaceFolder: string | null;
  handleOpenFile: (filePath: string) => Promise<void>;
  handleSaveFile: () => Promise<void>;
  handleInsertCode: (code: string) => void;
}

/**
 * Hook to initialize and register WebMCP tools in Vibe Code Studio
 */
export function useWebMCP({
  currentFile,
  openFiles,
  workspaceFolder,
  handleOpenFile,
  handleSaveFile,
  handleInsertCode,
}: UseWebMCPProps): void {
  useEffect(() => {
    logger.info('[WebMCP] Initializing WebMCP manager and polyfills in VCS...');
    const manager = WebMCPManager.getInstance();

    // Start mutation observer scanning for declarative forms in DOM
    manager.startScanning(() => {
      logger.debug('[WebMCP] DOM scanned: updated WebMCP declarative tools');
    });

    // 1. Tool to get the current editor state
    manager.registerImperativeTool({
      name: 'vcs_get_editor_state',
      description: 'Returns active file name, path, language, content, list of open files, and the workspace folder path.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      execute: async () => {
        logger.info('[WebMCP] Executing tool: vcs_get_editor_state');
        return {
          currentFile: currentFile
            ? {
                name: currentFile.name,
                path: currentFile.path,
                language: currentFile.language,
                length: currentFile.content?.length || 0,
              }
            : null,
          openFiles: openFiles.map((f) => ({
            name: f.name,
            path: f.path,
            language: f.language,
          })),
          workspaceFolder,
        };
      },
    });

    // 2. Tool to open a file by path
    manager.registerImperativeTool({
      name: 'vcs_open_file',
      description: 'Opens a file in the editor workspace using an absolute or relative path.',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The filesystem path of the file to open.',
          },
        },
        required: ['path'],
        additionalProperties: false,
      },
      execute: async (args: { path: string }) => {
        logger.info(`[WebMCP] Executing tool: vcs_open_file with path: ${args.path}`);
        await handleOpenFile(args.path);
        return { success: true, message: `Successfully opened ${args.path}` };
      },
    });

    // 3. Tool to insert code at current cursor
    manager.registerImperativeTool({
      name: 'vcs_insert_code',
      description: 'Inserts code snippet or text at the current cursor position in the active editor.',
      inputSchema: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
            description: 'The code content to insert.',
          },
        },
        required: ['code'],
        additionalProperties: false,
      },
      execute: async (args: { code: string }) => {
        logger.info('[WebMCP] Executing tool: vcs_insert_code');
        handleInsertCode(args.code);
        return { success: true, message: 'Code successfully inserted' };
      },
    });

    // 4. Tool to save current active file
    manager.registerImperativeTool({
      name: 'vcs_save_file',
      description: 'Saves the current active file in the editor.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      execute: async () => {
        logger.info('[WebMCP] Executing tool: vcs_save_file');
        await handleSaveFile();
        return { success: true, message: 'File successfully saved' };
      },
    });

    return () => {
      logger.info('[WebMCP] Cleaning up WebMCP session...');
      manager.stopScanning();
    };
  }, [
    currentFile,
    openFiles,
    workspaceFolder,
    handleOpenFile,
    handleSaveFile,
    handleInsertCode,
  ]);
}
