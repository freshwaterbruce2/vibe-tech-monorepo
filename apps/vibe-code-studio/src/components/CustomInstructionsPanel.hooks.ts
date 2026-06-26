import { useCallback, useEffect, useReducer, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { DeepCodeRules } from '../types/customInstructions';

export interface UseCustomInstructionsProps {
  currentRules?: DeepCodeRules;
  onSaveRules: (rules: DeepCodeRules) => Promise<void>;
  onLoadRules: () => Promise<DeepCodeRules | null>;
  onExportRules: (rules: DeepCodeRules) => void;
  onImportRules: (file: File) => Promise<void>;
}

function setNestedValue(rules: DeepCodeRules, path: string, value: unknown): DeepCodeRules | null {
  const parts = path.split('.');
  if (parts.length === 0) return null;

  const newRules = { ...rules };
  let current: Record<string, unknown> = newRules as unknown as Record<string, unknown>;

  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]!;
    if (!current[key]) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]!] = value;
  return newRules;
}

interface InstructionHandlerDeps {
  rules: DeepCodeRules | null;
  onSaveRules: (rules: DeepCodeRules) => Promise<void>;
  onExportRules: (rules: DeepCodeRules) => void;
  onImportRules: (file: File) => Promise<void>;
  setIsEditing: (editing: boolean) => void;
  loadRules: () => Promise<void>;
  updateRules: (rules: DeepCodeRules | null) => void;
}

function createInstructionHandlers(deps: InstructionHandlerDeps) {
  const { rules, onSaveRules, onExportRules, onImportRules, setIsEditing, loadRules, updateRules } =
    deps;

  const handleSave = async () => {
    if (rules) {
      await onSaveRules(rules);
      setIsEditing(false);
    }
  };

  const handleExport = () => {
    if (rules) {
      onExportRules(rules);
    }
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await onImportRules(file);
      await loadRules();
    }
  };

  const updateNestedValue = (path: string, value: unknown) => {
    if (!rules) return;
    const newRules = setNestedValue(rules, path, value);
    if (newRules) {
      updateRules(newRules);
    }
  };

  return { handleSave, handleExport, handleImport, updateNestedValue };
}

export function useCustomInstructions({
  currentRules,
  onSaveRules,
  onLoadRules,
  onExportRules,
  onImportRules,
}: UseCustomInstructionsProps) {
  const [rules, updateRules] = useReducer(
    (_: DeepCodeRules | null, next: DeepCodeRules | null) => next,
    currentRules ?? null
  );
  const [activeTab, setActiveTab] = useState<'global' | 'patterns' | 'templates' | 'ai'>('global');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const loadRules = useCallback(async () => {
    const loaded = await onLoadRules();
    if (loaded) {
      updateRules(loaded);
    }
  }, [onLoadRules]);

  useEffect(() => {
    if (!currentRules) {
      void loadRules();
    }
  }, [currentRules, loadRules]);

  const { handleSave, handleExport, handleImport, updateNestedValue } = createInstructionHandlers({
    rules,
    onSaveRules,
    onExportRules,
    onImportRules,
    setIsEditing,
    loadRules,
    updateRules,
  });

  return {
    rules,
    activeTab,
    setActiveTab,
    isEditing,
    setIsEditing,
    selectedTemplate,
    setSelectedTemplate,
    updateRules,
    updateNestedValue,
    handleSave,
    handleExport,
    handleImport,
  };
}