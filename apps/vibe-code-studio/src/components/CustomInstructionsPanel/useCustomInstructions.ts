/**
 * useCustomInstructions Hook
 * State and logic for managing custom instructions/rules
 */
import { useCallback, useEffect, useState, type ChangeEvent } from 'react';

import type { DeepCodeRules } from '../../types/customInstructions';

import type { TabType } from './types';

interface UseCustomInstructionsOptions {
  currentRules?: DeepCodeRules;
  onSaveRules: (rules: DeepCodeRules) => Promise<void>;
  onLoadRules: () => Promise<DeepCodeRules | null>;
  onExportRules: (rules: DeepCodeRules) => void;
  onImportRules: (file: File) => Promise<void>;
}

/**
 * Returns a copy of `rules` with the dot-delimited `path` set to `value`.
 * Intermediate objects are created as needed.
 */
function withNestedValue(
  rules: DeepCodeRules,
  path: string,
  value: unknown
): DeepCodeRules {
  const parts = path.split('.');
  const newRules = { ...rules };
  let current: Record<string, unknown> = newRules as unknown as Record<string, unknown>;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (part && !current[part]) {
      current[part] = {};
    }
    if (part) {
      current = current[part] as Record<string, unknown>;
    }
  }

  const lastPart = parts[parts.length - 1];
  if (lastPart) {
    current[lastPart] = value;
  }
  return newRules;
}

interface RulesActionsArgs {
  rules: DeepCodeRules | null;
  setRules: React.Dispatch<React.SetStateAction<DeepCodeRules | null>>;
  setIsEditing: React.Dispatch<React.SetStateAction<boolean>>;
  loadRules: () => Promise<void>;
  onSaveRules: UseCustomInstructionsOptions['onSaveRules'];
  onExportRules: UseCustomInstructionsOptions['onExportRules'];
  onImportRules: UseCustomInstructionsOptions['onImportRules'];
}

/**
 * Builds the save/export/import/edit action callbacks for the rules panel.
 */
function useRulesActions({
  rules,
  setRules,
  setIsEditing,
  loadRules,
  onSaveRules,
  onExportRules,
  onImportRules,
}: RulesActionsArgs) {
  const handleSave = useCallback(async () => {
    if (rules) {
      await onSaveRules(rules);
      setIsEditing(false);
    }
  }, [rules, onSaveRules, setIsEditing]);

  const handleExport = useCallback(() => {
    if (rules) {
      onExportRules(rules);
    }
  }, [rules, onExportRules]);

  const handleImport = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await onImportRules(file);
      await loadRules();
    }
  }, [onImportRules, loadRules]);

  const updateNestedValue = useCallback((path: string, value: unknown) => {
    if (!rules) {return;}
    setRules(withNestedValue(rules, path, value));
  }, [rules, setRules]);

  const createNewRules = useCallback(() => {
    setRules({ version: '1.0' });
  }, [setRules]);

  return { handleSave, handleExport, handleImport, updateNestedValue, createNewRules };
}

export function useCustomInstructions(options: UseCustomInstructionsOptions) {
  const { currentRules, onSaveRules, onLoadRules, onExportRules, onImportRules } = options;

  const [rules, setRules] = useState<DeepCodeRules | null>(currentRules ?? null);
  const [activeTab, setActiveTab] = useState<TabType>('global');
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const loadRules = useCallback(async () => {
    const loaded = await onLoadRules();
    if (loaded) {
      setRules(loaded);
    }
  }, [onLoadRules]);

  useEffect(() => {
    if (currentRules) {
      setRules(currentRules);
    } else {
      void loadRules();
    }
  }, [currentRules, loadRules]);

  const { handleSave, handleExport, handleImport, updateNestedValue, createNewRules } =
    useRulesActions({
      rules,
      setRules,
      setIsEditing,
      loadRules,
      onSaveRules,
      onExportRules,
      onImportRules,
    });

  return {
    rules,
    setRules,
    activeTab,
    setActiveTab,
    isEditing,
    setIsEditing,
    editedContent,
    setEditedContent,
    selectedTemplate,
    setSelectedTemplate,
    loadRules,
    handleSave,
    handleExport,
    handleImport,
    updateNestedValue,
    createNewRules,
  };
}
