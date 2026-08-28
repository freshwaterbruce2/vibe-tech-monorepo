/**
 * settingsSyncStore tests — dialog mode transitions for spec 06.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { useSettingsSyncStore } from '../../stores/settingsSyncStore';

beforeEach(() => {
  useSettingsSyncStore.setState({ mode: 'closed' });
});

describe('settingsSyncStore', () => {
  it('starts closed', () => {
    expect(useSettingsSyncStore.getState().mode).toBe('closed');
  });

  it('open("export") switches to export mode', () => {
    useSettingsSyncStore.getState().actions.open('export');
    expect(useSettingsSyncStore.getState().mode).toBe('export');
  });

  it('open("import") switches to import mode', () => {
    useSettingsSyncStore.getState().actions.open('import');
    expect(useSettingsSyncStore.getState().mode).toBe('import');
  });

  it('close returns to closed from either mode', () => {
    const { actions } = useSettingsSyncStore.getState();
    actions.open('export');
    actions.close();
    expect(useSettingsSyncStore.getState().mode).toBe('closed');
    actions.open('import');
    actions.close();
    expect(useSettingsSyncStore.getState().mode).toBe('closed');
  });
});
