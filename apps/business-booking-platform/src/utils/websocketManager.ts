/**
 * WebSocket Manager for Real-Time Features
 * Handles real-time price updates, availability changes, and user notifications
 */

import { analytics } from './analytics';
import { logger } from './logger';

export interface WebSocketMessage {
	type: string;
	data: unknown;
	timestamp: number;
	id?: string;
}

export interface ConnectionOptions {
	url: string;
	protocols?: string[];
	reconnectAttempts?: number;
	reconnectDelay?: number;
	heartbeatInterval?: number;
	maxMessageQueue?: number;
}

export interface RealTimeUpdate {
	hotelId: string;
	roomId?: string;
	type: 'price' | 'availability' | 'promotion' | 'notification';
	data: unknown;
	priority: 'low' | 'medium' | 'high' | 'urgent';
}

type MessageHandler = (message: WebSocketMessage) => void;
type ConnectionHandler = (connected: boolean, error?: Error) => void;

class WebSocketManager {
	private static instance: WebSocketManager;
	private socket: WebSocket | null = null;
	private messageHandlers = new Map<string, MessageHandler[]>();
	private connectionHandlers: ConnectionHandler[] = [];
	private messageQueue: WebSocketMessage[] = [];
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 5;
	private reconnectDelay = 1000;
	private heartbeatInterval = 30000;
	private heartbeatTimer?: NodeJS.Timeout;
	private connectionState:
		| 'disconnected'
		| 'connecting'
		| 'connected'
		| 'error' = 'disconnected';
	private lastHeartbeat = 0;
	private options: ConnectionOptions = {
		url: '',
		reconnectAttempts: 5,
		reconnectDelay: 1000,
		heartbeatInterval: 30000,
		maxMessageQueue: 100,
	};

	static getInstance(): WebSocketManager {
		if (!WebSocketManager.instance) {
			WebSocketManager.instance = new WebSocketManager();
		}
		return WebSocketManager.instance;
	}

	/**
	 * Connect to WebSocket server
	 */
	async connect(options: ConnectionOptions): Promise<void> {
		this.options = { ...this.options, ...options };

		if (this.socket?.readyState === WebSocket.OPEN) {
			logger.debug('WebSocket already connected', {
				component: 'WebSocketManager',
			});
			return;
		}

		this.connectionState = 'connecting';

		try {
			logger.info('Connecting to WebSocket', {
				component: 'WebSocketManager',
				url: this.options.url,
			});

			this.socket = new WebSocket(this.options.url, this.options.protocols);

			this.socket.onopen = this.handleOpen.bind(this);
			this.socket.onmessage = this.handleMessage.bind(this);
			this.socket.onclose = this.handleClose.bind(this);
			this.socket.onerror = this.handleError.bind(this);

			// Analytics tracking
			analytics.track('websocket_connect_attempt', {
				url: this.options.url,
				attempt: this.reconnectAttempts + 1,
			});
		} catch (error) {
			this.handleError(new Error(`WebSocket connection failed: ${error}`));
		}
	}

	/**
	 * Disconnect from WebSocket
	 */
	disconnect(): void {
		if (this.heartbeatTimer) {
			clearInterval(this.heartbeatTimer);
			this.heartbeatTimer = undefined;
		}

		if (this.socket) {
			this.socket.close(1000, 'Client disconnect');
			this.socket = null;
		}

		this.connectionState = 'disconnected';
		this.reconnectAttempts = 0;

		logger.info('WebSocket disconnected', { component: 'WebSocketManager' });

		this.notifyConnectionHandlers(false);
	}

