import { useCallback, useEffect, useState } from 'react';

interface ElectronStoreAPI {
  store: {
    getItem: (k: string) => string | null;
    setItem: (k: string, v: string) => void;
  };
}

function getElectronAPI(): ElectronStoreAPI | undefined {
  const win = window as any;
  return win.electronAPI as ElectronStoreAPI | undefined;
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const api = getElectronAPI();
      // eslint-disable-next-line electron-security/no-localstorage-electron -- browser fallback
      const item = api ? api.store.getItem(key) : localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        const api = getElectronAPI();
        if (api) {
          api.store.setItem(key, JSON.stringify(valueToStore));
        } else {
          // eslint-disable-next-line electron-security/no-localstorage-electron -- browser fallback
          localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
    },
    [key, storedValue],
  );

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch {
          // Ignore parse errors
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [storedValue, setValue];
}
