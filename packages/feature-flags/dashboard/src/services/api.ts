import axios from 'axios';
import type { KillSwitchConfig, TargetingRule, Variant } from '@vibetech/feature-flags-core';

const API_URL = 'http://localhost:3100/api';

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string;
  type: 'boolean' | 'percentage' | 'variant' | 'kill_switch';
  enabled: boolean;
  environments: Record<string, boolean>;
  rules: TargetingRule[];
  killSwitch?: KillSwitchConfig;
  variants?: Variant[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export const api = {
  getFlags: async (): Promise<FeatureFlag[]> => {
    const response = await axios.get(`${API_URL}/flags`);
    return response.data.flags; // Extract flags array from response
  },

  getFlag: async (id: string): Promise<FeatureFlag> => {
    const response = await axios.get(`${API_URL}/flags/${id}`);
    return response.data;
  },

  createFlag: async (flag: Partial<FeatureFlag>): Promise<FeatureFlag> => {
    const response = await axios.post(`${API_URL}/flags`, flag);
    return response.data;
  },

  updateFlag: async (id: string, updates: Partial<FeatureFlag>): Promise<FeatureFlag> => {
    const response = await axios.patch(`${API_URL}/flags/${id}`, updates);
    return response.data;
  },

  deleteFlag: async (id: string): Promise<void> => {
    await axios.delete(`${API_URL}/flags/${id}`);
  },

  toggleFlag: async (id: string, enabled: boolean): Promise<FeatureFlag> => {
    const response = await axios.post(`${API_URL}/flags/${id}/toggle`, { enabled });
    return response.data;
  },
};
