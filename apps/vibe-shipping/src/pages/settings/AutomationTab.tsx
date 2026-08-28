import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@vibetech/ui";
import { Button } from "@vibetech/ui";
import { Input } from "@vibetech/ui";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Zap, Plus, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { SettingsTabProps } from './types';

export function AutomationTab({ formData, handleInputChange }: SettingsTabProps) {
  return (
    <div className="space-y-6">
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
    </div>
  );
}
