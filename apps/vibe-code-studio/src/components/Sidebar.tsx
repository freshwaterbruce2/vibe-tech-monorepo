import { FilePlus2, FolderOpen, FolderPlus, RefreshCw, Search, Settings, Zap } from 'lucide-react';
import React, { memo, useCallback, useEffect, useState } from 'react';

import { logger } from '../services/Logger';
import type { FileSystemItem } from '../types';

import { InputDialog } from './InputDialog';
import {
  ActionButtons,
  EmptyState,
  FileExplorer,
  OpenFolderButton,
  SearchActions,
  SearchContainer,
  SearchInput,
  SearchRow,
  SectionHeader,
  SectionHeaderActions,
  SectionHeaderTitle,
  SidebarContainer,
  SidebarSection,
} from './Sidebar.styles';
import type { ActionDialogState, SidebarProps } from './Sidebar.types';
import { CLOSED_ACTION_DIALOG } from './Sidebar.types';
import { SidebarFileTree } from './SidebarFileTree';
import { buildSidebarContextMenuItems } from './sidebarContextMenu';
import { remapPath } from './sidebarPathUtils';
import { ContextMenu } from './ui/context-menu';
import { Dialog } from './ui/dialog';
import { IconButton } from './ui/icon-button';
import { useContextMenu } from './ui/useContextMenu';

