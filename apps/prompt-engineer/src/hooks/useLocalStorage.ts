import { useCallback, useEffect, useState } from 'react';

interface ElectronStoreAPI {
  store: {
    getItem: (k: string) => string | null;
    setItem: (k: string, v: string) => void;
  };
}

function getElectronAPI(): ElectronStoreAPI | undefined {
  return (window as Window & typeof globalThis & { electronAPI?: ElectronStoreAPI }).electronAPI;
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const api = getElectronAPI();
      const item = api ? api.store.getItem(key) : localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        setStoredValue((currentValue) => {
          const valueToStore = value instanceof Function ? value(currentValue) : value;
          const api = getElectronAPI();
          if (api) {
            api.store.setItem(key, JSON.stringify(valueToStore));
          } else {
            localStorage.setItem(key, JSON.stringify(valueToStore));
          }
          return valueToStore;
        });
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
    },
    [key],
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
