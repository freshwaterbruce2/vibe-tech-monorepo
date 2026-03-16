 
// Warehouse Configuration System
// This allows the app to be customized for different businesses and warehouses

import { tenantApi } from '@/services/tenantApiService';

export interface WarehouseZone {
  id: string;
  name: string;
  type: 'receiving' | 'staging' | 'storage' | 'cross-dock' | 'shipping' | 'returns' | 'quality-control' | 'customs';
  temperature: 'ambient' | 'refrigerated' | 'frozen' | 'mixed' | 'controlled';
  doorRanges: { start: number; end: number }[];
  color: string;
  priority: number;
  capacity?: number;
  equipment?: string[];
  restrictions?: string[];
  autoAlert?: boolean;
}

export interface DoorGroup {
  id: string;
  name: string;
  doors: number[];
  type: 'inbound' | 'outbound' | 'bidirectional';
  zone?: string;
  equipment?: string[];
  maxPallets?: number;
  restrictions?: string[];
}

export interface ShiftPattern {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  days: number[]; // 0-6 (Sunday-Saturday)
  teams: string[];
  isDefault?: boolean;
  breakSchedules?: {
    name: string;
    start: string;
    duration: number; // minutes
  }[];
}

export interface StagingArea {
  id: string;
  name: string;
  zoneId: string;
  capacity: number;
  nearDoors: number[];
  autoAlert: boolean;
  maxStayTime?: number; // hours
  priority?: number;
}

export interface TemperatureZone {
  id: string;
  name: string;
  zoneId: string;
  targetTemp: { min: number; max: number };
  alertThresholds: { critical: number; warning: number };
  monitoringInterval: number; // minutes
  unit: 'F' | 'C';
  complianceRequired?: boolean;
}

export interface AutoAssignmentRule {
  id: string;
  name: string;
  condition: string; // JavaScript expression
  assignTo: 'zone' | 'door_group' | 'specific_door';
  target: string; // zone ID, group ID, or door number
  priority: number;
  isActive: boolean;
}

export interface WarehouseConfig {
  // Business Information
  companyName: string;
  warehouseName: string;
  warehouseCode: string;
  warehouseType: 'distribution' | 'fulfillment' | '3pl' | 'manufacturing' | 'cold-storage' | 'cross-dock' | 'retail' | 'mixed';
  location: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    timezone?: string;
  };

  // App Configuration
  appName: string;
  appShortName: string;
  appDescription: string;

  // Branding
  brandColors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };

  // Basic Business Logic Configuration
  destinationDCs: string[];
  freightTypes: string[];
  doorNumberRange: {
    min: number;
    max: number;
  };

  // Advanced Layout & Zones Configuration
  warehouseLayout: {
    type: 'U-shaped' | 'I-shaped' | 'L-shaped' | 'Cross' | 'Custom';
    totalSquareFeet?: number;
    zones: WarehouseZone[];
    doorGroups: DoorGroup[];
    hasElevatedDocks?: boolean;
    hasRailAccess?: boolean;
  };

  // Door Configuration
  doorConfiguration: {
    namingPattern: 'numeric' | 'alphanumeric' | 'custom';
    customNames: Record<number, string>; // e.g., {332: "Bay A1"}
    defaultCapabilities: {
      maxPallets: number;
      equipment: string[]; // 'forklift', 'conveyor', 'ramp', 'dock-leveler'
      restrictions: string[]; // 'hazmat', 'oversized', 'refrigerated', 'frozen'
    };
    perDoorOverrides: Record<number, {
      maxPallets?: number;
      equipment?: string[];
      restrictions?: string[];
      isActive?: boolean;
    }>;
  };

  // Shift & Team Management
  shiftConfiguration: {
    enabled: boolean;
    patterns: ShiftPattern[];
    autoShiftChange: boolean;
    shiftHandoffRequired: boolean;
    defaultShiftId?: string;
    overtimeThreshold?: number; // hours
    teams: {
      id: string;
      name: string;
      color: string;
      permissions: string[];
    }[];
  };

  // Cross-Docking & Staging
  operationalModes: {
    crossDocking: {
      enabled: boolean;
      maxTransferTime: number; // hours
      stagingZones: string[]; // zone IDs
      priorityRules: 'FIFO' | 'LIFO' | 'priority-based' | 'custom';
      autoRouting: boolean;
    };
    stagingAreas: StagingArea[];
    qualityControl: {
      enabled: boolean;
      requiredForZones: string[];
      maxInspectionTime: number; // hours
    };
  };

  // Temperature & Compliance
  temperatureTracking: {
    enabled: boolean;
    zones: TemperatureZone[];
    complianceMode: 'FDA' | 'HACCP' | 'GMP' | 'USDA' | 'Custom' | 'None';
    auditLog: boolean;
    alertContacts: string[];
    continuousMonitoring: boolean;
  };

  // Smart Scheduling & Routing
  schedulingRules: {
    priorityLevels: string[]; // ['urgent', 'high', 'normal', 'low']
    routingOptimization: boolean;
    autoAssignment: {
      enabled: boolean;
      rules: AutoAssignmentRule[];
    };
    loadBalancing: {
      enabled: boolean;
      method: 'even-distribution' | 'capacity-based' | 'priority-weighted';
    };
    timeSlotManagement: {
      enabled: boolean;
      slotDuration: number; // minutes
      advanceBooking: boolean;
      maxAdvanceDays?: number;
    };
  };

  // Integration Settings
  integrations: {
    wms: {
      enabled: boolean;
      provider?: string;
      apiEndpoint?: string;
      syncInterval?: number; // minutes
    };
    tms: {
      enabled: boolean;
      provider?: string;
      autoDispatch?: boolean;
    };
    edi: {
      enabled: boolean;
      transactions: string[]; // ['856', '810', '204', etc.]
    };
    temperatureMonitoring: {
      enabled: boolean;
      provider?: string;
      alertWebhook?: string;
    };
  };

  // Feature Toggles (Enhanced)
  features: {
    voiceCommands: boolean;
    palletTracking: boolean;
    tcrManagement: boolean;
    multiShift: boolean;
    barcodeScanning: boolean;
    zoneManagement: boolean;
    temperatureTracking: boolean;
    crossDocking: boolean;
    autoRouting: boolean;
    realTimeAlerts: boolean;
    auditTrail: boolean;
    performanceAnalytics: boolean;
    mobileOptimization: boolean;
    offlineMode: boolean;
  };

  // Voice Command Configuration (Enhanced)
  voiceCommands?: {
    doorTerms: string[];
    dcTerms: string[];
    zoneTerms: string[];
    customCommands: {
      pattern: string;
      action: string;
      description: string;
      parameters?: string[];
    }[];
    contextAware: boolean;
    multiLanguage?: {
      enabled: boolean;
      languages: string[];
      defaultLanguage: string;
    };
  };

  // Analytics & Reporting
  analytics: {
    enabled: boolean;
    retentionDays: number;
    realTimeMetrics: string[]; // ['throughput', 'utilization', 'efficiency', etc.]
    scheduledReports: {
      name: string;
      frequency: 'daily' | 'weekly' | 'monthly';
      recipients: string[];
      metrics: string[];
    }[];
    dashboardConfig: {
      kpis: string[];
      chartTypes: Record<string, string>;
      autoRefresh: boolean;
      refreshInterval: number; // seconds
    };
  };
}

