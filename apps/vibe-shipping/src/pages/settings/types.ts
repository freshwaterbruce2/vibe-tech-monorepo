import type { WarehouseConfig } from '@/config/warehouse';

export interface SettingsTabProps {
  formData: WarehouseConfig;
  handleInputChange: (field: keyof WarehouseConfig, value: any) => void;
  handleNestedInputChange: (parentField: keyof WarehouseConfig, childField: string, value: any) => void;
}

export type { WarehouseConfig };
