import { motion } from 'framer-motion';
import {
  ChevronDown,
  ChevronRight,
  ClipboardCopy,
  File,
  FilePlus2,
  Folder,
  FolderOpen,
  FolderPlus,
  Pencil,
  RefreshCw,
  Search,
  Settings,
  Trash2,
  Zap,
} from 'lucide-react';
import React, { memo, useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';

import type { FileSystemService } from '../services/FileSystemService';
import { logger } from '../services/Logger';
import { vibeTheme } from '../styles/theme';
import type { FileSystemItem } from '../types';

import { InputDialog } from './InputDialog';
import type { ContextMenuItem } from './ui/context-menu';
import { ContextMenu, useContextMenu } from './ui/context-menu';
import { Dialog } from './ui/dialog';
import { IconButton } from './ui/icon-button';

const SidebarContainer = styled.div`
  width: 280px;
  background: ${vibeTheme.colors.secondary};
  border-right: 1px solid rgba(139, 92, 246, 0.15);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  position: relative;
`;

const SidebarSection = styled.div`
  flex: 1;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(139, 92, 246, 0.2);
    border-radius: ${vibeTheme.borderRadius.full};

    &:hover {
      background: rgba(139, 92, 246, 0.4);
    }
  }
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${vibeTheme.spacing[2]};
  padding: ${vibeTheme.spacing[4]};
  background: ${vibeTheme.colors.primary};
  border-bottom: 1px solid rgba(139, 92, 246, 0.1);
  font-size: ${vibeTheme.typography.fontSize.xs};
  font-weight: ${vibeTheme.typography.fontWeight.semibold};
  color: ${vibeTheme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: ${vibeTheme.typography.letterSpacing.wider};
`;

const SectionHeaderTitle = styled.div`
  display: flex;
  align-items: center;
  min-width: 0;

  svg {
    margin-right: ${vibeTheme.spacing[2]};
    color: ${vibeTheme.colors.cyan};
    width: 14px;
    height: 14px;
  }
`;

const SectionHeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing[1]};
`;

const SearchContainer = styled.div`
  padding: ${vibeTheme.spacing[3]};
  border-bottom: 1px solid rgba(139, 92, 246, 0.1);
`;

const SearchRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing[2]};
`;

const SearchInput = styled.input`
  width: 100%;
  background: ${vibeTheme.colors.tertiary};
  border: 1px solid rgba(139, 92, 246, 0.2);
  color: ${vibeTheme.colors.text};
  padding: ${vibeTheme.spacing[2]} ${vibeTheme.spacing[3]};
  border-radius: ${vibeTheme.borderRadius.md};
  font-size: ${vibeTheme.typography.fontSize.sm};
  font-family: ${vibeTheme.typography.fontFamily.primary};
  transition: ${vibeTheme.animation.transition.all};
  height: 32px;

  &:hover {
    border-color: rgba(139, 92, 246, 0.3);
    background: ${vibeTheme.colors.elevated};
  }

  &:focus {
    outline: none;
    border-color: ${vibeTheme.colors.cyan};
    background: ${vibeTheme.colors.tertiary};
    box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.1);
  }

  &::placeholder {
    color: ${vibeTheme.colors.textMuted};
  }
`;

const SearchActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing[1]};
  flex-shrink: 0;
`;

const FileExplorer = styled.div`
  padding: ${vibeTheme.spacing[2]} 0;
`;

const FileItem = styled(motion.div)<{ level: number; selected?: boolean }>`
  display: flex;
  align-items: center;
  padding: ${vibeTheme.spacing[2]} ${vibeTheme.spacing[3]} ${vibeTheme.spacing[2]}
    ${(props) => 12 + props.level * 16}px;
  cursor: pointer;
  font-size: ${vibeTheme.typography.fontSize.sm};
  color: ${(props) => (props.selected ? vibeTheme.colors.text : vibeTheme.colors.textSecondary)};
  background: ${(props) => (props.selected ? vibeTheme.colors.hover : 'transparent')};
  border-radius: ${vibeTheme.borderRadius.sm};
  margin: 1px ${vibeTheme.spacing[2]};
  transition: ${vibeTheme.animation.transition.all};
  position: relative;

  ${(props) =>
    props.selected &&
    `
    background: ${vibeTheme.colors.hoverStrong};
    box-shadow: ${vibeTheme.shadows.xs};

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 2px;
      background: ${vibeTheme.colors.cyan};
      border-radius: 0 ${vibeTheme.borderRadius.xs} ${vibeTheme.borderRadius.xs} 0;
    }
  `}

  &:hover {
    background: ${(props) =>
      props.selected ? vibeTheme.colors.active : vibeTheme.colors.hover};
    color: ${vibeTheme.colors.text};
  }
