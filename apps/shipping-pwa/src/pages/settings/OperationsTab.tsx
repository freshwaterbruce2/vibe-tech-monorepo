import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@vibetech/ui";
import { Button } from "@vibetech/ui";
import { Input } from "@vibetech/ui";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Boxes, Plus, Trash2 } from 'lucide-react';
import type { SettingsTabProps } from './types';

export function OperationsTab({ formData, handleInputChange }: SettingsTabProps) {
  return (
    <div className="space-y-6">
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
    </div>
  );
}