	/**
	 * Send message through WebSocket
	 */
	send(
		type: string,
		data: unknown,
		_priority: 'low' | 'medium' | 'high' = 'medium',
	): void {
		const message: WebSocketMessage = {
			type,
			data,
			timestamp: Date.now(),
			id: this.generateMessageId(),
		};

		if (this.socket?.readyState === WebSocket.OPEN) {
			try {
				this.socket.send(JSON.stringify(message));

				logger.debug('WebSocket message sent', {
					component: 'WebSocketManager',
					type,
					id: message.id,
				});
			} catch (error) {
				logger.error('Failed to send WebSocket message', {
					component: 'WebSocketManager',
					error: error instanceof Error ? error.message : 'Unknown error',
				});
			}
		} else {
			// Queue message for later sending
			if (this.messageQueue.length < (this.options.maxMessageQueue || 100)) {
				this.messageQueue.push(message);

				logger.debug('WebSocket message queued', {
					component: 'WebSocketManager',
					type,
					queueSize: this.messageQueue.length,
				});
			} else {
				logger.warn('WebSocket message queue full, dropping message', {
					component: 'WebSocketManager',
					type,
				});
			}
		}
	}

	/**
	 * Subscribe to message type
	 */
	subscribe(messageType: string, handler: MessageHandler): () => void {
		if (!this.messageHandlers.has(messageType)) {
			this.messageHandlers.set(messageType, []);
		}

		const handlers = this.messageHandlers.get(messageType) as MessageHandler[];
		handlers.push(handler);

		logger.debug('Subscribed to WebSocket message type', {
			component: 'WebSocketManager',
			messageType,
			handlerCount: handlers.length,
		});

		// Return unsubscribe function
		return () => {
			const handlers = this.messageHandlers.get(messageType);
			if (handlers) {
				const index = handlers.indexOf(handler);
				if (index > -1) {
					handlers.splice(index, 1);
				}
			}
		};
	}

	/**
	 * Subscribe to connection state changes
	 */
	onConnectionChange(handler: ConnectionHandler): () => void {
		this.connectionHandlers.push(handler);

		// Return unsubscribe function
		return () => {
			const index = this.connectionHandlers.indexOf(handler);
			if (index > -1) {
				this.connectionHandlers.splice(index, 1);
			}
		};
	}

	/**
	 * Get current connection state
	 */
	getConnectionState(): string {
		return this.connectionState;
	}

	/**
	 * Get connection statistics
	 */
	getStatistics() {
		return {
			connectionState: this.connectionState,
			reconnectAttempts: this.reconnectAttempts,
			messageQueueSize: this.messageQueue.length,
			subscriberCount: Array.from(this.messageHandlers.values()).reduce(
				(total, handlers) => total + handlers.length,
				0,
			),
			lastHeartbeat: this.lastHeartbeat,
			uptime: this.lastHeartbeat > 0 ? Date.now() - this.lastHeartbeat : 0,
		};
	}

	private handleOpen(_event: Event): void {
		this.connectionState = 'connected';
		this.reconnectAttempts = 0;

		logger.info('WebSocket connected successfully', {
			component: 'WebSocketManager',
		});

		// Start heartbeat
		this.startHeartbeat();

		// Send queued messages
		this.flushMessageQueue();

		// Notify handlers
		this.notifyConnectionHandlers(true);

		// Analytics tracking
		analytics.track('websocket_connected', {
			url: this.options.url,
			queuedMessages: this.messageQueue.length,
		});
	}

	private handleMessage(event: MessageEvent): void {
		try {
			const message: WebSocketMessage = JSON.parse(event.data);

			// Handle heartbeat responses
			if (message.type === 'heartbeat_response') {
				this.lastHeartbeat = Date.now();
				return;
			}

			logger.debug('WebSocket message received', {
				component: 'WebSocketManager',
				type: message.type,
				id: message.id,
			});

			// Notify subscribed handlers
			const handlers = this.messageHandlers.get(message.type) || [];
			handlers.forEach((handler) => {
				try {
					handler(message);
				} catch (error) {
					logger.error('Error in WebSocket message handler', {
						component: 'WebSocketManager',
						messageType: message.type,
						error: error instanceof Error ? error.message : 'Unknown error',
					});
				}
			});
		} catch (error) {
			logger.error('Failed to parse WebSocket message', {
				component: 'WebSocketManager',
				error: error instanceof Error ? error.message : 'Unknown error',
			});
		}
	}

