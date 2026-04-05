import type { FeatureFlag } from '@vibetech/feature-flags-core';
import { SQLiteStorage } from '../storage/sqlite.js';

export class FlagService {
  private storage: SQLiteStorage;
  private onFlagChange?: (flag: FeatureFlag, action: string) => void;

  constructor(storage: SQLiteStorage) {
    this.storage = storage;
  }

  setChangeListener(listener: (flag: FeatureFlag, action: string) => void): void {
    this.onFlagChange = listener;
  }

  getAllFlags(): FeatureFlag[] {
    return this.storage.getAllFlags();
  }

  getFlagByKey(key: string): FeatureFlag | null {
    return this.storage.getFlagByKey(key);
  }

  getFlagById(id: string): FeatureFlag | null {
    return this.storage.getFlagById(id);
  }

  createFlag(data: Omit<FeatureFlag, 'id' | 'createdAt' | 'updatedAt'>): FeatureFlag {
    const flag: FeatureFlag = {
      ...data,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const created = this.storage.createFlag(flag);
    this.onFlagChange?.(created, 'created');
    return created;
  }

  updateFlag(id: string, updates: Partial<FeatureFlag>, changedBy = 'system'): FeatureFlag | null {
    const updated = this.storage.updateFlag(id, updates, changedBy);
    if (updated) {
      this.onFlagChange?.(updated, 'updated');
    }
    return updated;
  }

  deleteFlag(id: string, deletedBy = 'system'): boolean {
    const flag = this.getFlagById(id);
    const deleted = this.storage.deleteFlag(id, deletedBy);
    if (deleted && flag) {
      this.onFlagChange?.(flag, 'deleted');
    }
    return deleted;
  }

  toggleFlag(id: string, enabled: boolean, changedBy = 'system'): FeatureFlag | null {
    const flag = this.storage.setFlagEnabled(id, enabled, changedBy);
    if (flag) {
      this.onFlagChange?.(flag, enabled ? 'enabled' : 'disabled');
    }
    return flag;
  }

  getAuditLog(flagId?: string, limit = 100): any[] {
    return this.storage.getAuditLog(flagId, limit);
  }

  private generateId(): string {
    return `ff_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
  }
}