/**
 * SettingsSyncDialog tests — spec 06 export/import UI: store-gated mount,
 * export JSON view, import validation errors, diff preview, apply flow,
 * and the no-changes path. Drives real stores (settingsSyncStore +
 * useEditorStore); editor settings are reset per test because the store
 * persists through the file-lifetime electron store mock.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { SettingsSyncDialog } from '../../components/SettingsSync/SettingsSyncDialog';
import { SETTINGS_EXPORT_VERSION } from '../../services/settings/settingsSchema';
import { useSettingsSyncStore } from '../../stores/settingsSyncStore';
import { useEditorStore } from '../../stores/useEditorStore';

const exportPayload = (settings: Record<string, unknown>): string =>
  JSON.stringify({
    version: SETTINGS_EXPORT_VERSION,
    exportedAt: '2026-07-05T12:00:00.000Z',
    settings,
  });

const applyButton = (): HTMLButtonElement =>
  screen.getByTestId('settings-sync-apply') as HTMLButtonElement;

const previewButton = (): HTMLButtonElement =>
  screen.getByTestId('settings-sync-preview') as HTMLButtonElement;

const pasteAndPreview = (json: string) => {
  fireEvent.change(screen.getByTestId('settings-sync-input'), { target: { value: json } });
  fireEvent.click(previewButton());
};

beforeEach(() => {
  useSettingsSyncStore.setState({ mode: 'closed' });
  act(() => {
    useEditorStore.getState().actions.resetSettings();
  });
});

describe('SettingsSyncDialog', () => {
  it('renders nothing while the store is closed', () => {
    render(<SettingsSyncDialog />);
    expect(screen.queryByTestId('settings-sync-dialog')).toBeNull();
  });

  it('export mode shows the versioned JSON and the no-API-keys note', () => {
    useSettingsSyncStore.setState({ mode: 'export' });
    render(<SettingsSyncDialog />);

    expect(screen.getByText('Export Settings (versioned JSON)')).toBeTruthy();
    expect(
      screen.getByText('API keys are never included — they live in secure storage.')
    ).toBeTruthy();

    const textarea = screen.getByTestId('settings-sync-export') as HTMLTextAreaElement;
    expect(textarea.readOnly).toBe(true);
    expect(textarea.value).toContain('"version": 1');
    expect(textarea.value).toContain('"fontSize": 14');
  });

  it('import mode shows a validation error for invalid JSON', () => {
    useSettingsSyncStore.setState({ mode: 'import' });
    render(<SettingsSyncDialog />);
    expect(screen.getByText('Import Settings')).toBeTruthy();

    pasteAndPreview('{not json');
    expect(screen.getByTestId('settings-sync-error').textContent).toBe('Not valid JSON.');
    expect(screen.queryByTestId('settings-sync-diff')).toBeNull();
  });

  it('previews a per-key diff and applies it to useEditorStore', () => {
    useSettingsSyncStore.setState({ mode: 'import' });
    render(<SettingsSyncDialog />);

    pasteAndPreview(exportPayload({ fontSize: 18, rulers: [120] }));
    expect(screen.queryByTestId('settings-sync-error')).toBeNull();

    const diff = screen.getByTestId('settings-sync-diff');
    const rows = Array.from(diff.querySelectorAll('li')).map(li => li.textContent);
    expect(rows).toEqual(['fontSize: 14 → 18', 'rulers: undefined → [120]']);
    expect(applyButton().disabled).toBe(false);

    fireEvent.click(applyButton());
    expect(useEditorStore.getState().settings.fontSize).toBe(18);
    expect(useEditorStore.getState().settings.rulers).toEqual([120]);
    expect(screen.getByTestId('settings-sync-applied').textContent).toBe('Settings applied.');
    // preview is cleared after applying, so Apply disables again
    expect(applyButton().disabled).toBe(true);
    expect(screen.queryByTestId('settings-sync-diff')).toBeNull();
  });

  it('recovers from an error once a valid payload is previewed', () => {
    useSettingsSyncStore.setState({ mode: 'import' });
    render(<SettingsSyncDialog />);

    pasteAndPreview(exportPayload({ fontSize: 'big' }));
    expect(screen.getByTestId('settings-sync-error').textContent).toMatch(
      /^Invalid settings file: settings\.fontSize — /
    );

    pasteAndPreview(exportPayload({ fontSize: 18 }));
    expect(screen.queryByTestId('settings-sync-error')).toBeNull();
    expect(screen.getByTestId('settings-sync-diff')).toBeTruthy();
  });

  it('shows the no-changes note and keeps Apply disabled when already in sync', () => {
    useSettingsSyncStore.setState({ mode: 'import' });
    render(<SettingsSyncDialog />);

    pasteAndPreview(exportPayload({ fontSize: 14, theme: 'dark' }));
    expect(screen.getByTestId('settings-sync-no-changes').textContent).toBe(
      'No changes — already in sync.'
    );
    expect(applyButton().disabled).toBe(true);

    // clicking the disabled Apply never mutates settings
    fireEvent.click(applyButton());
    expect(useEditorStore.getState().settings.fontSize).toBe(14);
    expect(screen.queryByTestId('settings-sync-applied')).toBeNull();
  });

  it('disables Preview while the textarea is empty or whitespace', () => {
    useSettingsSyncStore.setState({ mode: 'import' });
    render(<SettingsSyncDialog />);

    expect(previewButton().disabled).toBe(true);
    fireEvent.change(screen.getByTestId('settings-sync-input'), { target: { value: '   ' } });
    expect(previewButton().disabled).toBe(true);
    fireEvent.change(screen.getByTestId('settings-sync-input'), { target: { value: '{}' } });
    expect(previewButton().disabled).toBe(false);
  });

  it('Close writes to the store and the dialog unmounts', () => {
    useSettingsSyncStore.setState({ mode: 'export' });
    render(<SettingsSyncDialog />);
    expect(screen.getByTestId('settings-sync-dialog')).toBeTruthy();

    fireEvent.click(screen.getByText('Close'));
    expect(useSettingsSyncStore.getState().mode).toBe('closed');
    expect(screen.queryByTestId('settings-sync-dialog')).toBeNull();
  });
});
