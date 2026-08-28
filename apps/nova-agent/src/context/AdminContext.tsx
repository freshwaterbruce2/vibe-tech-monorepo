import { Store } from '@tauri-apps/plugin-store';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

interface AdminSession {
  authenticated: boolean;
  expiresAt: number;
}

interface AdminContextType {
  isAdmin: boolean;
  isLoading: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAdminStatus: () => boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

const SESSION_KEY = 'vibetech_admin_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours

function getExpectedPassword(): string | undefined {
  return import.meta.env.VITE_ADMIN_PASSWORD_HASH as string | undefined;
}

function verifyPassword(password: string): boolean {
  const expected = getExpectedPassword();
  if (expected) {
    return password === expected;
  }
  // Dev fallback only when no env hash is configured.
  if (import.meta.env.DEV) {
    return password === 'vibe2026admin';
  }
  return false;
}

function isValidSession(session: unknown): session is AdminSession {
  if (typeof session !== 'object' || session === null) return false;
  const s = session as Record<string, unknown>;
  return s.authenticated === true && typeof s.expiresAt === 'number' && s.expiresAt > Date.now();
}

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [store, setStore] = useState<Store | null>(null);

  useEffect(() => {
    const initStore = async () => {
      try {
        const newStore = await Store.load('store.json');
        setStore(newStore);

        const rawSession = await newStore.get<unknown>(SESSION_KEY);
        if (isValidSession(rawSession)) {
          setIsAdmin(true);
        } else if (rawSession !== null) {
          // Clear stale or malformed session.
          await newStore.delete(SESSION_KEY);
          await newStore.save();
        }
      } catch (error) {
        console.error('Failed to initialize store:', error);
      } finally {
        setIsLoading(false);
      }
    };

    void initStore();
  }, []);

  const login = useCallback(
    async (password: string): Promise<boolean> => {
      if (verifyPassword(password)) {
        setIsAdmin(true);
        if (store) {
          try {
            const session: AdminSession = {
              authenticated: true,
              expiresAt: Date.now() + SESSION_TTL_MS,
            };
            await store.set(SESSION_KEY, session);
            await store.save();
          } catch (error) {
            console.error('Failed to save session:', error);
          }
        }
        return true;
      }
      return false;
    },
    [store],
  );

  const logout = useCallback(async () => {
    setIsAdmin(false);
    if (store) {
      try {
        await store.delete(SESSION_KEY);
        await store.save();
      } catch (error) {
        console.error('Failed to clear session:', error);
      }
    }
  }, [store]);

  const checkAdminStatus = useCallback((): boolean => {
    return isAdmin;
  }, [isAdmin]);

  const value = useMemo(
    () => ({ isAdmin, isLoading, login, logout, checkAdminStatus }),
    [isAdmin, isLoading, login, logout, checkAdminStatus],
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAdmin = (): AdminContextType => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