const Sidebar = ({
  workspaceFolder,
  onOpenFile,
  onToggleAIChat,
  aiChatOpen,
  fileSystemService,
  onDeleteFile,
  onCreateFile,
  onCreateFolder,
  onRenamePath,
  onOpenFolder,
  onShowSettings,
  onError,
  refreshKey = 0,
}: SidebarProps) => {
  const [fileTree, setFileTree] = useState<FileSystemItem[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [folderChildren, setFolderChildren] = useState<Map<string, FileSystemItem[]>>(new Map());
  const [actionDialog, setActionDialog] = useState<ActionDialogState>(CLOSED_ACTION_DIALOG);
  const { contextMenu, showContextMenu, hideContextMenu } = useContextMenu();
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    fileName: string;
    filePath: string;
  }>({
    isOpen: false,
    fileName: '',
    filePath: '',
  });

  const showOperationError = useCallback(
    (title: string, error: unknown) => {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred';
      logger.error(`[Sidebar] ${title}:`, error);
      onError?.(title, message);
    },
    [onError]
  );

  const focusSearchInput = useCallback(() => {
    const input = document.querySelector<HTMLInputElement>('input[placeholder="Search files..."]');
    input?.focus();
  }, []);

  const loadFolder = useCallback(
    async (path: string): Promise<FileSystemItem[]> => {
      if (!fileSystemService) {
        return [];
      }

      const children = await fileSystemService.listDirectory(path);
      return children.sort((left, right) => {
        if (left.type !== right.type) {
          return left.type === 'directory' ? -1 : 1;
        }
        return left.name.localeCompare(right.name);
      });
    },
    [fileSystemService]
  );

  const loadFileTree = useCallback(
    async (expandedFoldersToRefresh?: Set<string>) => {
      if (!workspaceFolder || !fileSystemService) {
        setFileTree([]);
        setFolderChildren(new Map());
        return;
      }

      try {
        const files = await loadFolder(workspaceFolder);
        setFileTree(files);

        const expandedPaths = Array.from(expandedFoldersToRefresh ?? expandedFolders);
        if (expandedPaths.length === 0) {
          setFolderChildren(new Map());
          return;
        }

        const refreshedChildren = await Promise.all(
          expandedPaths.map(async path => {
            try {
              return [path, await loadFolder(path)] as const;
            } catch (error) {
              logger.warn('[Sidebar] Failed to refresh expanded folder:', path, error);
              return [path, [] as FileSystemItem[]] as const;
            }
          })
        );

        setFolderChildren(new Map(refreshedChildren));
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (errorMsg.includes('ENOENT') || errorMsg.includes('No workspace folder approved yet')) {
          logger.debug('Workspace not ready:', errorMsg);
        } else {
          logger.error('Failed to load file tree:', error);
        }
        setFileTree([]);
        setFolderChildren(new Map());
      }
    },
    [workspaceFolder, fileSystemService, loadFolder, expandedFolders]
  );

  useEffect(() => {
    if (workspaceFolder && fileSystemService) {
      void loadFileTree();
    }
  }, [workspaceFolder, fileSystemService, refreshKey, loadFileTree]);

  const toggleFolder = async (path: string) => {
    const isCurrentlyExpanded = expandedFolders.has(path);

    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (isCurrentlyExpanded) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });

    if (!isCurrentlyExpanded && !folderChildren.has(path)) {
      try {
        const children = await loadFolder(path);
        setFolderChildren(prev => new Map(prev).set(path, children));
      } catch (error) {
        showOperationError('Load Folder Failed', error);
      }
    }
  };

  const handleFileClick = (item: FileSystemItem) => {
    if (item.type === 'directory') {
      void toggleFolder(item.path);
      return;
    }

    setSelectedFile(item.path);
    onOpenFile(item.path);
  };

  const openCreateDialog = (
    mode: 'create-file' | 'create-folder',
    targetPath: string,
    targetType: 'file' | 'directory'
  ) => {
    setActionDialog({
      isOpen: true,
      mode,
      title: mode === 'create-file' ? 'Create File' : 'Create Folder',
      placeholder: mode === 'create-file' ? 'Enter a file name' : 'Enter a folder name',
      defaultValue: '',
      targetPath,
      targetType,
    });
  };

  const openRenameDialog = (item: FileSystemItem) => {
    setActionDialog({
      isOpen: true,
      mode: 'rename',
      title: `Rename ${item.type === 'directory' ? 'Folder' : 'File'}`,
      placeholder: item.type === 'directory' ? 'Enter a new folder name' : 'Enter a new file name',
      defaultValue: item.name,
      targetPath: item.path,
      targetType: item.type,
    });
  };

  const getTargetDirectory = (targetPath: string, targetType: 'file' | 'directory'): string => {
    if (!fileSystemService) {
      return workspaceFolder ?? '';
    }

    if (!targetPath) {
      return workspaceFolder ?? '';
    }

    return targetType === 'directory' ? targetPath : fileSystemService.dirname(targetPath);
  };

  const validateName = (value: string): string | null => {
    if (value.includes('/') || value.includes('\\')) {
      return 'Use a single file or folder name';
    }
    return null;
  };

  const handleActionDialogConfirm = async (value: string) => {
    if (!fileSystemService) {
      return;
    }

    const directory = getTargetDirectory(actionDialog.targetPath, actionDialog.targetType);
    const nextPath =
      actionDialog.mode === 'rename'
        ? fileSystemService.joinPath(fileSystemService.dirname(actionDialog.targetPath), value)
        : fileSystemService.joinPath(directory, value);

    try {
      if (actionDialog.mode === 'create-file') {
        if (await fileSystemService.exists(nextPath)) {
          throw new Error(`A file or folder named "${value}" already exists here`);
        }
        if (onCreateFile) {
          await onCreateFile(nextPath);
        } else {
          await fileSystemService.createFile(nextPath, '');
          onOpenFile(nextPath);
        }
      } else if (actionDialog.mode === 'create-folder') {
        if (await fileSystemService.exists(nextPath)) {
          throw new Error(`A file or folder named "${value}" already exists here`);
        }
        if (onCreateFolder) {
          await onCreateFolder(nextPath);
        } else {
          await fileSystemService.createDirectory(nextPath);
        }
        const nextExpandedFolders = new Set(expandedFolders).add(nextPath);
        setExpandedFolders(nextExpandedFolders);
        await loadFileTree(nextExpandedFolders);
        setActionDialog(CLOSED_ACTION_DIALOG);
        return;
      } else {
        if (nextPath !== actionDialog.targetPath) {
          if (await fileSystemService.exists(nextPath)) {
            throw new Error(`A file or folder named "${value}" already exists here`);
          }
          if (onRenamePath) {
            await onRenamePath(actionDialog.targetPath, nextPath);
          } else {
            await fileSystemService.rename(actionDialog.targetPath, nextPath);
          }
          if (selectedFile) {
            const remappedSelection = remapPath(selectedFile, actionDialog.targetPath, nextPath);
            if (remappedSelection !== selectedFile) {
              setSelectedFile(remappedSelection);
            }
          }
          const nextExpandedFolders = new Set<string>();
          expandedFolders.forEach(path => {
            nextExpandedFolders.add(remapPath(path, actionDialog.targetPath, nextPath));
          });
          setExpandedFolders(nextExpandedFolders);
          await loadFileTree(nextExpandedFolders);
          setActionDialog(CLOSED_ACTION_DIALOG);
          return;
        }
      }

      setActionDialog(CLOSED_ACTION_DIALOG);
      await loadFileTree();
    } catch (error) {
      showOperationError(actionDialog.mode === 'rename' ? 'Rename Failed' : 'Create Failed', error);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!onDeleteFile) {
      return;
    }

    try {
      await onDeleteFile(deleteDialog.filePath);
      if (
        selectedFile === deleteDialog.filePath ||
        selectedFile?.startsWith(`${deleteDialog.filePath}/`)
      ) {
        setSelectedFile(null);
      }
      const nextExpandedFolders = new Set<string>();
      expandedFolders.forEach(path => {
        if (path !== deleteDialog.filePath && !path.startsWith(`${deleteDialog.filePath}/`)) {
          nextExpandedFolders.add(path);
        }
      });
      setExpandedFolders(nextExpandedFolders);
      await loadFileTree(nextExpandedFolders);
    } catch (error) {
      showOperationError(
        'Delete Failed',
        error instanceof Error
          ? new Error(`Could not delete "${deleteDialog.fileName}": ${error.message}`)
          : error
      );
    } finally {
      setDeleteDialog({ isOpen: false, fileName: '', filePath: '' });
    }
  };

  const handleFileContextMenu = (e: React.MouseEvent, item: FileSystemItem) => {
    e.preventDefault();
    e.stopPropagation();

    const createTargetType = item.type === 'directory' ? 'directory' : 'file';
    const contextMenuItems = buildSidebarContextMenuItems(item, {
      fileSystemServiceAvailable: Boolean(fileSystemService),
      onCopyPath: path => {
        void navigator.clipboard.writeText(path);
      },
      onNewFile: target => openCreateDialog('create-file', target.path, createTargetType),
      onNewFolder: target => openCreateDialog('create-folder', target.path, createTargetType),
      onRename: openRenameDialog,
      onRefresh: () => {
        void loadFileTree();
      },
      onDelete: target => {
        setDeleteDialog({
          isOpen: true,
          fileName: target.name,
          filePath: target.path,
        });
      },
    });

    showContextMenu(e, contextMenuItems);
  };

  const handleOpenFolder = () => {
    onOpenFolder?.();
  };

  return (
    <SidebarContainer role="complementary" aria-label="Sidebar navigation">
      <SidebarSection>
        <SectionHeader>
          <SectionHeaderTitle>
            <FolderOpen size={14} />
            Explorer
          </SectionHeaderTitle>
          <SectionHeaderActions>
            <IconButton
              variant="ghost"
              size="xs"
              icon={<FilePlus2 size={14} />}
              aria-label="New File"
              onClick={() =>
                workspaceFolder && openCreateDialog('create-file', workspaceFolder, 'directory')
              }
              disabled={!workspaceFolder || !fileSystemService}
            />
            <IconButton
              variant="ghost"
              size="xs"
              icon={<FolderPlus size={14} />}
              aria-label="New Folder"
              onClick={() =>
                workspaceFolder && openCreateDialog('create-folder', workspaceFolder, 'directory')
              }
              disabled={!workspaceFolder || !fileSystemService}
            />
            <IconButton
              variant="ghost"
              size="xs"
              icon={<RefreshCw size={14} />}
              aria-label="Refresh Explorer"
              onClick={() => {
                void loadFileTree();
              }}
              disabled={!workspaceFolder || !fileSystemService}
            />
          </SectionHeaderActions>
        </SectionHeader>

        {workspaceFolder || fileTree.length > 0 ? (
          <>
            <SearchContainer>
              <SearchRow>
                <SearchInput
                  type="text"
                  placeholder="Search files..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  aria-label="Search files"
                />
                <SearchActions>
                  <IconButton
                    variant="ghost"
                    size="sm"
                    icon={<Search size={16} />}
                    aria-label="Focus Search"
                    onClick={focusSearchInput}
                  />
                </SearchActions>
              </SearchRow>
            </SearchContainer>

            <FileExplorer>
              <SidebarFileTree
                items={fileTree}
                searchTerm={searchTerm}
                selectedFile={selectedFile}
                expandedFolders={expandedFolders}
                folderChildren={folderChildren}
                onFileClick={handleFileClick}
                onFileContextMenu={handleFileContextMenu}
              />
            </FileExplorer>
          </>
        ) : (
          <EmptyState>
            <p>No folder opened</p>
            <OpenFolderButton
              onClick={handleOpenFolder}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FolderOpen size={16} />
              Open Folder
            </OpenFolderButton>
          </EmptyState>
        )}
      </SidebarSection>

      <ActionButtons>
        <IconButton
          variant="ghost"
          size="md"
          icon={<Search size={18} />}
          aria-label="Search"
          onClick={focusSearchInput}
        />
        <IconButton
          variant={aiChatOpen ? 'primary' : 'ghost'}
          size="md"
          icon={<Zap size={18} />}
          aria-label="AI Assistant"
          onClick={onToggleAIChat}
        />
        <IconButton
          variant="ghost"
          size="md"
          icon={<Settings size={18} />}
          aria-label="Settings"
          onClick={onShowSettings}
        />
      </ActionButtons>

      {contextMenu && (
        <ContextMenu
          items={contextMenu.items}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={hideContextMenu}
        />
      )}

      <Dialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, fileName: '', filePath: '' })}
        title={deleteDialog.fileName ? `Delete ${deleteDialog.fileName}` : 'Delete Item'}
        message={`Are you sure you want to delete "${deleteDialog.fileName}"? This action cannot be undone.`}
        variant="danger"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDeleteConfirm}
        showCancel
      />

      <InputDialog
        isOpen={actionDialog.isOpen}
        title={actionDialog.title}
        placeholder={actionDialog.placeholder}
        defaultValue={actionDialog.defaultValue}
        validate={validateName}
        onConfirm={value => {
          void handleActionDialogConfirm(value);
        }}
        onCancel={() => setActionDialog(CLOSED_ACTION_DIALOG)}
      />
    </SidebarContainer>
  );
};

export default memo(Sidebar);
