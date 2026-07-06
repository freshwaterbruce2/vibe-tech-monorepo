/**
 * useSettingsSyncCommands — palette entries for spec 06 settings
 * export/import. Consumed by useAICommandPalette.
 * Spec: FEATURE_SPECS/competitive-gaps/06-SETTINGS-SYNC-PROFILES.md
 */
import { Download, Upload } from 'lucide-react';
import type { ReactNode } from 'react';
import { useSettingsSyncStore } from '../stores/settingsSyncStore';

export interface SettingsSyncCommand {
  id: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  shortcut?: string;
  action: () => void;
  category?: string;
  keywords?: string[];
}

export const useSettingsSyncCommands = (): SettingsSyncCommand[] => [
  {
    id: 'settings-export',
    title: 'Settings: Export…',
    description: 'Export editor settings as versioned JSON (no API keys)',
    icon: <Download size={18} />,
    action: () => useSettingsSyncStore.getState().actions.open('export'),
    category: 'Settings',
    keywords: ['settings', 'export', 'backup', 'sync', 'json'],
  },
  {
    id: 'settings-import',
    title: 'Settings: Import…',
    description: 'Validate + preview a settings JSON before applying',
    icon: <Upload size={18} />,
    action: () => useSettingsSyncStore.getState().actions.open('import'),
    category: 'Settings',
    keywords: ['settings', 'import', 'restore', 'sync', 'json'],
  },
];
