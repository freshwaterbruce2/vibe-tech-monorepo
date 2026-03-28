import { useCallback, useEffect, useState } from 'react';
import type { RemoteConnection } from '../types/remote';
import { remoteConnectionManager } from '../services/RemoteConnectionManager';

export function useRemoteConnection() {
  const [connections, setConnections] = useState<RemoteConnection[]>(remoteConnectionManager.getSavedConnections());
  const [activeConnection, setActiveConnection] = useState<RemoteConnection | null>(remoteConnectionManager.getActiveConnection());

  useEffect(() => {
    const handleChange = () => {
      setConnections(remoteConnectionManager.getSavedConnections());
      setActiveConnection(remoteConnectionManager.getActiveConnection());
    };

    remoteConnectionManager.on('connection-change', handleChange);
    remoteConnectionManager.on('connections-updated', handleChange);

    return () => {
      remoteConnectionManager.off('connection-change', handleChange);
      remoteConnectionManager.off('connections-updated', handleChange);
    };
  }, []);

  const connect = useCallback(async (id: string) => {
    await remoteConnectionManager.connect(id);
  }, []);

  const disconnect = useCallback((id: string) => {
    remoteConnectionManager.disconnect(id);
  }, []);

  const addConnection = useCallback((conn: Omit<RemoteConnection, 'id' | 'status'>) => {
    return remoteConnectionManager.addConnection(conn);
  }, []);

  const removeConnection = useCallback((id: string) => {
    remoteConnectionManager.removeConnection(id);
  }, []);

  return {
    connections,
    activeConnection,
    connect,
    disconnect,
    addConnection,
    removeConnection,
    isRemote: remoteConnectionManager.isRemote(),
  };
}
