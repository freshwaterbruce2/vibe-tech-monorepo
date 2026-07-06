/**
 * useSettingsSyncCommands tests — palette entries open the Settings Sync
 * dialog in the matching mode.
 */
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useSettingsSyncCommands } from '../../hooks/useSettingsSyncCommands';
import { useSettingsSyncStore } from '../../stores/settingsSyncStore';

beforeEach(() => {
  useSettingsSyncStore.setState({ mode: 'closed' });
});

describe('useSettingsSyncCommands', () => {
  it('exposes the export and import commands with palette metadata', () => {
    const { result } = renderHook(() => useSettingsSyncCommands());
    expect(result.current.map(c => c.id)).toEqual(['settings-export', 'settings-import']);
    expect(result.current.every(c => c.category === 'Settings')).toBe(true);
    expect(result.current.every(c => c.icon != null)).toBe(true);
  });

  it('Settings: Export… opens the dialog in export mode', () => {
    const { result } = renderHook(() => useSettingsSyncCommands());
    result.current.find(c => c.id === 'settings-export')?.action();
    expect(useSettingsSyncStore.getState().mode).toBe('export');
  });

  it('Settings: Import… opens the dialog in import mode', () => {
    const { result } = renderHook(() => useSettingsSyncCommands());
    result.current.find(c => c.id === 'settings-import')?.action();
    expect(useSettingsSyncStore.getState().mode).toBe('import');
  });
});
