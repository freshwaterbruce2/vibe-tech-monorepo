import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@vibetech/ui";
import { Button } from "@vibetech/ui";
import { Input } from "@vibetech/ui";
import { Label } from '@/components/ui/label';
import { Layout, Plus, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SettingsTabProps } from './types';

export function LayoutTab({ formData, handleInputChange, handleNestedInputChange }: SettingsTabProps) {
  return (
    <div className="space-y-6">
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
    </div>
  );
}
