import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@vibetech/ui";
import { Input } from "@vibetech/ui";
import { Label } from '@/components/ui/label';
import { Palette } from 'lucide-react';
import type { SettingsTabProps } from './types';

export function BrandingTab({ formData, handleNestedInputChange }: SettingsTabProps) {
  return (
    <div className="space-y-6">
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
    </div>
  );
}
