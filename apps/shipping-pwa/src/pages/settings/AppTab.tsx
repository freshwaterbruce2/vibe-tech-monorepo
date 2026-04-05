import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@vibetech/ui";
import { Input } from "@vibetech/ui";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Smartphone } from 'lucide-react';
import type { SettingsTabProps } from './types';

function getFeatureDescription(featureName: string): string {
  const descriptions: Record<string, string> = {
    voiceCommands: 'Enable voice control for hands-free operation',
    palletTracking: 'Track pallet counts and export data',
    tcrManagement: 'Manage TCR (Transportation Control Receipt) documents',
    multiShift: 'Support for multiple shift configurations',
    barcodeScanning: 'Enable barcode scanning capabilities'
  };

  return descriptions[featureName] || 'Enable this feature';
}

export function AppTab({ formData, handleInputChange, handleNestedInputChange }: SettingsTabProps) {
  return (
    <div className="space-y-6">
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
    </div>
  );
}