	private handleClose(event: CloseEvent): void {
		this.connectionState = 'disconnected';

		if (this.heartbeatTimer) {
			clearInterval(this.heartbeatTimer);
			this.heartbeatTimer = undefined;
		}

		logger.warn('WebSocket connection closed', {
			component: 'WebSocketManager',
			code: event.code,
			reason: event.reason,
			wasClean: event.wasClean,
		});

		this.notifyConnectionHandlers(false);

		// Attempt reconnection if not a clean close
		if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
			this.attemptReconnection();
		}
	}

	private handleError(error: Event | Error): void {
		this.connectionState = 'error';

		const errorMessage =
			error instanceof Error ? error.message : 'WebSocket error';

		logger.error('WebSocket error occurred', {
			component: 'WebSocketManager',
			error: errorMessage,
		});

		// Analytics tracking
		analytics.track('websocket_error', {
			error: errorMessage,
			attempt: this.reconnectAttempts,
		});

		this.notifyConnectionHandlers(
			false,
			error instanceof Error ? error : new Error(errorMessage),
		);
	}

	private attemptReconnection(): void {
		this.reconnectAttempts++;
		// Exponential backoff
		const delay = this.reconnectDelay * 2 ** (this.reconnectAttempts - 1);

		logger.info('Attempting WebSocket reconnection', {
			component: 'WebSocketManager',
			attempt: this.reconnectAttempts,
			delay,
		});

		setTimeout(() => {
			if (this.connectionState !== 'connected') {
				this.connect(this.options);
			}
		}, delay);
	}

	private startHeartbeat(): void {
		if (this.heartbeatTimer) {
			clearInterval(this.heartbeatTimer);
		}

		this.heartbeatTimer = setInterval(() => {
			if (this.socket?.readyState === WebSocket.OPEN) {
				this.send('heartbeat', { timestamp: Date.now() });
			}
		}, this.heartbeatInterval);
	}

	private flushMessageQueue(): void {
		if (this.messageQueue.length === 0) {
return;
}

		logger.info('Flushing WebSocket message queue', {
			component: 'WebSocketManager',
			count: this.messageQueue.length,
		});

		const messages = [...this.messageQueue];
		this.messageQueue = [];

		messages.forEach((message) => {
			if (this.socket?.readyState === WebSocket.OPEN) {
				try {
					this.socket.send(JSON.stringify(message));
				} catch (error) {
					logger.error('Failed to send queued message', {
						component: 'WebSocketManager',
						messageType: message.type,
						error: error instanceof Error ? error.message : 'Unknown error',
					});
				}
			}
		});
	}

	private notifyConnectionHandlers(connected: boolean, error?: Error): void {
		this.connectionHandlers.forEach((handler) => {
			try {
				handler(connected, error);
			} catch (handlerError) {
				logger.error('Error in connection handler', {
					component: 'WebSocketManager',
					error:
						handlerError instanceof Error
							? handlerError.message
							: 'Unknown error',
				});
			}
		});
	}

	private generateMessageId(): string {
		return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}
}

export const websocketManager = WebSocketManager.getInstance();

// React hook for WebSocket functionality
export const useWebSocket = () => {
	return {
		connect: websocketManager.connect.bind(websocketManager),
		disconnect: websocketManager.disconnect.bind(websocketManager),
		send: websocketManager.send.bind(websocketManager),
		subscribe: websocketManager.subscribe.bind(websocketManager),
		onConnectionChange:
			websocketManager.onConnectionChange.bind(websocketManager),
		getConnectionState:
			websocketManager.getConnectionState.bind(websocketManager),
		getStatistics: websocketManager.getStatistics.bind(websocketManager),
	};
};
