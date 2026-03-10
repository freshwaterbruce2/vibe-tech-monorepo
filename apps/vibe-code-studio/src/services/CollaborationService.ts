import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import type { editor } from 'monaco-editor';
import { logger } from './Logger';

export class CollaborationService {
  private doc: Y.Doc;
  private provider: WebsocketProvider | null = null;
  private binding: MonacoBinding | null = null;

  constructor() {
    this.doc = new Y.Doc();
  }

  public connect(roomName: string, editorInstance: editor.IStandaloneCodeEditor, serverUrl = 'ws://localhost:1234') {
    this.disconnect(); // Ensure previous connections are closed

    logger.info(`[CollaborationService] Connecting to room: ${roomName} at ${serverUrl}`);
    
    // Connect to y-websocket server
    this.provider = new WebsocketProvider(serverUrl, roomName, this.doc);
    
    // Get a shared text type from the Yjs document
    const type = this.doc.getText('monaco');
    
    // Bind Yjs to the Monaco Editor
    const model = editorInstance.getModel();
    if (model) {
      this.binding = new MonacoBinding(type, model, new Set([editorInstance]), this.provider.awareness);
      logger.info('[CollaborationService] Successfully bound Monaco editor to Yjs document');
    } else {
      logger.error('[CollaborationService] Editor model not found for binding');
    }

    this.provider.on('status', (event: { status: string }) => {
      logger.debug(`[CollaborationService] Connection status: ${event.status}`);
    });
  }

  public disconnect() {
    if (this.binding) {
      this.binding.destroy();
      this.binding = null;
    }
    if (this.provider) {
      this.provider.disconnect();
      this.provider = null;
    }
    logger.info('[CollaborationService] Disconnected');
  }

  public setAwarenessState(state: Record<string, any>) {
    if (this.provider) {
      this.provider.awareness.setLocalStateField('user', state);
    }
  }
}

export const collaborationService = new CollaborationService();
