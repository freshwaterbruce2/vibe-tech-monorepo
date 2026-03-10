import { useState, useEffect, useCallback } from 'react';
import { IpcBridge } from '../services/IpcBridge';
import type { IPCMessage } from '@vibetech/shared-ipc';

interface UseIPCOptions {
    onMessage?: (message: IPCMessage) => void;
    onStatusChange?: (status: any) => void;
}

export const useIPC = (options?: UseIPCOptions) => {
    const [lastMessage, setLastMessage] = useState<IPCMessage | null>(null);
    const [status, setStatus] = useState<any>(null);

    useEffect(() => {
        const unsubscribe = IpcBridge.onMessage((msg: IPCMessage) => {
            setLastMessage(msg);
            options?.onMessage?.(msg);
        });

        const unsubscribeStatus = IpcBridge.onStatusChange((newStatus: any) => {
            setStatus(newStatus);
            options?.onStatusChange?.(newStatus);
        });

        // Get initial status
        IpcBridge.getStatus().then((initialStatus) => {
            setStatus(initialStatus);
            options?.onStatusChange?.(initialStatus);
        });

        return () => {
            unsubscribe();
            unsubscribeStatus();
        };
    }, [options?.onMessage, options?.onStatusChange]);

    const sendMessage = useCallback((message: any) => {
        // This is a generic send, we might want to add more specific ones later
        // or just use the ones already in IpcBridge
        if ((window as any).ipcBridge?.send) {
            (window as any).ipcBridge.send(message);
        }
    }, []);

    return {
        lastMessage,
        status,
        sendMessage,
        // Expose specific senders from IpcBridge
        sendTaskStarted: IpcBridge.sendTaskStarted,
        sendTaskStopped: IpcBridge.sendTaskStopped,
        sendTaskActivity: IpcBridge.sendTaskActivity,
        sendFileOpen: IpcBridge.sendFileOpen,
        sendFileChanged: IpcBridge.sendFileChanged,
        sendCommandRequest: IpcBridge.sendCommandRequest,
    };
};
