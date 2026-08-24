import type { DbStatus } from '../types';

export interface UseAppEffectsProps {
  showWarning: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  setDbStatus: (status: DbStatus) => void;
  setOpenrouterApiKey: (key: string) => void;
  handleOpenFolder: (folderPath: string) => Promise<void>;
  handleOpenFile: (filePath: string) => Promise<void>;
}
