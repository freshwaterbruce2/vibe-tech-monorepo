import { useState, useCallback } from 'react';
import { useWarehouseConfig, WarehouseConfig } from '@/config/warehouse';
import { useTheme } from '@/contexts/ThemeContext';
import { toast } from 'sonner';

export function useSettingsForm() {
  const { config, updateConfig, resetConfig, isAuthenticated, refreshFromApi } = useWarehouseConfig();
  const { applyTheme } = useTheme();
  const [formData, setFormData] = useState<WarehouseConfig>(config);
  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = useCallback((field: keyof WarehouseConfig, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleNestedInputChange = useCallback((
    parentField: keyof WarehouseConfig,
    childField: string,
    value: any
  ) => {
    setFormData(prev => {
      const parentValue = prev[parentField];
      if (typeof parentValue === 'object' && parentValue !== null && !Array.isArray(parentValue)) {
        return {
          ...prev,
          [parentField]: {
            ...parentValue,
            [childField]: value
          }
        };
      }
      return prev;
    });
  }, []);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await updateConfig(formData);
      applyTheme();
      toast.success('Settings saved successfully!', {
        description: 'Your warehouse configuration has been updated.'
      });
    } catch (error) {
      toast.error('Failed to save settings', {
        description: 'Please try again or contact support.'
      });
    } finally {
      setIsSaving(false);
    }
  }, [formData, updateConfig, applyTheme]);

  const handleReset = useCallback(async () => {
    try {
      await resetConfig();
      setFormData(config);
      applyTheme();
      toast.info('Settings reset to defaults', {
        description: 'All customizations have been removed.'
      });
    } catch (error) {
      toast.error('Failed to reset settings');
    }
  }, [resetConfig, config, applyTheme]);

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(config);

  return {
    formData,
    isSaving,
    hasChanges,
    handleInputChange,
    handleNestedInputChange,
    handleSave,
    handleReset,
    isAuthenticated,
    refreshFromApi
  };
}
