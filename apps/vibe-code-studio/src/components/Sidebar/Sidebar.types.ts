import type { FileSystemService } from '../../services/FileSystemService';

export type DialogMode = 'create-file' | 'create-folder' | 'rename';

export interface ActionDialogState {
  isOpen: boolean;
  mode: DialogMode;
  title: string;
  placeholder: string;
  defaultValue: string;
  targetPath: string;
  targetType: 'file' | 'directory';
}

export interface SidebarProps {
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

export const CLOSED_ACTION_DIALOG: ActionDialogState = {
  isOpen: false,
  mode: 'create-file',
  title: '',
  placeholder: '',
  defaultValue: '',
  targetPath: '',
  targetType: 'directory',
};

export function remapPath(path: string, oldPath: string, newPath: string): string {
  if (path === oldPath) {
    return newPath;
  }

  const prefix = `${oldPath}/`;
  if (path.startsWith(prefix)) {
    return `${newPath}${path.slice(oldPath.length)}`;
  }

  return path;
}
