import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@vibetech/ui";
import { Input } from "@vibetech/ui";
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Building2 } from 'lucide-react';
import type { SettingsTabProps } from './types';

export function WarehouseTab({ formData, handleInputChange, handleNestedInputChange }: SettingsTabProps) {
  return (
    <div className="space-y-6">
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
    </div>
  );
}
