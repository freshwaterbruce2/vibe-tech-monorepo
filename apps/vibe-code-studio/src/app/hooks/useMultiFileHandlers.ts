/**
 * useMultiFileHandlers - Multi-file edit workflow handlers
 */

import { useCallback } from 'react';
import type { FileChange, MultiFileEditPlan } from '@vibetech/types';
import { logger } from '../../services/Logger';
import type { FileSystemService } from '../../services/FileSystemService';
import type { EditorFile } from '../../types';

export interface UseMultiFileHandlersProps {
  multiFileEditor: any;
  currentFile: EditorFile | null;
  fileSystemService: FileSystemService;

  setMultiFileEditPlan: (plan: MultiFileEditPlan | null) => void;
  setMultiFileChanges: (changes: FileChange[]) => void;
  setMultiFileApprovalOpen: (open: boolean) => void;

  handleFileChange: (content: string) => void;

  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
}

export function useMultiFileHandlers(props: UseMultiFileHandlersProps) {
  const {
    multiFileEditor,
    currentFile,
    fileSystemService,
    setMultiFileEditPlan,
    setMultiFileChanges,
    setMultiFileApprovalOpen,
    handleFileChange,
    showSuccess,
    showError,
  } = props;

  const handleApplyMultiFileChanges = useCallback(async (selectedFiles: string[]) => {
    const plan = (window as unknown as Record<string, unknown>)['__multiFileEditPlan'] as MultiFileEditPlan | null;
    const changes = ((window as unknown as Record<string, unknown>)['__multiFileChanges'] as FileChange[] | undefined) ?? [];

    if (!plan) {
      logger.error('[MultiFileEdit] No plan available');
      return;
    }

    try {
      const selectedChanges = changes.filter(c => selectedFiles.includes(c.path));
      const editorInstance = multiFileEditor as any;
      if (typeof editorInstance.applyChanges !== 'function') {
        throw new Error('multiFileEditor.applyChanges not available');
      }
      const result = await editorInstance.applyChanges(selectedChanges);

      if (result.success) {
        showSuccess('Changes Applied', `Successfully applied changes to ${result.appliedFiles.length} file(s)`);

        if (currentFile && selectedFiles.includes(currentFile.path)) {
          const content = await fileSystemService.readFile(currentFile.path);
          if (content !== undefined) {
            handleFileChange(content);
          }
        }
      } else {
        showError('Apply Failed', result.error ?? 'Unknown error');
      }

      setMultiFileApprovalOpen(false);
      setMultiFileEditPlan(null);
      setMultiFileChanges([]);
    } catch (error) {
      logger.error('[MultiFileEdit] Failed to apply changes:', error);
      showError('Apply Failed', error instanceof Error ? error.message : 'Unknown error');
    }
  }, [multiFileEditor, currentFile, fileSystemService, handleFileChange, showSuccess, showError, setMultiFileApprovalOpen, setMultiFileEditPlan, setMultiFileChanges]);

  const handleRejectMultiFileChanges = useCallback(() => {
    setMultiFileApprovalOpen(false);
    setMultiFileEditPlan(null);
    setMultiFileChanges([]);
    logger.debug('[MultiFileEdit] Changes rejected');
  }, [setMultiFileApprovalOpen, setMultiFileEditPlan, setMultiFileChanges]);

  const handleAcceptFile = useCallback(async (filePath: string) => {
    const changes = ((window as unknown as Record<string, unknown>)['__multiFileChanges'] as FileChange[] | undefined) ?? [];
    const change = changes.find(c => c.path === filePath);
    if (!change) {
      logger.error(`[MultiFileEdit] Change for ${filePath} not found`);
      return;
    }

    try {
      const editorInstance = multiFileEditor as any;
      if (typeof editorInstance.applyChanges !== 'function') {
        throw new Error('multiFileEditor.applyChanges not available');
      }
      const result = await editorInstance.applyChanges([change]);

      if (result.success) {
        showSuccess('Change Applied', `Successfully applied change to ${filePath}`);

        if (currentFile && currentFile.path === filePath) {
          const content = await fileSystemService.readFile(currentFile.path);
          if (content !== undefined) {
            handleFileChange(content);
          }
        }

        // Remove from UI state
        const remainingChanges = changes.filter(c => c.path !== filePath);
        (window as unknown as Record<string, unknown>)['__multiFileChanges'] = remainingChanges;
        setMultiFileChanges(remainingChanges);

        if (remainingChanges.length === 0) {
          setMultiFileApprovalOpen(false);
          setMultiFileEditPlan(null);
        }
      } else {
        showError('Apply Failed', result.error ?? 'Unknown error');
      }
    } catch (error) {
      logger.error('[MultiFileEdit] Failed to apply single file change:', error);
      showError('Apply Failed', error instanceof Error ? error.message : 'Unknown error');
    }
  }, [multiFileEditor, currentFile, fileSystemService, handleFileChange, showSuccess, showError, setMultiFileApprovalOpen, setMultiFileEditPlan, setMultiFileChanges]);

  const handleRejectFile = useCallback((filePath: string) => {
    const changes = ((window as unknown as Record<string, unknown>)['__multiFileChanges'] as FileChange[] | undefined) ?? [];
    const remainingChanges = changes.filter(c => c.path !== filePath);
    (window as unknown as Record<string, unknown>)['__multiFileChanges'] = remainingChanges;
    setMultiFileChanges(remainingChanges);
    logger.debug(`[MultiFileEdit] Change for ${filePath} rejected`);

    if (remainingChanges.length === 0) {
      setMultiFileApprovalOpen(false);
      setMultiFileEditPlan(null);
    }
  }, [setMultiFileChanges, setMultiFileApprovalOpen, setMultiFileEditPlan]);

  const handleMultiFileEditDetected = useCallback((plan: MultiFileEditPlan, changes: FileChange[]) => {
    logger.info('[App] Multi-file edit detected:', plan.description);
    (window as unknown as Record<string, unknown>)['__multiFileEditPlan'] = plan;
    (window as unknown as Record<string, unknown>)['__multiFileChanges'] = changes;
    setMultiFileEditPlan(plan);
    setMultiFileChanges(changes);
    setMultiFileApprovalOpen(true);
  }, [setMultiFileEditPlan, setMultiFileChanges, setMultiFileApprovalOpen]);

  return {
    handleApplyMultiFileChanges,
    handleRejectMultiFileChanges,
    handleAcceptFile,
    handleRejectFile,
    handleMultiFileEditDetected,
  };
}
