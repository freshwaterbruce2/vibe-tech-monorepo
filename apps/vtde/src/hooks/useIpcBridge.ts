import { useEffect, useState } from 'react';
import { vtdeIpcBridgeClient, type IpcBridgeState } from '../lib/ipc-bridge-client';

export function useIpcBridge(): IpcBridgeState & { requestDiagnostic: () => void } {
  const [state, setState] = useState<IpcBridgeState>(() => vtdeIpcBridgeClient.getState());

  useEffect(() => {
    const unsubscribe = vtdeIpcBridgeClient.subscribeState(setState);
    vtdeIpcBridgeClient.connect();
    return unsubscribe;
  }, []);

  return {
    ...state,
    requestDiagnostic: () => {
      vtdeIpcBridgeClient.requestDiagnostic();
    },
  };
}
