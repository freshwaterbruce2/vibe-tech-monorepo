/**
 * Context-menu item factory for the explorer sidebar.
 */

import { ClipboardCopy, FilePlus2, FolderPlus, Pencil, RefreshCw, Trash2 } from 'lucide-react';

import type { FileSystemItem } from '../types';

import type { ContextMenuItem } from './ui/context-menu';

export type SidebarContextMenuActions = {
  fileSystemServiceAvailable: boolean;
  onCopyPath: (path: string) => void;
  onNewFile: (item: FileSystemItem) => void;
  onNewFolder: (item: FileSystemItem) => void;
  onRename: (item: FileSystemItem) => void;
  onRefresh: () => void;
  onDelete: (item: FileSystemItem) => void;
};

export function buildSidebarContextMenuItems(
  item: FileSystemItem,
  actions: SidebarContextMenuActions
): ContextMenuItem[] {
  return [
    {
      id: 'copy-path',
      label: 'Copy Path',
      icon: <ClipboardCopy size={16} />,
      onClick: () => {
        actions.onCopyPath(item.path);
      },
    },
    { id: 'divider-1', label: '', divider: true },
    {
      id: 'new-file',
      label: 'New File Here',
      icon: <FilePlus2 size={16} />,
      disabled: !actions.fileSystemServiceAvailable,
      onClick: () => actions.onNewFile(item),
    },
    {
      id: 'new-folder',
      label: 'New Folder Here',
      icon: <FolderPlus size={16} />,
      disabled: !actions.fileSystemServiceAvailable,
      onClick: () => actions.onNewFolder(item),
    },
    {
      id: 'rename',
      label: 'Rename',
      icon: <Pencil size={16} />,
      disabled: !actions.fileSystemServiceAvailable,
      onClick: () => actions.onRename(item),
    },
    {
      id: 'refresh',
      label: 'Refresh Explorer',
      icon: <RefreshCw size={16} />,
      onClick: () => {
        actions.onRefresh();
      },
    },
    { id: 'divider-2', label: '', divider: true },
    {
      id: 'delete',
      label: `Delete ${item.type === 'directory' ? 'Folder' : 'File'}`,
      icon: <Trash2 size={16} />,
      danger: true,
      onClick: () => {
        actions.onDelete(item);
      },
    },
  ];
}
