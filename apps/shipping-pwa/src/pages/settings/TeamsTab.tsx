import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@vibetech/ui";
import { Button } from "@vibetech/ui";
import { Input } from "@vibetech/ui";
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Users, Plus, Trash2 } from 'lucide-react';
import type { SettingsTabProps } from './types';

export function TeamsTab({ formData, handleInputChange }: SettingsTabProps) {
  return (
    <div className="space-y-6">
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
    </div>
  );
}
