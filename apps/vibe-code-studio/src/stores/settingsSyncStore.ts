/**
 * Settings Sync store — dialog state for spec 06 export/import.
 * Spec: FEATURE_SPECS/competitive-gaps/06-SETTINGS-SYNC-PROFILES.md
 */
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export type SettingsSyncMode = 'closed' | 'export' | 'import';

export interface SettingsSyncState {
  mode: SettingsSyncMode;
  actions: {
    open: (mode: Exclude<SettingsSyncMode, 'closed'>) => void;
    close: () => void;
  };
}

export const useSettingsSyncStore = create<SettingsSyncState>()(
  devtools(
    immer(set => ({
      mode: 'closed' as SettingsSyncMode,
      actions: {
        open: mode =>
          set(state => {
            state.mode = mode;
          }),
        close: () =>
          set(state => {
            state.mode = 'closed';
          }),
      },
    })),
    { name: 'settings-sync-store' }
  )
);
