import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@vibetech/ui";
import { Button } from "@vibetech/ui";
import { Input } from "@vibetech/ui";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from "@vibetech/ui";
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Save,
  RotateCcw,
  Settings as SettingsIcon,
  Palette,
  Building2,
  Smartphone,
  Eye,
  Shield,
  Info,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Layout,
  Users,
  Thermometer,
  Zap,
  Boxes,
  Clock,
  Truck,
  MapPin,
  Plus,
  Trash2
} from 'lucide-react';
import { useWarehouseConfig, WarehouseConfig } from '@/config/warehouse';
import { useTheme } from '@/contexts/ThemeContext';
import { toast } from 'sonner';

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
      applyTheme(); // Apply theme changes immediately
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
  };

  const handleReset = async () => {
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

        {/* Warehouse Configuration */}
        <TabsContent value="warehouse" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Warehouse Information
              </CardTitle>
              <CardDescription>
                Basic company and warehouse details that appear throughout the app
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) => handleInputChange('companyName', e.target.value)}
                    placeholder="Enter your company name"
                  />
                </div>
                <div>
                  <Label htmlFor="warehouseName">Warehouse Name</Label>
                  <Input
                    id="warehouseName"
                    value={formData.warehouseName}
                    onChange={(e) => handleInputChange('warehouseName', e.target.value)}
                    placeholder="Enter warehouse name"
                  />
                </div>
                <div>
                  <Label htmlFor="warehouseCode">Warehouse Code</Label>
                  <Input
                    id="warehouseCode"
                    value={formData.warehouseCode}
                    onChange={(e) => handleInputChange('warehouseCode', e.target.value)}
                    placeholder="Enter warehouse code"
                  />
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-sm font-medium">Address</Label>
                <div className="space-y-2 mt-2">
                  <Input
                    value={formData.location.address}
                    onChange={(e) => handleNestedInputChange('location', 'address', e.target.value)}
                    placeholder="Street address"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <Input
                      value={formData.location.city}
                      onChange={(e) => handleNestedInputChange('location', 'city', e.target.value)}
                      placeholder="City"
                    />
                    <Input
                      value={formData.location.state}
                      onChange={(e) => handleNestedInputChange('location', 'state', e.target.value)}
                      placeholder="State"
                    />
                    <Input
                      value={formData.location.zipCode}
                      onChange={(e) => handleNestedInputChange('location', 'zipCode', e.target.value)}
                      placeholder="ZIP Code"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-sm font-medium">Door Number Range</Label>
                <div className="flex gap-4 mt-2">
                  <div className="flex-1">
                    <Label htmlFor="doorMin" className="text-xs text-muted-foreground">Minimum</Label>
                    <Input
                      id="doorMin"
                      type="number"
                      value={formData.doorNumberRange.min}
                      onChange={(e) =>
                        handleNestedInputChange('doorNumberRange', 'min', parseInt(e.target.value) || 1)
                      }
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="doorMax" className="text-xs text-muted-foreground">Maximum</Label>
                    <Input
                      id="doorMax"
                      type="number"
                      value={formData.doorNumberRange.max}
                      onChange={(e) =>
                        handleNestedInputChange('doorNumberRange', 'max', parseInt(e.target.value) || 100)
                      }
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding */}
        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Brand Colors
              </CardTitle>
              <CardDescription>
                Customize your app's color scheme and visual identity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(formData.brandColors).map(([colorName, colorValue]) => (
                  <div key={colorName} className="space-y-2">
                    <Label htmlFor={colorName} className="capitalize text-sm font-medium">
                      {colorName.replace(/([A-Z])/g, ' $1').trim()}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id={colorName}
                        type="color"
                        value={colorValue}
                        onChange={(e) =>
                          handleNestedInputChange('brandColors', colorName, e.target.value)
                        }
                        className="w-12 h-10 p-1 border rounded cursor-pointer"
                      />
                      <Input
                        value={colorValue}
                        onChange={(e) =>
                          handleNestedInputChange('brandColors', colorName, e.target.value)
                        }
                        placeholder="#000000"
                        className="flex-1 font-mono text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* App Settings */}
        <TabsContent value="app" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                App Configuration
              </CardTitle>
              <CardDescription>
                App name, description, and feature settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="appName">App Name</Label>
                  <Input
                    id="appName"
                    value={formData.appName}
                    onChange={(e) => handleInputChange('appName', e.target.value)}
                    placeholder="Enter app name"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This appears in the browser title and when installing as a PWA
                  </p>
                </div>
                <div>
                  <Label htmlFor="appShortName">App Short Name</Label>
                  <Input
                    id="appShortName"
                    value={formData.appShortName}
                    onChange={(e) => handleInputChange('appShortName', e.target.value)}
                    placeholder="Enter short name for mobile"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Displayed on mobile home screen (keep it short)
                  </p>
                </div>
                <div>
                  <Label htmlFor="appDescription">App Description</Label>
                  <Textarea
                    id="appDescription"
                    value={formData.appDescription}
                    onChange={(e) => handleInputChange('appDescription', e.target.value)}
                    placeholder="Enter app description"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Used in app stores and when sharing links
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-sm font-medium">Features</Label>
                <div className="space-y-3 mt-3">
                  {Object.entries(formData.features).map(([featureName, enabled]) => (
                    <div key={featureName} className="flex items-center justify-between">
                      <div>
                        <Label className="text-sm font-medium capitalize">
                          {featureName.replace(/([A-Z])/g, ' $1').trim()}
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {getFeatureDescription(featureName)}
                        </p>
                      </div>
                      <Switch
                        checked={enabled}
                        onCheckedChange={(checked) =>
                          handleNestedInputChange('features', featureName, checked)
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview */}
        <TabsContent value="preview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Live Preview
              </CardTitle>
              <CardDescription>
                See how your configuration will look
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* App Header Preview */}
              <div
                className="p-6 rounded-lg text-white relative overflow-hidden"
                style={{
                  backgroundColor: formData.brandColors.primary,
                  background: `linear-gradient(135deg, ${formData.brandColors.primary} 0%, ${formData.brandColors.secondary} 100%)`
                }}
              >
                <h2 className="text-2xl font-bold">{formData.appName}</h2>
                <p className="text-sm opacity-90 mt-1">{formData.appDescription}</p>
                <div className="mt-3 text-xs opacity-75 flex items-center gap-4">
                  <span>{formData.companyName}</span>
                  <span>•</span>
                  <span>{formData.warehouseName}</span>
                </div>
                <div
                  className="absolute top-0 right-0 w-24 h-24 rounded-full -mr-12 -mt-12 opacity-20"
                  style={{ backgroundColor: formData.brandColors.accent }}
                />
              </div>

              {/* Mobile Preview */}
              <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                <div className="mx-auto w-64 h-96 bg-black rounded-3xl p-2">
                  <div className="w-full h-full bg-white dark:bg-gray-800 rounded-2xl p-4 relative">
                    <div className="text-center">
                      <div
                        className="w-16 h-16 rounded-2xl mx-auto mb-2"
                        style={{ backgroundColor: formData.brandColors.primary }}
                      />
                      <h3 className="font-bold text-sm">{formData.appShortName}</h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {formData.appDescription}
                      </p>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4">
                      <div
                        className="h-2 rounded-full"
                        style={{ backgroundColor: formData.brandColors.primary }}
                      />
                    </div>
                  </div>
                </div>
                <p className="text-center text-sm text-muted-foreground mt-2">
                  Mobile app preview
                </p>
              </div>

              {/* Color Palette */}
              <div>
                <Label className="text-sm font-medium">Color Palette</Label>
                <div className="flex gap-2 mt-2">
                  {Object.entries(formData.brandColors).map(([name, color]) => (
                    <div key={name} className="text-center">
                      <div
                        className="w-12 h-12 rounded-lg border"
                        style={{ backgroundColor: color }}
                      />
                      <p className="text-xs mt-1 capitalize">{name}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Advanced Options */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Advanced Configuration
              </CardTitle>
              <CardDescription>
                Additional options for power users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" asChild className="w-full">
                <a href="/admin/warehouse-setup">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Full Admin Panel
                </a>
              </Button>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  The admin panel provides access to additional features like destination DCs,
                  freight types, voice commands, and tenant management.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Layout & Zones Configuration */}
        <TabsContent value="layout" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layout className="h-5 w-5" />
                Warehouse Layout & Zones
              </CardTitle>
              <CardDescription>
                Configure your warehouse physical layout, zones, and door groupings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Warehouse Type */}
              <div>
                <Label htmlFor="warehouseType">Warehouse Type</Label>
                <Select
                  value={formData.warehouseType}
                  onValueChange={(value) => handleInputChange('warehouseType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select warehouse type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="distribution">Distribution Center</SelectItem>
                    <SelectItem value="fulfillment">E-commerce Fulfillment</SelectItem>
                    <SelectItem value="3pl">Third-Party Logistics (3PL)</SelectItem>
                    <SelectItem value="manufacturing">Manufacturing</SelectItem>
                    <SelectItem value="cold-storage">Cold Storage</SelectItem>
                    <SelectItem value="cross-dock">Cross-Docking</SelectItem>
                    <SelectItem value="retail">Retail Distribution</SelectItem>
                    <SelectItem value="mixed">Mixed Operations</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Layout Type */}
              <div>
                <Label htmlFor="layoutType">Physical Layout</Label>
                <Select
                  value={formData.warehouseLayout?.type || 'u-shaped'}
                  onValueChange={(value) => handleNestedInputChange('warehouseLayout', 'type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select layout type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="u-shaped">U-Shaped Layout</SelectItem>
                    <SelectItem value="i-shaped">I-Shaped Layout</SelectItem>
                    <SelectItem value="l-shaped">L-Shaped Layout</SelectItem>
                    <SelectItem value="cross">Cross Layout</SelectItem>
                    <SelectItem value="custom">Custom Layout</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Zones Management */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Warehouse Zones</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const currentZones = formData.warehouseLayout?.zones || [];
                      const newZone = {
                        id: `zone-${Date.now()}`,
                        name: `Zone ${currentZones.length + 1}`,
                        type: 'general' as const,
                        location: { x: 0, y: 0, width: 100, height: 100 },
                        capacity: { pallets: 1000, weight: 50000 },
                        doorAssignments: [],
                        temperatureControlled: false
                      };
                      handleNestedInputChange('warehouseLayout', 'zones', [...currentZones, newZone]);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Zone
                  </Button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {(formData.warehouseLayout?.zones || []).map((zone, index) => (
                    <div key={zone.id} className="flex items-center gap-2 p-3 border rounded-lg">
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <Input
                          placeholder="Zone name"
                          value={zone.name}
                          onChange={(e) => {
                            const updatedZones = [...(formData.warehouseLayout?.zones || [])];
                            updatedZones[index] = { ...zone, name: e.target.value };
                            handleNestedInputChange('warehouseLayout', 'zones', updatedZones);
                          }}
                        />
                        <Select
                          value={zone.type}
                          onValueChange={(value) => {
                            const updatedZones = [...(formData.warehouseLayout?.zones || [])];
                            updatedZones[index] = { ...zone, type: value as any };
                            handleNestedInputChange('warehouseLayout', 'zones', updatedZones);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="receiving">Receiving</SelectItem>
                            <SelectItem value="storage">Storage</SelectItem>
                            <SelectItem value="picking">Picking</SelectItem>
                            <SelectItem value="packing">Packing</SelectItem>
                            <SelectItem value="staging">Staging</SelectItem>
                            <SelectItem value="shipping">Shipping</SelectItem>
                            <SelectItem value="cross-dock">Cross-Dock</SelectItem>
                            <SelectItem value="returns">Returns</SelectItem>
                            <SelectItem value="general">General</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Capacity (pallets)"
                          type="number"
                          value={zone.capacity || 0}
                          onChange={(e) => {
                            const updatedZones = [...(formData.warehouseLayout?.zones || [])];
                            updatedZones[index] = {
                              ...zone,
                              capacity: parseInt(e.target.value) || 0
                            };
                            handleNestedInputChange('warehouseLayout', 'zones', updatedZones);
                          }}
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const updatedZones = (formData.warehouseLayout?.zones || []).filter((_, i) => i !== index);
                          handleNestedInputChange('warehouseLayout', 'zones', updatedZones);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Door Configuration Preview */}
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Layout Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Type:</span> {formData.warehouseType}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Layout:</span> {formData.warehouseLayout?.type}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Zones:</span> {formData.warehouseLayout?.zones?.length || 0}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Capacity:</span> {
                      (formData.warehouseLayout?.zones || []).reduce((sum, zone) => sum + (zone.capacity || 0), 0)
                    } pallets
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Operations Configuration */}
        <TabsContent value="operations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Boxes className="h-5 w-5" />
                Operational Configuration
              </CardTitle>
              <CardDescription>
                Configure cross-docking, staging areas, and operational modes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Cross-Docking */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Cross-Docking Operations</Label>
                    <p className="text-sm text-muted-foreground">Enable direct transfer with minimal storage</p>
                  </div>
                  <Switch
                    checked={formData.operationalModes?.crossDocking?.enabled || false}
                    onCheckedChange={(checked) => {
                      const currentModes = formData.operationalModes || {};
                      handleInputChange('operationalModes', {
                        ...currentModes,
                        crossDocking: {
                          ...currentModes.crossDocking,
                          enabled: checked
                        }
                      });
                    }}
                  />
                </div>

                {formData.operationalModes?.crossDocking?.enabled && (
                  <div className="ml-4 space-y-3 p-3 border-l-2 border-blue-200">
                    <div>
                      <Label>Maximum Transfer Time (hours)</Label>
                      <Input
                        type="number"
                        value={formData.operationalModes?.crossDocking?.maxTransferTime || 24}
                        onChange={(e) => {
                          const currentModes = formData.operationalModes || {};
                          handleInputChange('operationalModes', {
                            ...currentModes,
                            crossDocking: {
                              ...currentModes.crossDocking,
                              maxTransferTime: parseInt(e.target.value) || 24
                            }
                          });
                        }}
                      />
                    </div>
                    <div>
                      <Label>Staging Zones</Label>
                      <Textarea
                        placeholder="Zone IDs separated by commas"
                        value={(formData.operationalModes?.crossDocking?.stagingZones || []).join(', ')}
                        onChange={(e) => {
                          const zones = e.target.value.split(',').map(z => z.trim()).filter(z => z);
                          const currentModes = formData.operationalModes || {};
                          handleInputChange('operationalModes', {
                            ...currentModes,
                            crossDocking: {
                              ...currentModes.crossDocking,
                              stagingZones: zones
                            }
                          });
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Quality Control */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Quality Control Checkpoints</Label>
                    <p className="text-sm text-muted-foreground">Enable QC at receiving and shipping</p>
                  </div>
                  <Switch
                    checked={formData.operationalModes?.qualityControl?.enabled || false}
                    onCheckedChange={(checked) => {
                      const currentModes = formData.operationalModes || {};
                      handleInputChange('operationalModes', {
                        ...currentModes,
                        qualityControl: {
                          enabled: checked,
                          checkpoints: checked ? ['receiving', 'shipping'] : []
                        }
                      });
                    }}
                  />
                </div>
              </div>

              <Separator />

              {/* Staging Areas */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Staging Areas</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const currentAreas = formData.operationalModes?.stagingAreas || [];
                      const newArea = {
                        id: `staging-${Date.now()}`,
                        name: `Staging Area ${currentAreas.length + 1}`,
                        purpose: 'general' as const,
                        capacity: 50,
                        location: 'main-floor'
                      };
                      const currentModes = formData.operationalModes || {};
                      handleInputChange('operationalModes', {
                        ...currentModes,
                        stagingAreas: [...currentAreas, newArea]
                      });
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Staging Area
                  </Button>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {(formData.operationalModes?.stagingAreas || []).map((area, index) => (
                    <div key={area.id} className="flex items-center gap-2 p-3 border rounded-lg">
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <Input
                          placeholder="Area name"
                          value={area.name}
                          onChange={(e) => {
                            const currentModes = formData.operationalModes || {};
                            const updatedAreas = [...(currentModes.stagingAreas || [])];
                            updatedAreas[index] = { ...area, name: e.target.value };
                            handleInputChange('operationalModes', {
                              ...currentModes,
                              stagingAreas: updatedAreas
                            });
                          }}
                        />
                        <Input
                          placeholder="Zone ID"
                          value={area.zoneId}
                          onChange={(e) => {
                            const currentModes = formData.operationalModes || {};
                            const updatedAreas = [...(currentModes.stagingAreas || [])];
                            updatedAreas[index] = { ...area, zoneId: e.target.value };
                            handleInputChange('operationalModes', {
                              ...currentModes,
                              stagingAreas: updatedAreas
                            });
                          }}
                        />
                        <Input
                          placeholder="Capacity"
                          type="number"
                          value={area.capacity}
                          onChange={(e) => {
                            const currentModes = formData.operationalModes || {};
                            const updatedAreas = [...(currentModes.stagingAreas || [])];
                            updatedAreas[index] = { ...area, capacity: parseInt(e.target.value) || 0 };
                            handleInputChange('operationalModes', {
                              ...currentModes,
                              stagingAreas: updatedAreas
                            });
                          }}
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const currentModes = formData.operationalModes || {};
                          const updatedAreas = (currentModes.stagingAreas || []).filter((_, i) => i !== index);
                          handleInputChange('operationalModes', {
                            ...currentModes,
                            stagingAreas: updatedAreas
                          });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Teams & Shifts Configuration */}
        <TabsContent value="teams" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Teams & Shift Management
              </CardTitle>
              <CardDescription>
                Configure shift patterns, teams, and scheduling rules
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Shift Patterns */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Shift Patterns</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const currentPatterns = formData.shiftConfiguration?.patterns || [];
                      const newPattern = {
                        id: `shift-${Date.now()}`,
                        name: `Shift ${currentPatterns.length + 1}`,
                        startTime: '07:00',
                        endTime: '15:00',
                        breakSchedule: [{ start: '10:00', duration: 15 }, { start: '12:00', duration: 30 }],
                        daysOfWeek: [1, 2, 3, 4, 5]
                      };
                      const currentConfig = formData.shiftConfiguration || {};
                      handleInputChange('shiftConfiguration', {
                        ...currentConfig,
                        patterns: [...currentPatterns, newPattern]
                      });
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Shift Pattern
                  </Button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {(formData.shiftConfiguration?.patterns || []).map((pattern, index) => (
                    <div key={pattern.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Shift name"
                          value={pattern.name}
                          className="flex-1"
                          onChange={(e) => {
                            const currentConfig = formData.shiftConfiguration || {};
                            const updatedPatterns = [...(currentConfig.patterns || [])];
                            updatedPatterns[index] = { ...pattern, name: e.target.value };
                            handleInputChange('shiftConfiguration', {
                              ...currentConfig,
                              patterns: updatedPatterns
                            });
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const currentConfig = formData.shiftConfiguration || {};
                            const updatedPatterns = (currentConfig.patterns || []).filter((_, i) => i !== index);
                            handleInputChange('shiftConfiguration', {
                              ...currentConfig,
                              patterns: updatedPatterns
                            });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Start Time</Label>
                          <Input
                            type="time"
                            value={pattern.startTime}
                            onChange={(e) => {
                              const currentConfig = formData.shiftConfiguration || {};
                              const updatedPatterns = [...(currentConfig.patterns || [])];
                              updatedPatterns[index] = { ...pattern, startTime: e.target.value };
                              handleInputChange('shiftConfiguration', {
                                ...currentConfig,
                                patterns: updatedPatterns
                              });
                            }}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">End Time</Label>
                          <Input
                            type="time"
                            value={pattern.endTime}
                            onChange={(e) => {
                              const currentConfig = formData.shiftConfiguration || {};
                              const updatedPatterns = [...(currentConfig.patterns || [])];
                              updatedPatterns[index] = { ...pattern, endTime: e.target.value };
                              handleInputChange('shiftConfiguration', {
                                ...currentConfig,
                                patterns: updatedPatterns
                              });
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Team Configuration */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Teams</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const currentTeams = formData.shiftConfiguration?.teams || [];
                      const newTeam = {
                        id: `team-${Date.now()}`,
                        name: `Team ${currentTeams.length + 1}`,
                        color: '#3B82F6',
                        permissions: ['door_entry', 'pallet_tracking']
                      };
                      const currentConfig = formData.shiftConfiguration || {};
                      handleInputChange('shiftConfiguration', {
                        ...currentConfig,
                        teams: [...currentTeams, newTeam]
                      });
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Team
                  </Button>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {(formData.shiftConfiguration?.teams || []).map((team, index) => (
                    <div key={team.id} className="flex items-center gap-2 p-3 border rounded-lg">
                      <div className="flex-1 grid grid-cols-3 gap-2">
                        <Input
                          placeholder="Team name"
                          value={team.name}
                          onChange={(e) => {
                            const currentConfig = formData.shiftConfiguration || {};
                            const updatedTeams = [...(currentConfig.teams || [])];
                            updatedTeams[index] = { ...team, name: e.target.value };
                            handleInputChange('shiftConfiguration', {
                              ...currentConfig,
                              teams: updatedTeams
                            });
                          }}
                        />
                        <Input
                          placeholder="Team color (hex)"
                          value={team.color}
                          onChange={(e) => {
                            const currentConfig = formData.shiftConfiguration || {};
                            const updatedTeams = [...(currentConfig.teams || [])];
                            updatedTeams[index] = { ...team, color: e.target.value };
                            handleInputChange('shiftConfiguration', {
                              ...currentConfig,
                              teams: updatedTeams
                            });
                          }}
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const currentConfig = formData.shiftConfiguration || {};
                          const updatedTeams = (currentConfig.teams || []).filter((_, i) => i !== index);
                          handleInputChange('shiftConfiguration', {
                            ...currentConfig,
                            teams: updatedTeams
                          });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Environment Configuration */}
        <TabsContent value="environment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Thermometer className="h-5 w-5" />
                Environmental Controls
              </CardTitle>
              <CardDescription>
                Configure temperature zones, compliance, and environmental monitoring
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Temperature Tracking */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Temperature Tracking</Label>
                    <p className="text-sm text-muted-foreground">Monitor temperature-sensitive areas</p>
                  </div>
                  <Switch
                    checked={formData.temperatureTracking?.enabled || false}
                    onCheckedChange={(checked) => {
                      const currentTracking = formData.temperatureTracking || {};
                      handleInputChange('temperatureTracking', {
                        ...currentTracking,
                        enabled: checked
                      });
                    }}
                  />
                </div>

                {formData.temperatureTracking?.enabled && (
                  <div className="ml-4 space-y-4 p-3 border-l-2 border-blue-200">
                    {/* Temperature Zones */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Temperature Zones</Label>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const currentZones = formData.temperatureTracking?.zones || [];
                            const newZone = {
                              id: `temp-zone-${Date.now()}`,
                              name: `Temperature Zone ${currentZones.length + 1}`,
                              type: 'ambient' as const,
                              targetTemp: { min: 20, max: 25 },
                              alertThresholds: { critical: 18, warning: 27 },
                              sensorIds: []
                            };
                            const currentTracking = formData.temperatureTracking || {};
                            handleInputChange('temperatureTracking', {
                              ...currentTracking,
                              zones: [...currentZones, newZone]
                            });
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Zone
                        </Button>
                      </div>

                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {(formData.temperatureTracking?.zones || []).map((zone, index) => (
                          <div key={zone.id} className="p-3 border rounded-lg space-y-2">
                            <div className="flex items-center gap-2">
                              <Input
                                placeholder="Zone name"
                                value={zone.name}
                                className="flex-1"
                                onChange={(e) => {
                                  const currentTracking = formData.temperatureTracking || {};
                                  const updatedZones = [...(currentTracking.zones || [])];
                                  updatedZones[index] = { ...zone, name: e.target.value };
                                  handleInputChange('temperatureTracking', {
                                    ...currentTracking,
                                    zones: updatedZones
                                  });
                                }}
                              />
                              <Select
                                value={zone.unit}
                                onValueChange={(value) => {
                                  const currentTracking = formData.temperatureTracking || {};
                                  const updatedZones = [...(currentTracking.zones || [])];
                                  updatedZones[index] = { ...zone, unit: value as 'F' | 'C' };
                                  handleInputChange('temperatureTracking', {
                                    ...currentTracking,
                                    zones: updatedZones
                                  });
                                }}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="F">Fahrenheit</SelectItem>
                                  <SelectItem value="C">Celsius</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const currentTracking = formData.temperatureTracking || {};
                                  const updatedZones = (currentTracking.zones || []).filter((_, i) => i !== index);
                                  handleInputChange('temperatureTracking', {
                                    ...currentTracking,
                                    zones: updatedZones
                                  });
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                              <div>
                                <Label className="text-xs">Min °C</Label>
                                <Input
                                  type="number"
                                  value={zone.targetTemp.min}
                                  onChange={(e) => {
                                    const currentTracking = formData.temperatureTracking || {};
                                    const updatedZones = [...(currentTracking.zones || [])];
                                    updatedZones[index] = {
                                      ...zone,
                                      targetTemp: { ...zone.targetTemp, min: parseFloat(e.target.value) || 0 }
                                    };
                                    handleInputChange('temperatureTracking', {
                                      ...currentTracking,
                                      zones: updatedZones
                                    });
                                  }}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Max °C</Label>
                                <Input
                                  type="number"
                                  value={zone.targetTemp.max}
                                  onChange={(e) => {
                                    const currentTracking = formData.temperatureTracking || {};
                                    const updatedZones = [...(currentTracking.zones || [])];
                                    updatedZones[index] = {
                                      ...zone,
                                      targetTemp: { ...zone.targetTemp, max: parseFloat(e.target.value) || 0 }
                                    };
                                    handleInputChange('temperatureTracking', {
                                      ...currentTracking,
                                      zones: updatedZones
                                    });
                                  }}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Alert Min</Label>
                                <Input
                                  type="number"
                                  value={zone.alertThresholds.critical}
                                  onChange={(e) => {
                                    const currentTracking = formData.temperatureTracking || {};
                                    const updatedZones = [...(currentTracking.zones || [])];
                                    updatedZones[index] = {
                                      ...zone,
                                      alertThresholds: { ...zone.alertThresholds, critical: parseFloat(e.target.value) || 0 }
                                    };
                                    handleInputChange('temperatureTracking', {
                                      ...currentTracking,
                                      zones: updatedZones
                                    });
                                  }}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Alert Max</Label>
                                <Input
                                  type="number"
                                  value={zone.alertThresholds.warning}
                                  onChange={(e) => {
                                    const currentTracking = formData.temperatureTracking || {};
                                    const updatedZones = [...(currentTracking.zones || [])];
                                    updatedZones[index] = {
                                      ...zone,
                                      alertThresholds: { ...zone.alertThresholds, warning: parseFloat(e.target.value) || 0 }
                                    };
                                    handleInputChange('temperatureTracking', {
                                      ...currentTracking,
                                      zones: updatedZones
                                    });
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Compliance Mode */}
                    <div>
                      <Label>Compliance Mode</Label>
                      <Select
                        value={formData.temperatureTracking?.complianceMode || 'basic'}
                        onValueChange={(value) => {
                          const currentTracking = formData.temperatureTracking || {};
                          handleInputChange('temperatureTracking', {
                            ...currentTracking,
                            complianceMode: value as any
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="basic">Basic Monitoring</SelectItem>
                          <SelectItem value="fda">FDA Compliant</SelectItem>
                          <SelectItem value="gmp">GMP (Good Manufacturing Practice)</SelectItem>
                          <SelectItem value="haccp">HACCP Compliant</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Alert Contacts */}
                    <div>
                      <Label>Alert Contacts (Email)</Label>
                      <Textarea
                        placeholder="Enter email addresses separated by commas"
                        value={(formData.temperatureTracking?.alertContacts || []).join(', ')}
                        onChange={(e) => {
                          const contacts = e.target.value.split(',').map(c => c.trim()).filter(c => c);
                          const currentTracking = formData.temperatureTracking || {};
                          handleInputChange('temperatureTracking', {
                            ...currentTracking,
                            alertContacts: contacts
                          });
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automation Configuration */}
        <TabsContent value="automation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Automation & Rules
              </CardTitle>
              <CardDescription>
                Configure automatic assignment rules and system automation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Auto Assignment Rules */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Auto Assignment Rules</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const currentRules = formData.schedulingRules?.autoAssignment?.rules || [];
                      const newRule = {
                        id: `rule-${Date.now()}`,
                        name: `Rule ${currentRules.length + 1}`,
                        condition: 'priority === "high"',
                        action: { type: 'assignZone' as const, zoneId: '', teamId: '' },
                        priority: 1,
                        enabled: true
                      };
                      const currentScheduling = formData.schedulingRules || {};
                      handleInputChange('schedulingRules', {
                        ...currentScheduling,
                        autoAssignment: {
                          ...currentScheduling.autoAssignment,
                          enabled: true,
                          rules: [...currentRules, newRule]
                        }
                      });
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Rule
                  </Button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {(formData.schedulingRules?.autoAssignment?.rules || []).map((rule, index) => (
                    <div key={rule.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Rule name"
                          value={rule.name}
                          className="flex-1"
                          onChange={(e) => {
                            const currentScheduling = formData.schedulingRules || {};
                            const currentAssignment = currentScheduling.autoAssignment || {};
                            const updatedRules = [...(currentAssignment.rules || [])];
                            updatedRules[index] = { ...rule, name: e.target.value };
                            handleInputChange('schedulingRules', {
                              ...currentScheduling,
                              autoAssignment: {
                                ...currentAssignment,
                                rules: updatedRules
                              }
                            });
                          }}
                        />
                        <Switch
                          checked={rule.isActive}
                          onCheckedChange={(checked) => {
                            const currentScheduling = formData.schedulingRules || {};
                            const currentAssignment = currentScheduling.autoAssignment || {};
                            const updatedRules = [...(currentAssignment.rules || [])];
                            updatedRules[index] = { ...rule, isActive: checked };
                            handleInputChange('schedulingRules', {
                              ...currentScheduling,
                              autoAssignment: {
                                ...currentAssignment,
                                rules: updatedRules
                              }
                            });
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const currentScheduling = formData.schedulingRules || {};
                            const currentAssignment = currentScheduling.autoAssignment || {};
                            const updatedRules = (currentAssignment.rules || []).filter((_, i) => i !== index);
                            handleInputChange('schedulingRules', {
                              ...currentScheduling,
                              autoAssignment: {
                                ...currentAssignment,
                                rules: updatedRules
                              }
                            });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div>
                        <Label className="text-xs">Condition (JavaScript)</Label>
                        <Textarea
                          placeholder="e.g., priority === 'high' && weight > 1000"
                          value={rule.condition}
                          onChange={(e) => {
                            const currentScheduling = formData.schedulingRules || {};
                            const currentAssignment = currentScheduling.autoAssignment || {};
                            const updatedRules = [...(currentAssignment.rules || [])];
                            updatedRules[index] = { ...rule, condition: e.target.value };
                            handleInputChange('schedulingRules', {
                              ...currentScheduling,
                              autoAssignment: {
                                ...currentAssignment,
                                rules: updatedRules
                              }
                            });
                          }}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label className="text-xs">Assign To</Label>
                          <Select
                            value={rule.assignTo}
                            onValueChange={(value) => {
                              const currentScheduling = formData.schedulingRules || {};
                              const currentAssignment = currentScheduling.autoAssignment || {};
                              const updatedRules = [...(currentAssignment.rules || [])];
                              updatedRules[index] = {
                                ...rule,
                                assignTo: value as 'zone' | 'door_group' | 'specific_door'
                              };
                              handleInputChange('schedulingRules', {
                                ...currentScheduling,
                                autoAssignment: {
                                  ...currentAssignment,
                                  rules: updatedRules
                                }
                              });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="zone">Zone</SelectItem>
                              <SelectItem value="door_group">Door Group</SelectItem>
                              <SelectItem value="specific_door">Specific Door</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs">Target</Label>
                          <Input
                            placeholder="Target ID"
                            value={rule.target || ''}
                            onChange={(e) => {
                              const currentScheduling = formData.schedulingRules || {};
                              const currentAssignment = currentScheduling.autoAssignment || {};
                              const updatedRules = [...(currentAssignment.rules || [])];
                              updatedRules[index] = {
                                ...rule,
                                target: e.target.value
                              };
                              handleInputChange('schedulingRules', {
                                ...currentScheduling,
                                autoAssignment: {
                                  ...currentAssignment,
                                  rules: updatedRules
                                }
                              });
                            }}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Priority</Label>
                          <Input
                            type="number"
                            value={rule.priority}
                            onChange={(e) => {
                              const currentScheduling = formData.schedulingRules || {};
                              const currentAssignment = currentScheduling.autoAssignment || {};
                              const updatedRules = [...(currentAssignment.rules || [])];
                              updatedRules[index] = { ...rule, priority: parseInt(e.target.value) || 1 };
                              handleInputChange('schedulingRules', {
                                ...currentScheduling,
                                autoAssignment: {
                                  ...currentAssignment,
                                  rules: updatedRules
                                }
                              });
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Load Balancing */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Automatic Load Balancing</Label>
                    <p className="text-sm text-muted-foreground">Balance workload across zones and teams</p>
                  </div>
                  <Switch
                    checked={formData.schedulingRules?.loadBalancing?.enabled || false}
                    onCheckedChange={(checked) => {
                      const currentScheduling = formData.schedulingRules || {};
                      handleInputChange('schedulingRules', {
                        ...currentScheduling,
                        loadBalancing: {
                          ...currentScheduling.loadBalancing,
                          enabled: checked
                        }
                      });
                    }}
                  />
                </div>

                {formData.schedulingRules?.loadBalancing?.enabled && (
                  <div className="ml-4 space-y-3 p-3 border-l-2 border-blue-200">
                    <div>
                      <Label>Balancing Strategy</Label>
                      <Select
                        value={formData.schedulingRules?.loadBalancing?.method || 'even-distribution'}
                        onValueChange={(value) => {
                          const currentScheduling = formData.schedulingRules || {};
                          handleInputChange('schedulingRules', {
                            ...currentScheduling,
                            loadBalancing: {
                              ...currentScheduling.loadBalancing,
                              method: value as 'even-distribution' | 'capacity-based' | 'priority-weighted'
                            }
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="even-distribution">Even Distribution</SelectItem>
                          <SelectItem value="capacity-based">Capacity Based</SelectItem>
                          <SelectItem value="priority-weighted">Priority Weighted</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Keep existing Branding and Preview tabs here */}
        {/* I'll continue with these in the next part */}
      </Tabs>
    </div>
  );
};

// Helper function for feature descriptions
const getFeatureDescription = (featureName: string): string => {
  const descriptions: Record<string, string> = {
    voiceCommands: 'Enable voice control for hands-free operation',
    palletTracking: 'Track pallet counts and export data',
    tcrManagement: 'Manage TCR (Transportation Control Receipt) documents',
    multiShift: 'Support for multiple shift configurations',
    barcodeScanning: 'Enable barcode scanning capabilities'
  };

  return descriptions[featureName] || 'Enable this feature';
};

export default Settings;