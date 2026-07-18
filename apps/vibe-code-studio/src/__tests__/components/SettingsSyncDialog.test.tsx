/**
 * SettingsSyncDialog tests — spec 06 export/import UI: store-gated mount,
 * export JSON view, import validation errors, diff preview, apply flow,
 * and the no-changes path. Drives real stores (settingsSyncStore +
 * useEditorStore); editor settings are reset per test because the store
 * persists through the file-lifetime electron store mock.
 *
 * Apply now routes through applySettingsChange (via useServices().aiService +
 * useAppExtras() showSuccess/showError) so an imported aiModel reaches
 * useAIStore.setModel + aiService.setModel — the contexts are supplied here
 * through a provider wrapper, exactly like SchedulePanelHost.test.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { act, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppExtrasContext, ServicesContext } from '../../app/contexts';
import type { AppExtrasContextValue, ServicesContextValue } from '../../app/contexts';
import { SettingsSyncDialog } from '../../components/SettingsSync/SettingsSyncDialog';
import { SETTINGS_EXPORT_VERSION } from '../../services/settings/settingsSchema';
import { useAIStore } from '../../stores/useAIStore';
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

const setModel = vi.fn();
const showSuccess = vi.fn();
const showError = vi.fn();

const services = { aiService: { setModel } } as unknown as ServicesContextValue;
const extras = { showSuccess, showError } as unknown as AppExtrasContextValue;

const wrapper = ({ children }: { children: ReactNode }) => (
  <ServicesContext.Provider value={services}>
    <AppExtrasContext.Provider value={extras}>{children}</AppExtrasContext.Provider>
  </ServicesContext.Provider>
);

const renderDialog = () => render(<SettingsSyncDialog />, { wrapper });

const pasteAndPreview = (json: string) => {
  fireEvent.change(screen.getByTestId('settings-sync-input'), { target: { value: json } });
  fireEvent.click(previewButton());
};

beforeEach(() => {
  useSettingsSyncStore.setState({ mode: 'closed' });
  useAIStore.setState({ currentModel: 'moonshot/kimi-2.5-pro' });
  act(() => {
    useEditorStore.getState().actions.resetSettings();
  });
  setModel.mockReset();
  showSuccess.mockReset();
  showError.mockReset();
});

describe('SettingsSyncDialog', () => {
  it('renders nothing while the store is closed', () => {
    renderDialog();
    expect(screen.queryByTestId('settings-sync-dialog')).toBeNull();
  });

  it('export mode shows the versioned JSON and the no-API-keys note', () => {
    useSettingsSyncStore.setState({ mode: 'export' });
    renderDialog();

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
    renderDialog();
    expect(screen.getByText('Import Settings')).toBeTruthy();

    pasteAndPreview('{not json');
    expect(screen.getByTestId('settings-sync-error').textContent).toBe('Not valid JSON.');
    expect(screen.queryByTestId('settings-sync-diff')).toBeNull();
  });

  it('previews a per-key diff and applies it to useEditorStore', () => {
    useSettingsSyncStore.setState({ mode: 'import' });
    renderDialog();

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
    // No aiModel change → applySettingsChange takes the plain-success branch,
    // never touching the live model.
    expect(setModel).not.toHaveBeenCalled();
    // preview is cleared after applying, so Apply disables again
    expect(applyButton().disabled).toBe(true);
    expect(screen.queryByTestId('settings-sync-diff')).toBeNull();
  });

  it('routes an imported aiModel change through applySettingsChange (aiService + useAIStore)', () => {
    useSettingsSyncStore.setState({ mode: 'import' });
    renderDialog();

    // Default settings.aiModel is 'moonshot/kimi-2.5-pro'; import a different
    // REGISTERED model so useAIStore.setModel keeps it (unknown ids collapse to
    // the default and would hide the propagation).
    pasteAndPreview(exportPayload({ aiModel: 'deepseek/deepseek-r1' }));
    const rows = Array.from(screen.getByTestId('settings-sync-diff').querySelectorAll('li')).map(
      li => li.textContent
    );
    expect(rows).toEqual(['aiModel: "deepseek/deepseek-v4-pro" → "deepseek/deepseek-r1"']);

    fireEvent.click(applyButton());

    // The two applySettingsChange side effects on a model change: the AI store
    // is written (source of truth) AND the live service is re-pointed — neither
    // happens on a raw updateSettings patch (the v1.2.1 bug this fix closes).
    expect(useAIStore.getState().currentModel).toBe('deepseek/deepseek-r1');
    expect(setModel).toHaveBeenCalledWith('deepseek/deepseek-r1');
    expect(useEditorStore.getState().settings.aiModel).toBe('deepseek/deepseek-r1');
    expect(screen.getByTestId('settings-sync-applied').textContent).toBe('Settings applied.');
  });

  it('recovers from an error once a valid payload is previewed', () => {
    useSettingsSyncStore.setState({ mode: 'import' });
    renderDialog();

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
    renderDialog();

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
    renderDialog();

    expect(previewButton().disabled).toBe(true);
    fireEvent.change(screen.getByTestId('settings-sync-input'), { target: { value: '   ' } });
    expect(previewButton().disabled).toBe(true);
    fireEvent.change(screen.getByTestId('settings-sync-input'), { target: { value: '{}' } });
    expect(previewButton().disabled).toBe(false);
  });

  it('Close writes to the store and the dialog unmounts', () => {
    useSettingsSyncStore.setState({ mode: 'export' });
    renderDialog();
    expect(screen.getByTestId('settings-sync-dialog')).toBeTruthy();

    fireEvent.click(screen.getByText('Close'));
    expect(useSettingsSyncStore.getState().mode).toBe('closed');
    expect(screen.queryByTestId('settings-sync-dialog')).toBeNull();
  });
});
