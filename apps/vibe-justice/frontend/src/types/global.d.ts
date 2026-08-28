import type { BrainScanResult } from './logic';

type SettingValue = string | number | boolean | object | null;

declare global {
  interface Window {
    vibeTech: {
      searchLogic: (snippet: string, metadata?: Record<string, unknown>) => Promise<BrainScanResult>;
      onLogicViolation: (callback: (violation: Record<string, unknown>) => void) => void;
      ping: () => Promise<string>;
      getSetting: <T = SettingValue>(key: string) => Promise<T | null>;
      setSetting: <T = SettingValue>(key: string, value: T) => Promise<void>;
      onSettingsChanged?: (callback: (value: unknown) => void) => void;
    };
    electronAPI?: {
      ping: () => Promise<string>;
    };
  }
}

export {};
