import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@vibetech/ui";
import { Button } from "@vibetech/ui";
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, Shield, Info, ExternalLink } from 'lucide-react';
import type { SettingsTabProps } from './types';

export function PreviewTab({ formData }: SettingsTabProps) {
  return (
    <div className="space-y-6">
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
    </div>
  );
}
