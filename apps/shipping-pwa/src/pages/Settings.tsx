import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from "@vibetech/ui";
import {
  Save,
  RotateCcw,
  Settings as SettingsIcon,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Building2,
  Layout,
  Boxes,
  Users,
  Thermometer,
  Zap,
  Palette,
  Eye
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWarehouseConfig, WarehouseConfig } from '@/config/warehouse';
import { useTheme } from '@/contexts/ThemeContext';
import { toast } from 'sonner';
import { WarehouseTab } from './settings/WarehouseTab';
import { BrandingTab } from './settings/BrandingTab';
import { AppTab } from './settings/AppTab';
import { PreviewTab } from './settings/PreviewTab';
import { LayoutTab } from './settings/LayoutTab';
import { OperationsTab } from './settings/OperationsTab';
import { TeamsTab } from './settings/TeamsTab';
import { EnvironmentTab } from './settings/EnvironmentTab';
import { AutomationTab } from './settings/AutomationTab';

const Settings = () => {
  const { config, updateConfig, resetConfig, isAuthenticated, refreshFromApi } = useWarehouseConfig();
  const { applyTheme } = useTheme();
  const [formData, setFormData] = useState<WarehouseConfig>(config);
  const [isSaving, setIsSaving] = useState(false);

  const handleInputChange = (field: keyof WarehouseConfig, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedInputChange = (
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
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateConfig(formData);
      applyTheme();
      toast.success('Settings saved successfully!', {
        description: 'Your warehouse configuration has been updated.'
      });
    } catch {
      toast.error('Failed to save settings', {
        description: 'Please try again or contact support.'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      await resetConfig();
      setFormData(config);
      applyTheme();
      toast.info('Settings reset to defaults', {
        description: 'All customizations have been removed.'
      });
    } catch {
      toast.error('Failed to reset settings');
    }
  };

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(config);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <SettingsIcon className="h-8 w-8" />
            Settings
          </h1>
          <p className="text-muted-foreground">
            Configure your warehouse and application settings
          </p>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <Button variant="outline" onClick={handleReset} disabled={isSaving}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          )}
          <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Connection Status */}
      {isAuthenticated() ? (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Connected to multi-tenant system - changes will sync automatically</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshFromApi}
              className="h-auto p-1"
            >
              Refresh
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Using local storage - connect to tenant system for cloud sync</span>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-auto p-1"
            >
              <a href="/tenant/auth">
                <ExternalLink className="h-3 w-3 mr-1" />
                Connect
              </a>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Settings Tabs */}
      <Tabs defaultValue="warehouse" className="space-y-6">
        <TabsList className="grid w-full grid-cols-8 text-xs">
          <TabsTrigger value="warehouse" className="flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            Basic
          </TabsTrigger>
          <TabsTrigger value="layout" className="flex items-center gap-1">
            <Layout className="h-3 w-3" />
            Layout
          </TabsTrigger>
          <TabsTrigger value="operations" className="flex items-center gap-1">
            <Boxes className="h-3 w-3" />
            Operations
          </TabsTrigger>
          <TabsTrigger value="teams" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            Teams
          </TabsTrigger>
          <TabsTrigger value="environment" className="flex items-center gap-1">
            <Thermometer className="h-3 w-3" />
            Environment
          </TabsTrigger>
          <TabsTrigger value="automation" className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            Automation
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-1">
            <Palette className="h-3 w-3" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            Preview
          </TabsTrigger>
        </TabsList>

        <WarehouseTab
          formData={formData}
          handleInputChange={handleInputChange}
          handleNestedInputChange={handleNestedInputChange}
        />

        <BrandingTab
          formData={formData}
          handleInputChange={handleInputChange}
          handleNestedInputChange={handleNestedInputChange}
        />

        <AppTab
          formData={formData}
          handleInputChange={handleInputChange}
          handleNestedInputChange={handleNestedInputChange}
        />

        <PreviewTab
          formData={formData}
          handleInputChange={handleInputChange}
          handleNestedInputChange={handleNestedInputChange}
        />

        <LayoutTab
          formData={formData}
          handleInputChange={handleInputChange}
          handleNestedInputChange={handleNestedInputChange}
        />

        <OperationsTab
          formData={formData}
          handleInputChange={handleInputChange}
          handleNestedInputChange={handleNestedInputChange}
        />

        <TeamsTab
          formData={formData}
          handleInputChange={handleInputChange}
          handleNestedInputChange={handleNestedInputChange}
        />

        <EnvironmentTab
          formData={formData}
          handleInputChange={handleInputChange}
          handleNestedInputChange={handleNestedInputChange}
        />

        <AutomationTab
          formData={formData}
          handleInputChange={handleInputChange}
          handleNestedInputChange={handleNestedInputChange}
        />
      </Tabs>
    </div>
  );
};

export default Settings;
