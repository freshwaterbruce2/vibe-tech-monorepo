import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@vibetech/ui";
import { Button } from "@vibetech/ui";
import { Input } from "@vibetech/ui";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from "@vibetech/ui";
import { Plus, X, Save, RotateCcw } from 'lucide-react';
import { useWarehouseConfig, WarehouseConfig } from '@/config/warehouse';
import { toast } from 'sonner';

const WarehouseSetup = () => {
  const { config, updateConfig, resetConfig } = useWarehouseConfig();
  const [formData, setFormData] = useState<WarehouseConfig>(config);
  const [newDC, setNewDC] = useState('');
  const [newFreightType, setNewFreightType] = useState('');

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

  const addDestinationDC = () => {
    if (newDC.trim() && !formData.destinationDCs.includes(newDC.trim())) {
      setFormData(prev => ({
        ...prev,
        destinationDCs: [...prev.destinationDCs, newDC.trim()]
      }));
      setNewDC('');
    }
  };

  const removeDestinationDC = (dcToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      destinationDCs: prev.destinationDCs.filter(dc => dc !== dcToRemove)
    }));
  };

  const addFreightType = () => {
    if (newFreightType.trim() && !formData.freightTypes.includes(newFreightType.trim())) {
      setFormData(prev => ({
        ...prev,
        freightTypes: [...prev.freightTypes, newFreightType.trim()]
      }));
      setNewFreightType('');
    }
  };

  const removeFreightType = (typeToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      freightTypes: prev.freightTypes.filter(type => type !== typeToRemove)
    }));
  };

  const handleSave = () => {
    updateConfig(formData);
    toast.success('Warehouse configuration saved successfully!');
  };

  const handleReset = () => {
    resetConfig();
    setFormData(config);
    toast.info('Configuration reset to defaults');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Warehouse Setup</h1>
          <p className="text-muted-foreground">Configure your warehouse settings and branding</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Defaults
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Configuration
          </Button>
        </div>
      </div>

      {/* Business Information */}
      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
          <CardDescription>Basic company and warehouse details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                placeholder="Enter company name"
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

          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.location.address}
              onChange={(e) => handleNestedInputChange('location', 'address', e.target.value)}
              placeholder="Enter address"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.location.city}
                onChange={(e) => handleNestedInputChange('location', 'city', e.target.value)}
                placeholder="City"
              />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.location.state}
                onChange={(e) => handleNestedInputChange('location', 'state', e.target.value)}
                placeholder="State"
              />
            </div>
            <div>
              <Label htmlFor="zipCode">ZIP Code</Label>
              <Input
                id="zipCode"
                value={formData.location.zipCode}
                onChange={(e) => handleNestedInputChange('location', 'zipCode', e.target.value)}
                placeholder="ZIP"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* App Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>App Configuration</CardTitle>
          <CardDescription>Application name and description settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="appName">App Name</Label>
            <Input
              id="appName"
              value={formData.appName}
              onChange={(e) => handleInputChange('appName', e.target.value)}
              placeholder="Enter app name"
            />
          </div>
          <div>
            <Label htmlFor="appShortName">App Short Name</Label>
            <Input
              id="appShortName"
              value={formData.appShortName}
              onChange={(e) => handleInputChange('appShortName', e.target.value)}
              placeholder="Enter short name for mobile"
            />
          </div>
          <div>
            <Label htmlFor="appDescription">App Description</Label>
            <Textarea
              id="appDescription"
              value={formData.appDescription}
              onChange={(e) => handleInputChange('appDescription', e.target.value)}
              placeholder="Enter app description"
            />
          </div>
        </CardContent>
      </Card>

      {/* Brand Colors */}
      <Card>
        <CardHeader>
          <CardTitle>Brand Colors</CardTitle>
          <CardDescription>Customize your app's color scheme</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(formData.brandColors).map(([colorName, colorValue]) => (
              <div key={colorName} className="space-y-2">
                <Label htmlFor={colorName} className="capitalize">
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
                    className="w-12 h-10 p-1 border rounded"
                  />
                  <Input
                    value={colorValue}
                    onChange={(e) =>
                      handleNestedInputChange('brandColors', colorName, e.target.value)
                    }
                    placeholder="#000000"
                    className="flex-1"
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Business Logic Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Business Logic</CardTitle>
          <CardDescription>Configure operational parameters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Door Number Range */}
          <div>
            <Label className="text-sm font-medium">Door Number Range</Label>
            <div className="flex gap-4 mt-2">
              <div>
                <Label htmlFor="doorMin">Minimum</Label>
                <Input
                  id="doorMin"
                  type="number"
                  value={formData.doorNumberRange.min}
                  onChange={(e) =>
                    handleNestedInputChange('doorNumberRange', 'min', parseInt(e.target.value))
                  }
                />
              </div>
              <div>
                <Label htmlFor="doorMax">Maximum</Label>
                <Input
                  id="doorMax"
                  type="number"
                  value={formData.doorNumberRange.max}
                  onChange={(e) =>
                    handleNestedInputChange('doorNumberRange', 'max', parseInt(e.target.value))
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Destination DCs */}
          <div>
            <Label className="text-sm font-medium">Destination Distribution Centers</Label>
            <div className="mt-2 space-y-2">
              <div className="flex gap-2">
                <Input
                  value={newDC}
                  onChange={(e) => setNewDC(e.target.value)}
                  placeholder="Add destination DC code"
                  onKeyPress={(e) => e.key === 'Enter' && addDestinationDC()}
                />
                <Button onClick={addDestinationDC} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.destinationDCs.map((dc) => (
                  <Badge key={dc} variant="secondary" className="flex items-center gap-1">
                    {dc}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeDestinationDC(dc)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* Freight Types */}
          <div>
            <Label className="text-sm font-medium">Freight Types</Label>
            <div className="mt-2 space-y-2">
              <div className="flex gap-2">
                <Input
                  value={newFreightType}
                  onChange={(e) => setNewFreightType(e.target.value)}
                  placeholder="Add freight type"
                  onKeyPress={(e) => e.key === 'Enter' && addFreightType()}
                />
                <Button onClick={addFreightType} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.freightTypes.map((type) => (
                  <Badge key={type} variant="secondary" className="flex items-center gap-1">
                    {type}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => removeFreightType(type)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Live Preview</CardTitle>
          <CardDescription>See how your configuration will look</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="p-4 rounded-lg text-white"
            style={{ backgroundColor: formData.brandColors.primary }}
          >
            <h2 className="text-xl font-bold">{formData.appName}</h2>
            <p className="text-sm opacity-90">{formData.appDescription}</p>
            <div className="mt-2 text-xs opacity-75">
              {formData.companyName} - {formData.warehouseName}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WarehouseSetup;