// Default Walmart DC 8980 Configuration
export const defaultWarehouseConfig: WarehouseConfig = {
  companyName: "Walmart Inc.",
  warehouseName: "Distribution Center 8980",
  warehouseCode: "DC8980",
  warehouseType: "distribution",
  location: {
    address: "123 Warehouse Blvd",
    city: "Distribution City",
    state: "TX",
    zipCode: "75001",
    timezone: "America/Chicago"
  },

  appName: "DC8980 Shipping Department",
  appShortName: "DC8980 Shipping",
  appDescription: "Door scheduling and pallet tracking system for Walmart DC 8980",

  brandColors: {
    primary: "#0071CE",
    secondary: "#FFC220",
    accent: "#004C91",
    background: "#FFFFFF",
    text: "#333333"
  },

  destinationDCs: ["6024", "6070", "6039", "6040", "7045"],
  freightTypes: ["23/43", "28", "XD", "AIB"],
  doorNumberRange: {
    min: 332,
    max: 454
  },

  // Advanced Layout & Zones Configuration
  warehouseLayout: {
    type: "U-shaped",
    totalSquareFeet: 500000,
    zones: [
      {
        id: "zone_receiving",
        name: "Receiving",
        type: "receiving",
        temperature: "ambient",
        doorRanges: [{ start: 332, end: 350 }],
        color: "#10B981",
        priority: 1,
        capacity: 100,
        equipment: ["forklift", "conveyor"],
        autoAlert: true
      },
      {
        id: "zone_shipping",
        name: "Shipping",
        type: "shipping",
        temperature: "ambient",
        doorRanges: [{ start: 400, end: 454 }],
        color: "#3B82F6",
        priority: 1,
        capacity: 150,
        equipment: ["forklift", "dock-leveler"],
        autoAlert: true
      }
    ],
    doorGroups: [
      {
        id: "group_inbound",
        name: "Inbound Doors",
        doors: [332, 333, 334, 335, 336, 337, 338, 339, 340],
        type: "inbound",
        zone: "zone_receiving",
        equipment: ["forklift", "conveyor"],
        maxPallets: 26
      },
      {
        id: "group_outbound",
        name: "Outbound Doors",
        doors: [400, 401, 402, 403, 404, 405, 410, 420, 430, 440, 450, 451, 452, 453, 454],
        type: "outbound",
        zone: "zone_shipping",
        equipment: ["forklift", "dock-leveler"],
        maxPallets: 28
      }
    ],
    hasElevatedDocks: true,
    hasRailAccess: false
  },

  // Door Configuration
  doorConfiguration: {
    namingPattern: "numeric",
    customNames: {},
    defaultCapabilities: {
      maxPallets: 26,
      equipment: ["forklift", "dock-leveler"],
      restrictions: []
    },
    perDoorOverrides: {}
  },

  // Shift & Team Management
  shiftConfiguration: {
    enabled: false,
    patterns: [
      {
        id: "shift_day",
        name: "Day Shift",
        startTime: "06:00",
        endTime: "14:00",
        days: [1, 2, 3, 4, 5], // Monday-Friday
        teams: ["team_day"],
        isDefault: true,
        breakSchedules: [
          { name: "Morning Break", start: "09:00", duration: 15 },
          { name: "Lunch", start: "12:00", duration: 30 }
        ]
      }
    ],
    autoShiftChange: false,
    shiftHandoffRequired: false,
    overtimeThreshold: 8,
    teams: [
      {
        id: "team_day",
        name: "Day Team",
        color: "#3B82F6",
        permissions: ["door_entry", "pallet_tracking"]
      }
    ]
  },

  // Cross-Docking & Staging
  operationalModes: {
    crossDocking: {
      enabled: false,
      maxTransferTime: 24,
      stagingZones: [],
      priorityRules: "FIFO",
      autoRouting: false
    },
    stagingAreas: [],
    qualityControl: {
      enabled: false,
      requiredForZones: [],
      maxInspectionTime: 2
    }
  },

  // Temperature & Compliance
  temperatureTracking: {
    enabled: false,
    zones: [],
    complianceMode: "None",
    auditLog: false,
    alertContacts: [],
    continuousMonitoring: false
  },

  // Smart Scheduling & Routing
  schedulingRules: {
    priorityLevels: ["urgent", "high", "normal", "low"],
    routingOptimization: false,
    autoAssignment: {
      enabled: false,
      rules: []
    },
    loadBalancing: {
      enabled: false,
      method: "even-distribution"
    },
    timeSlotManagement: {
      enabled: false,
      slotDuration: 30,
      advanceBooking: false
    }
  },

  // Integration Settings
  integrations: {
    wms: {
      enabled: false
    },
    tms: {
      enabled: false
    },
    edi: {
      enabled: false,
      transactions: []
    },
    temperatureMonitoring: {
      enabled: false
    }
  },

  // Enhanced Feature Toggles
  features: {
    voiceCommands: true,
    palletTracking: true,
    tcrManagement: true,
    multiShift: false,
    barcodeScanning: false,
    zoneManagement: false,
    temperatureTracking: false,
    crossDocking: false,
    autoRouting: false,
    realTimeAlerts: false,
    auditTrail: false,
    performanceAnalytics: false,
    mobileOptimization: true,
    offlineMode: true
  },

  // Analytics & Reporting
  analytics: {
    enabled: false,
    retentionDays: 90,
    realTimeMetrics: ["throughput", "utilization", "efficiency"],
    scheduledReports: [],
    dashboardConfig: {
      kpis: ["doors_active", "pallets_processed", "avg_turnaround"],
      chartTypes: {
        "throughput": "line",
        "utilization": "bar",
        "efficiency": "gauge"
      },
      autoRefresh: true,
      refreshInterval: 30
    }
  },
  
  voiceCommands: {
    doorTerms: ["door", "dock", "bay", "trailer", "spot"],
    dcTerms: ["dc", "distribution center", "destination"],
    zoneTerms: ["zone", "area", "section", "region"],
    customCommands: [
      {
        pattern: "emergency door",
        action: "add_priority_door",
        description: "Adds high-priority door entry",
        parameters: ["doorNumber"]
      }
    ],
    contextAware: true,
    multiLanguage: {
      enabled: false,
      languages: ["en-US"],
      defaultLanguage: "en-US"
    }
  }
};

