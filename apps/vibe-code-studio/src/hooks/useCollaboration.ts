import { useCallback, useEffect, useState } from 'react';
import { collaborationService } from '../services/CollaborationService';
import type { CollaborationUser } from '../services/CollaborationService';

export function useCollaboration() {
  const [status, setStatus] = useState(collaborationService.status);
  const [connectedUsers, setConnectedUsers] = useState<CollaborationUser[]>([]);

  useEffect(() => {
    const handleStatusChange = (newStatus: unknown) => {
      setStatus(newStatus as typeof status);
    };

    const handleUserChange = () => {
      setConnectedUsers(collaborationService.getConnectedUsers());
    };

    collaborationService.on('status-change', handleStatusChange);
    collaborationService.on('user-joined', handleUserChange);
    collaborationService.on('user-left', handleUserChange);

    return () => {
      collaborationService.off('status-change', handleStatusChange);
      collaborationService.off('user-joined', handleUserChange);
      collaborationService.off('user-left', handleUserChange);
    };
  }, []);

  const joinRoom = useCallback((roomId: string, userName: string, serverUrl?: string) => {
    collaborationService.joinRoom(roomId, userName, serverUrl);
  }, []);

  const leaveRoom = useCallback(() => {
    collaborationService.leaveRoom();
  }, []);

  return {
    status,
    isConnected: status === 'connected',
    connectedUsers,
    joinRoom,
    leaveRoom,
    awareness: collaborationService.getAwareness(),
    ydoc: collaborationService.getDocument(),
    roomId: collaborationService.getRoomId(),
  };
}
