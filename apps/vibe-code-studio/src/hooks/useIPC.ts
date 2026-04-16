import { useState, useEffect, useCallback } from 'react';
import { IpcBridge } from '../services/IpcBridge';
import type { IPCMessage } from '@vibetech/shared-ipc';

interface UseIPCOptions {
    onMessage?: (message: IPCMessage) => void;
    onStatusChange?: (status: { connected: boolean }) => void;
}

export const useIPC = (options?: UseIPCOptions) => {
    const [lastMessage, setLastMessage] = useState<IPCMessage | null>(null);
    const [status, setStatus] = useState<{ connected: boolean } | null>(null);

    useEffect(() => {
        const unsubscribe = IpcBridge.onMessage((msg: IPCMessage) => {
            setLastMessage(msg);
            options?.onMessage?.(msg);
        });

        const unsubscribeStatus = IpcBridge.onStatusChange((newStatus: { connected: boolean }) => {
            setStatus(newStatus);
            options?.onStatusChange?.(newStatus);
        });

        // Get initial status
        IpcBridge.getStatus().then((initialStatus) => {
            setStatus(initialStatus);
            options?.onStatusChange?.(initialStatus);
        });

        return () => {
            unsubscribe?.();
            unsubscribeStatus?.();
        };
    }, [options?.onMessage, options?.onStatusChange]);

    const sendMessage = useCallback((message: unknown) => {
        // This is a generic send, we might want to add more specific ones later
        // or just use the ones already in IpcBridge
        const ipcWindow = window as Window & { ipcBridge?: { send?: (msg: unknown) => void } };
        if (ipcWindow.ipcBridge?.send) {
            ipcWindow.ipcBridge.send(message);
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
