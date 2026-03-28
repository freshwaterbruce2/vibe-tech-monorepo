import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { logger } from './Logger';

export interface CollaborationUser {
  id: string;
  name: string;
  color: string;
  cursor?: { line: number; column: number };
  selection?: { start: { line: number; column: number }; end: { line: number; column: number } };
}

type CollabEvent = 'status-change' | 'user-joined' | 'user-left';
type CollabEventHandler = (...args: unknown[]) => void;

const USER_COLORS = [
  '#e06c75', '#98c379', '#61afef', '#c678dd', '#e5c07b',
  '#56b6c2', '#be5046', '#d19a66', '#abb2bf', '#c8ccd4',
];

class CollaborationService {
  private static _instance: CollaborationService;
  private ydoc: Y.Doc | null = null;
  private provider: WebsocketProvider | null = null;
  private roomId: string | null = null;
  private userName: string | null = null;
  private listeners = new Map<CollabEvent, Set<CollabEventHandler>>();
  private _status: 'disconnected' | 'connecting' | 'connected' = 'disconnected';

  private constructor() {}

  static getInstance(): CollaborationService {
    if (!CollaborationService._instance) {
      CollaborationService._instance = new CollaborationService();
    }
    return CollaborationService._instance;
  }

  get status() {
    return this._status;
  }

  joinRoom(roomId: string, userName: string, serverUrl = 'ws://localhost:4444'): void {
    if (this.provider) {
      this.leaveRoom();
    }

    this._status = 'connecting';
    this.emit('status-change', this._status);
    this.roomId = roomId;
    this.userName = userName;

    this.ydoc = new Y.Doc();
    this.provider = new WebsocketProvider(serverUrl, roomId, this.ydoc);

    const awareness = this.provider.awareness;
    const colorIndex = Math.abs(hashCode(userName)) % USER_COLORS.length;
    awareness.setLocalStateField('user', {
      name: userName,
      color: USER_COLORS[colorIndex],
    });

    this.provider.on('status', ({ status }: { status: string }) => {
      if (status === 'connected') {
        this._status = 'connected';
        logger.info(`[Collab] Connected to room "${roomId}" as "${userName}"`);
      } else if (status === 'disconnected') {
        this._status = 'disconnected';
        logger.info(`[Collab] Disconnected from room "${roomId}"`);
      }
      this.emit('status-change', this._status);
    });

    awareness.on('change', ({ added, removed }: { added: number[]; removed: number[] }) => {
      for (const id of added) {
        const state = awareness.getStates().get(id);
        if (state?.user) {
          this.emit('user-joined', { id: String(id), ...state.user });
        }
      }
      for (const id of removed) {
        this.emit('user-left', { id: String(id) });
      }
    });

    logger.debug(`[Collab] Joining room "${roomId}" via ${serverUrl}`);
  }

  leaveRoom(): void {
    if (this.provider) {
      this.provider.disconnect();
      this.provider.destroy();
      this.provider = null;
    }
    if (this.ydoc) {
      this.ydoc.destroy();
      this.ydoc = null;
    }
    this.roomId = null;
    this.userName = null;
    this._status = 'disconnected';
    this.emit('status-change', this._status);
    logger.info('[Collab] Left room');
  }

  getDocument(): Y.Doc | null {
    return this.ydoc;
  }

  getAwareness() {
    return this.provider?.awareness ?? null;
  }

  getConnectedUsers(): CollaborationUser[] {
    const awareness = this.provider?.awareness;
    if (!awareness) return [];

    const users: CollaborationUser[] = [];
    awareness.getStates().forEach((state, clientId) => {
      if (state.user && clientId !== awareness.clientID) {
        users.push({
          id: String(clientId),
          name: state.user.name,
          color: state.user.color,
          cursor: state.user.cursor,
          selection: state.user.selection,
        });
      }
    });
    return users;
  }

  isConnected(): boolean {
    return this._status === 'connected';
  }

  getRoomId(): string | null {
    return this.roomId;
  }

  on(event: CollabEvent, handler: CollabEventHandler): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  off(event: CollabEvent, handler: CollabEventHandler): void {
    this.listeners.get(event)?.delete(handler);
  }

  private emit(event: CollabEvent, ...args: unknown[]): void {
    this.listeners.get(event)?.forEach((handler) => handler(...args));
  }

  destroy(): void {
    this.leaveRoom();
    this.listeners.clear();
  }
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

export const collaborationService = CollaborationService.getInstance();
export default collaborationService;