`;

const FileIcon = styled.div<{ type: 'file' | 'directory'; $expanded?: boolean }>`
  margin-right: ${vibeTheme.spacing[2]};
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing[1]};
  color: ${(props) => (props.type === 'directory' ? vibeTheme.colors.cyan : vibeTheme.colors.textSecondary)};
  transition: ${vibeTheme.animation.transition.colors};

  svg {
    width: 16px;
    height: 16px;
  }
`;

const FileName = styled.span`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: ${vibeTheme.typography.fontWeight.normal};
`;

const EmptyState = styled.div`
  padding: ${vibeTheme.spacing[16]};
  text-align: center;
  color: ${vibeTheme.colors.textMuted};
  font-size: ${vibeTheme.typography.fontSize.sm};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${vibeTheme.spacing[4]};

  p {
    margin: 0;
    font-weight: ${vibeTheme.typography.fontWeight.medium};
    color: ${vibeTheme.colors.textSecondary};
  }
`;

const OpenFolderButton = styled(motion.button)`
  background: ${vibeTheme.gradients.primary};
  border: none;
  color: ${vibeTheme.colors.text};
  padding: ${vibeTheme.spacing[3]} ${vibeTheme.spacing[6]};
  border-radius: ${vibeTheme.borderRadius.md};
  cursor: pointer;
  font-size: ${vibeTheme.typography.fontSize.sm};
  font-weight: ${vibeTheme.typography.fontWeight.medium};
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing[2]};
  transition: ${vibeTheme.animation.transition.all};
  box-shadow: ${vibeTheme.shadows.sm}, ${vibeTheme.shadows.glow};

  &:hover {
    transform: translateY(-1px);
    box-shadow: ${vibeTheme.shadows.md}, ${vibeTheme.shadows.glowStrong};
  }

  &:active {
    transform: translateY(0);
    box-shadow: ${vibeTheme.shadows.sm};
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: ${vibeTheme.spacing[2]};
  padding: ${vibeTheme.spacing[3]};
  border-top: 1px solid rgba(139, 92, 246, 0.1);
  background: ${vibeTheme.colors.primary};
`;

type DialogMode = 'create-file' | 'create-folder' | 'rename';

interface ActionDialogState {
  isOpen: boolean;
  mode: DialogMode;
  title: string;
  placeholder: string;
  defaultValue: string;
  targetPath: string;
  targetType: 'file' | 'directory';
}

interface SidebarProps {
  workspaceFolder: string | null;
  onOpenFile: (path: string) => void;
  onToggleAIChat: () => void;
  aiChatOpen: boolean;
  fileSystemService?: FileSystemService;
  onDeleteFile?: (path: string) => Promise<void>;
  onCreateFile?: (path: string) => Promise<void>;
  onCreateFolder?: (path: string) => Promise<void>;
  onRenamePath?: (oldPath: string, newPath: string) => Promise<void>;
  onOpenFolder?: () => void;
  onShowSettings: () => void;
  onError?: (title: string, message: string) => void;
  refreshKey?: number;
}

const CLOSED_ACTION_DIALOG: ActionDialogState = {
  isOpen: false,
  mode: 'create-file',
  title: '',
  placeholder: '',
  defaultValue: '',
  targetPath: '',
  targetType: 'directory',
};

function remapPath(path: string, oldPath: string, newPath: string): string {
  if (path === oldPath) {
    return newPath;
  }

  const prefix = `${oldPath}/`;
  if (path.startsWith(prefix)) {
    return `${newPath}${path.slice(oldPath.length)}`;
  }

  return path;
}

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

  const showOperationError = useCallback((title: string, error: unknown) => {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred';
    logger.error(`[Sidebar] ${title}:`, error);
    onError?.(title, message);
  }, [onError]);

  const loadFolder = useCallback(async (path: string): Promise<FileSystemItem[]> => {
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
  }, [fileSystemService]);

  const loadFileTree = useCallback(async (expandedFoldersToRefresh?: Set<string>) => {
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
        expandedPaths.map(async (path) => {
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
  }, [workspaceFolder, fileSystemService, loadFolder, expandedFolders]);

  useEffect(() => {
    if (workspaceFolder && fileSystemService) {
      void loadFileTree();
    }
  }, [workspaceFolder, fileSystemService, refreshKey, loadFileTree]);

  const toggleFolder = async (path: string) => {
    const isCurrentlyExpanded = expandedFolders.has(path);

    setExpandedFolders((prev) => {
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
        setFolderChildren((prev) => new Map(prev).set(path, children));
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

  const openCreateDialog = (mode: 'create-file' | 'create-folder', targetPath: string, targetType: 'file' | 'directory') => {
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

    return targetType === 'directory'
      ? targetPath
      : fileSystemService.dirname(targetPath);
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
    const nextPath = actionDialog.mode === 'rename'
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
          expandedFolders.forEach((path) => {
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
      showOperationError(
        actionDialog.mode === 'rename' ? 'Rename Failed' : 'Create Failed',
        error
      );
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
      expandedFolders.forEach((path) => {
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
    const contextMenuItems: ContextMenuItem[] = [
      {
        id: 'copy-path',
        label: 'Copy Path',
        icon: <ClipboardCopy size={16} />,
        onClick: () => {
          navigator.clipboard.writeText(item.path);
        },
      },
      { id: 'divider-1', label: '', divider: true },
      {
        id: 'new-file',
        label: 'New File Here',
        icon: <FilePlus2 size={16} />,
        disabled: !fileSystemService,
        onClick: () => openCreateDialog('create-file', item.path, createTargetType),
      },
      {
        id: 'new-folder',
        label: 'New Folder Here',
        icon: <FolderPlus size={16} />,
        disabled: !fileSystemService,
        onClick: () => openCreateDialog('create-folder', item.path, createTargetType),
      },
      {
        id: 'rename',
        label: 'Rename',
        icon: <Pencil size={16} />,
        disabled: !fileSystemService,
        onClick: () => openRenameDialog(item),
      },
      {
        id: 'refresh',
        label: 'Refresh Explorer',
        icon: <RefreshCw size={16} />,
        onClick: () => {
          void loadFileTree();
        },
      },
      { id: 'divider-2', label: '', divider: true },
      {
        id: 'delete',
        label: `Delete ${item.type === 'directory' ? 'Folder' : 'File'}`,
        icon: <Trash2 size={16} />,
        danger: true,
        onClick: () => {
          setDeleteDialog({
            isOpen: true,
            fileName: item.name,
            filePath: item.path,
          });
        },
      },
    ];

    showContextMenu(e, contextMenuItems);
  };

  const renderFileTree = (items: FileSystemItem[], level = 0): React.ReactNode => {
    return items
      .filter(
        (item) => searchTerm === '' || item.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .map((item) => (
        <div key={item.path}>
          <FileItem
            level={level}
            selected={selectedFile === item.path}
            aria-selected={selectedFile === item.path}
            onClick={() => handleFileClick(item)}
            onContextMenu={(e) => handleFileContextMenu(e, item)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <FileIcon type={item.type} $expanded={expandedFolders.has(item.path)}>
              {item.type === 'directory' ? (
                <>
                  {expandedFolders.has(item.path) ? (
                    <ChevronDown size={12} />
                  ) : (
                    <ChevronRight size={12} />
                  )}
                  <Folder size={16} />
                </>
              ) : (
                <File size={16} />
              )}
            </FileIcon>
            <FileName>{item.name}</FileName>
          </FileItem>

          {item.type === 'directory' && expandedFolders.has(item.path) && (
            <div>{renderFileTree(folderChildren.get(item.path) ?? [], level + 1)}</div>
          )}
        </div>
      ));
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
              onClick={() => workspaceFolder && openCreateDialog('create-file', workspaceFolder, 'directory')}
              disabled={!workspaceFolder || !fileSystemService}
            />
            <IconButton
              variant="ghost"
              size="xs"
              icon={<FolderPlus size={14} />}
              aria-label="New Folder"
              onClick={() => workspaceFolder && openCreateDialog('create-folder', workspaceFolder, 'directory')}
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
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <SearchActions>
                  <IconButton
                    variant="ghost"
                    size="sm"
                    icon={<Search size={16} />}
                    aria-label="Focus Search"
                    onClick={() => {
                      const input = document.querySelector<HTMLInputElement>('input[placeholder="Search files..."]');
                      input?.focus();
                    }}
                  />
                </SearchActions>
              </SearchRow>
            </SearchContainer>

            <FileExplorer>{renderFileTree(fileTree)}</FileExplorer>
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
        <IconButton variant="ghost" size="md" icon={<Search size={18} />} aria-label="Search" />
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
        onConfirm={(value) => {
          void handleActionDialogConfirm(value);
        }}
        onCancel={() => setActionDialog(CLOSED_ACTION_DIALOG)}
      />
    </SidebarContainer>
  );
};

export default memo(Sidebar);
