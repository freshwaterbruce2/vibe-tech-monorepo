import { useCallback, useEffect, useRef, useState } from 'react';
import { getApiUrl } from '../config';
import { HttpAgentAdapter } from '../services/HttpAgentAdapter';

interface UseNovaAgentOptions {
  autoConnect?: boolean;
}

interface AgentStatus {
  connected: boolean;
  error: string | null;
}

export function useNovaAgent(options: UseNovaAgentOptions = {}) {
  const { autoConnect = true } = options;
  const adapterRef = useRef<HttpAgentAdapter | null>(null);
  const [status, setStatus] = useState<AgentStatus>({
    connected: false,
    error: null,
  });
  const [isLoading, setIsLoading] = useState(false);

  // Initialize adapter
  useEffect(() => {
    const baseUrl = getApiUrl('');
    adapterRef.current = new HttpAgentAdapter(baseUrl);

    if (autoConnect) {
      checkConnection();
    }

    return () => {
      adapterRef.current = null;
    };
  }, [autoConnect]);

  const checkConnection = useCallback(async () => {
    if (!adapterRef.current) return;

    try {
      await adapterRef.current.getStatus();
      setStatus({ connected: true, error: null });
    } catch (error) {
      setStatus({
        connected: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      });
    }
  }, []);

  const chat = useCallback(async (message: string, projectId?: string): Promise<string> => {
    if (!adapterRef.current) {
      throw new Error('Agent not initialized');
    }

    setIsLoading(true);
    try {
      const response = await adapterRef.current.chat(message, projectId);
      setStatus((prev) => ({ ...prev, connected: true, error: null }));
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Chat failed';
      setStatus((prev) => ({ ...prev, error: errorMessage }));
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    chat,
    isLoading,
    status,
    checkConnection,
    isConnected: status.connected,
  };
}
