/**
 * Admin User Types
 * Extracted from server.ts (lines 16-28)
 */

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: 'superadmin' | 'admin';
  permissions: string[];
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAuthRequest {
  username: string;
  password: string;
}

export interface AdminAuthResponse {
  success: boolean;
  token?: string;
  admin?: {
    id: string;
    username: string;
    email: string;
    role: string;
    permissions: string[];
  };
  error?: string;
}

export interface AdminSession {
  token: string;
  adminId: string;
  expiresAt: string;
}
