import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@vibetech/ui";
import { Button } from "@vibetech/ui";
import { Input } from "@vibetech/ui";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Thermometer, Plus, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SettingsTabProps } from './types';

export function EnvironmentTab({ formData, handleInputChange }: SettingsTabProps) {
  return (
    <div className="space-y-6">
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
    </div>
  );
}
