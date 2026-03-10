import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  connectionType: string | null;
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: true, // Assume online initially
    connectionType: null,
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setStatus({
        isOnline: state.isConnected ?? true,
        connectionType: state.type,
      });
    });

    return () => unsubscribe();
  }, []);

  return status;
}
