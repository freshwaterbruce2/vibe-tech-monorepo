import {
  ClipboardCopy,
  FilePlus2,
  FolderPlus,
  Pencil,
  RefreshCw,
  Trash2,
} from 'lucide-react';

import type { FileSystemItem } from '../../types';
import type { ContextMenuItem } from '../ui/context-menu';

export interface ContextMenuCallbacks {
  openCreateDialog: (
    mode: 'create-file' | 'create-folder',
    targetPath: string,
    targetType: 'file' | 'directory',
  ) => void;
  openRenameDialog: (item: FileSystemItem) => void;
  openDeleteDialog: (item: FileSystemItem) => void;
  refreshExplorer: () => void;
  fileSystemAvailable: boolean;
}

export function buildContextMenuItems(
  item: FileSystemItem,
  callbacks: ContextMenuCallbacks,
): ContextMenuItem[] {
  const createTargetType = item.type === 'directory' ? 'directory' : 'file';
  const { openCreateDialog, openRenameDialog, openDeleteDialog, refreshExplorer, fileSystemAvailable } =
    callbacks;

  return [
    {
      id: 'copy-path',
      label: 'Copy Path',
      icon: <ClipboardCopy size={16} />,
      onClick: () => { navigator.clipboard.writeText(item.path); },
    },
    { id: 'divider-1', label: '', divider: true },
    {
      id: 'new-file',
      label: 'New File Here',
      icon: <FilePlus2 size={16} />,
      disabled: !fileSystemAvailable,
      onClick: () => openCreateDialog('create-file', item.path, createTargetType),
    },
    {
      id: 'new-folder',
      label: 'New Folder Here',
      icon: <FolderPlus size={16} />,
      disabled: !fileSystemAvailable,
      onClick: () => openCreateDialog('create-folder', item.path, createTargetType),
    },
    {
      id: 'rename',
      label: 'Rename',
      icon: <Pencil size={16} />,
      disabled: !fileSystemAvailable,
      onClick: () => openRenameDialog(item),
    },
    {
      id: 'refresh',
      label: 'Refresh Explorer',
      icon: <RefreshCw size={16} />,
      onClick: () => refreshExplorer(),
    },
    { id: 'divider-2', label: '', divider: true },
    {
      id: 'delete',
      label: `Delete ${item.type === 'directory' ? 'Folder' : 'File'}`,
      icon: <Trash2 size={16} />,
      danger: true,
      onClick: () => openDeleteDialog(item),
    },
  ];
}
