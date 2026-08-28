import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import type { AdminUser, AdminAuthResponse } from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Admin Management Service
 * Handles admin user authentication, sessions, and permissions
 */
export class AdminManager {
  private adminsDir = path.join(__dirname, '..', '..', 'data', 'admins');
  private admins = new Map<string, AdminUser>();
  private sessions = new Map<string, { adminId: string; expiresAt: number }>();

  constructor() {
    this.ensureAdminDirectories();
    this.loadAdmins();
    this.initializeAdmin();
  }

  private async initializeAdmin() {
    await this.createDefaultSuperAdmin();
  }

  private ensureAdminDirectories() {
    if (!existsSync(this.adminsDir)) {
      mkdirSync(this.adminsDir, { recursive: true });
    }
  }

  private loadAdmins() {
    try {
      const adminsFile = path.join(this.adminsDir, 'admins.json');
      if (existsSync(adminsFile)) {
        const data = JSON.parse(readFileSync(adminsFile, 'utf8'));
        data.forEach((admin: AdminUser) => {
          this.admins.set(admin.id, admin);
        });
      }
    } catch (error) {
      console.error('Failed to load admin users:', error);
    }
  }

  private saveAdmins() {
    try {
      const adminsFile = path.join(this.adminsDir, 'admins.json');
      const data = Array.from(this.admins.values());
      writeFileSync(adminsFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to save admin users:', error);
      throw error;
    }
  }

  private async createDefaultSuperAdmin() {
    const superAdmins = Array.from(this.admins.values()).filter(admin => admin.role === 'superadmin');
    if (superAdmins.length === 0) {
      const defaultAdmin: AdminUser = {
        id: 'admin_superadmin_001',
        username: 'superadmin',
        email: 'admin@warehouse.system',
        passwordHash: await this.hashPassword('admin123!'),
        role: 'superadmin',
        permissions: ['*'],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.admins.set(defaultAdmin.id, defaultAdmin);
      this.saveAdmins();
      console.warn('Default superadmin created: username=superadmin. Please change the default password!');
    }
  }

  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  async authenticateAdmin(username: string, password: string): Promise<AdminAuthResponse> {
    try {
      const admin = Array.from(this.admins.values()).find(a =>
        a.username === username && a.isActive
      );

      if (!admin) {
        return { success: false, error: 'Invalid credentials' };
      }

      const isPasswordValid = await this.verifyPassword(password, admin.passwordHash);
      if (!isPasswordValid) {
        return { success: false, error: 'Invalid credentials' };
      }

      const token = this.generateSessionToken();
      const expiresAt = Date.now() + (24 * 60 * 60 * 1000);
      this.sessions.set(token, { adminId: admin.id, expiresAt });

      admin.lastLoginAt = new Date().toISOString();
      this.admins.set(admin.id, admin);
      this.saveAdmins();

      return {
        success: true,
        token,
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          role: admin.role,
          permissions: admin.permissions
        }
      };
    } catch (error) {
      console.error('Admin authentication error:', error);
      return { success: false, error: 'Authentication failed' };
    }
  }

  validateSession(token: string): AdminUser | null {
    const session = this.sessions.get(token);
    if (!session || session.expiresAt < Date.now()) {
      if (session) {
        this.sessions.delete(token);
      }
      return null;
    }

    return this.admins.get(session.adminId) || null;
  }

  logout(token: string): void {
    this.sessions.delete(token);
  }

  private generateSessionToken(): string {
    return crypto.randomBytes(48).toString('base64url');
  }

  cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [token, session] of this.sessions.entries()) {
      if (session.expiresAt < now) {
        this.sessions.delete(token);
      }
    }
  }

  hasPermission(admin: AdminUser, permission: string): boolean {
    if (admin.permissions.includes('*')) return true;
    return admin.permissions.includes(permission);
  }

  async createAdmin(adminData: Omit<AdminUser, 'id' | 'createdAt' | 'updatedAt' | 'passwordHash'> & { password: string }): Promise<AdminUser> {
    const id = `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const admin: AdminUser = {
      id,
      username: adminData.username,
      email: adminData.email,
      passwordHash: await this.hashPassword(adminData.password),
      role: adminData.role,
      permissions: adminData.permissions,
      isActive: adminData.isActive,
      createdAt: now,
      updatedAt: now
    };

    this.admins.set(id, admin);
    this.saveAdmins();
    return admin;
  }

  getAdmin(id: string): AdminUser | undefined {
    return this.admins.get(id);
  }

  getAllAdmins(): AdminUser[] {
    return Array.from(this.admins.values());
  }

  updateAdmin(id: string, updates: Partial<AdminUser>): AdminUser | undefined {
    const admin = this.admins.get(id);
    if (!admin) return undefined;

    const updatedAdmin = {
      ...admin,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.admins.set(id, updatedAdmin);
    this.saveAdmins();
    return updatedAdmin;
  }

  deactivateAdmin(id: string): boolean {
    const admin = this.admins.get(id);
    if (!admin) return false;

    admin.isActive = false;
    admin.updatedAt = new Date().toISOString();
    this.admins.set(id, admin);
    this.saveAdmins();
    return true;
  }
}

export const adminManager = new AdminManager();
