import { useAIStore } from '../stores/useAIStore';

/**
 * Settings-change handler (extracted from AppLayout for react-refresh
 * compliance; exported for tests).
 * ORDER MATTERS on a model change: the AI store is the source of truth — the
 * status bar reads it and useAppServices re-syncs the service from it on every
 * change — so the store must be written BEFORE the service. Updating only the
 * service gets overwritten by the stale store (v1.2.1 "model switch never
 * took" bug). Service failures surface as a Model Error toast; the store keeps
 * the new model and re-syncs the service later.
 */
export async function applySettingsChange<S extends { aiModel?: string }>(
  deps: {
    updateEditorSettings: (settings: S) => void;
    prevAiModel: string | undefined;
    aiService: { setModel: (model: string) => void | Promise<void> };
    showSuccess: (title: string, message?: string) => void;
    showError: (title: string, message?: string) => void;
  },
  newSettings: S
): Promise<void> {
  deps.updateEditorSettings(newSettings);
  if (newSettings.aiModel && newSettings.aiModel !== deps.prevAiModel) {
    try {
      useAIStore.getState().actions.setModel(newSettings.aiModel);
      await deps.aiService.setModel(newSettings.aiModel);
      deps.showSuccess('Settings Updated', 'Your preferences have been saved');
    } catch (error) {
      deps.showError(
        'Model Error',
        error instanceof Error ? error.message : 'Failed to update AI model'
      );
    }
  } else {
    deps.showSuccess('Settings Updated', 'Your preferences have been saved');
  }
}