// Configuration management functions
class WarehouseConfigManager {
  private static instance: WarehouseConfigManager;
  private config: WarehouseConfig;
  private isLoadingFromApi = false;
  private listeners = new Set<() => void>();

  private constructor() {
    this.config = this.loadConfig();
    this.loadFromApiIfAuthenticated();
  }

  public static getInstance(): WarehouseConfigManager {
    if (!WarehouseConfigManager.instance) {
      WarehouseConfigManager.instance = new WarehouseConfigManager();
    }
    return WarehouseConfigManager.instance;
  }

  public addListener(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => callback());
  }

  private loadConfig(): WarehouseConfig {
    try {
      const savedConfig = window.electronAPI?.store.get('warehouse-config');
      if (savedConfig) {
        return { ...defaultWarehouseConfig, ...JSON.parse(savedConfig) };
      }
    } catch (error) {
      console.warn('Failed to load warehouse config from localStorage:', error);
    }
    return defaultWarehouseConfig;
  }

  private async loadFromApiIfAuthenticated(): Promise<void> {
    if (!tenantApi.isAuthenticated() || this.isLoadingFromApi) {
      return;
    }

    this.isLoadingFromApi = true;

    try {
      console.warn('Loading warehouse config from tenant API...');
      const response = await tenantApi.getTenantConfig();

      if (response.success && response.config) {
        // Merge API config with default features to ensure compatibility
        const apiConfig = {
          ...defaultWarehouseConfig,
          ...response.config,
          features: {
            ...defaultWarehouseConfig.features,
            ...response.config.features
          }
        };

        this.config = apiConfig;
        console.warn('Successfully loaded config from tenant API:', response.tenant.name);
        this.notifyListeners();
      }
    } catch (error) {
      console.warn('Failed to load config from tenant API, using local config:', error);
      // If API fails, keep using local config - don't throw error
    } finally {
      this.isLoadingFromApi = false;
    }
  }

  public async refreshFromApi(): Promise<void> {
    await this.loadFromApiIfAuthenticated();
  }
  
  public getConfig(): WarehouseConfig {
    return this.config;
  }
  
  public async updateConfig(updates: Partial<WarehouseConfig>): Promise<void> {
    this.config = { ...this.config, ...updates };
    this.saveConfig();

    // If authenticated with tenant API, also update there
    if (tenantApi.isAuthenticated()) {
      try {
        console.warn('Updating tenant config via API...');
        await tenantApi.updateTenantConfig(this.config);
        console.warn('Successfully updated tenant config via API');
      } catch (error) {
        console.warn('Failed to update tenant config via API:', error);
        // Continue anyway - local update succeeded
      }
    }

    this.notifyListeners();
  }

  public async resetToDefault(): Promise<void> {
    this.config = { ...defaultWarehouseConfig };
    this.saveConfig();

    // If authenticated with tenant API, also update there
    if (tenantApi.isAuthenticated()) {
      try {
        console.warn('Resetting tenant config to default via API...');
        await tenantApi.updateTenantConfig(this.config);
        console.warn('Successfully reset tenant config via API');
      } catch (error) {
        console.warn('Failed to reset tenant config via API:', error);
        // Continue anyway - local reset succeeded
      }
    }

    this.notifyListeners();
  }

  private saveConfig(): void {
    try {
      window.electronAPI?.store.set('warehouse-config', JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save warehouse config to localStorage:', error);
    }
  }
  
  // Utility methods for common operations
  public getAppName(): string {
    return this.config.appName;
  }
  
  public getCompanyName(): string {
    return this.config.companyName;
  }
  
  public getWarehouseName(): string {
    return this.config.warehouseName;
  }
  
  public getDestinationDCs(): string[] {
    return this.config.destinationDCs;
  }
  
  public getFreightTypes(): string[] {
    return this.config.freightTypes;
  }
  
  public getDoorRange(): { min: number; max: number } {
    return this.config.doorNumberRange;
  }
  
  public isFeatureEnabled(feature: keyof WarehouseConfig['features']): boolean {
    return this.config.features[feature];
  }
  
  public getBrandColors(): WarehouseConfig['brandColors'] {
    return this.config.brandColors;
  }
}

// Export singleton instance
export const warehouseConfig = WarehouseConfigManager.getInstance();

// Hook for React components
import { useState, useEffect } from 'react';

export const useWarehouseConfig = () => {
  const [config, setConfig] = useState<WarehouseConfig>(warehouseConfig.getConfig());

  useEffect(() => {
    // Subscribe to config changes
    const unsubscribe = warehouseConfig.addListener(() => {
      setConfig(warehouseConfig.getConfig());
    });

    return unsubscribe;
  }, []);

  return {
    config,
    updateConfig: async (updates: Partial<WarehouseConfig>) => {
      await warehouseConfig.updateConfig(updates);
    },
    resetConfig: async () => {
      await warehouseConfig.resetToDefault();
    },
    refreshFromApi: async () => {
      await warehouseConfig.refreshFromApi();
    },
    isFeatureEnabled: (feature: keyof WarehouseConfig['features']) => {
      return warehouseConfig.isFeatureEnabled(feature);
    },
    isAuthenticated: () => tenantApi.isAuthenticated()
  };
};