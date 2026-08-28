import type { AuthUser } from '@vibetech/auth';

import { logger } from './Logger';

export interface UserWithPlan extends AuthUser {
  plan: string;
}

class AuthService {
  private currentUser: UserWithPlan | null = null;
  private listeners: Set<(user: UserWithPlan | null) => void> = new Set();

  async init(): Promise<UserWithPlan | null> {
    try {
      const res = await fetch('http://localhost:5004/api/auth/me', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ok && data.user) {
          this.currentUser = data.user;
          this.notify();
          return this.currentUser;
        }
      }
    } catch (err) {
      logger.error('[AuthService] Init error:', err);
    }
    this.currentUser = null;
    this.notify();
    return null;
  }

  async login(email: string, password: string): Promise<UserWithPlan | null> {
    const res = await fetch('http://localhost:5004/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Login failed');
    }

    const data = await res.json();
    if (data.ok && data.user) {
      this.currentUser = data.user;
      this.notify();
      return this.currentUser;
    }
    throw new Error('Invalid response');
  }

  async register(
    email: string,
    password: string,
    fullName?: string,
    companyName?: string,
  ): Promise<UserWithPlan | null> {
    const res = await fetch('http://localhost:5004/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, fullName, companyName }),
      credentials: 'include',
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Registration failed');
    }

    const data = await res.json();
    if (data.ok && data.user) {
      this.currentUser = data.user;
      this.notify();
      return this.currentUser;
    }
    throw new Error('Invalid response');
  }

  async logout(): Promise<void> {
    try {
      await fetch('http://localhost:5004/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      logger.error('[AuthService] Logout error:', err);
    }
    this.currentUser = null;
    this.notify();
  }

  getCurrentUser(): UserWithPlan | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return !!this.currentUser;
  }

  subscribe(listener: (user: UserWithPlan | null) => void): () => void {
    this.listeners.add(listener);
    listener(this.currentUser);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.currentUser);
    }
  }
}

export const authService = new AuthService();
