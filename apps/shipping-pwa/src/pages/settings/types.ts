import type { WarehouseConfig } from '@/config/warehouse';

export interface SettingsTabProps {
  formData: WarehouseConfig;
  handleInputChange: (field: keyof WarehouseConfig, value: any) => void;
  handleNestedInputChange: (parentField: keyof WarehouseConfig, childField: string, value: any) => void;
}

export const getFeatureDescription = (featureName: string): string => {
  const descriptions: Record<string, string> = {
    voiceCommands: 'Enable voice control for hands-free operation',
    palletTracking: 'Track pallet counts and export data',
    tcrManagement: 'Manage TCR (Transportation Control Receipt) documents',
    multiShift: 'Support for multiple shift configurations',
    barcodeScanning: 'Enable barcode scanning capabilities'
  };

  return descriptions[featureName] || 'Enable this feature';
};
