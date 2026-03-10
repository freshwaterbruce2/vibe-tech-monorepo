import type { Socket, Server as SocketIOServer } from 'socket.io';
import { authenticate } from '../middleware/authenticate';
import { logger } from '../utils/logger';

export const initializeWebSocket = (io: SocketIOServer) => {
	// Middleware for socket authentication
	io.use(async (socket: Socket, next) => {
		try {
			const token =
				socket.handshake.auth.token ||
				socket.handshake.headers.authorization?.replace('Bearer ', '');

			if (!token) {
				return next(new Error('Authentication required'));
			}

			// Create a mock request object for authentication middleware
			const mockReq = {
				headers: { authorization: `Bearer ${token}` },
				user: undefined,
			} as any;

			const mockRes = {} as any;

			await new Promise<void>((resolve, reject) => {
				authenticate(mockReq, mockRes, (err: any) => {
					if (err) {
reject(err);
} else {
resolve();
}
				});
			});

			socket.data.user = mockReq.user;
			next();
		} catch (error) {
			logger.error('Socket authentication failed', { error });
			next(new Error('Authentication failed'));
		}
	});

	io.on('connection', (socket: Socket) => {
		const {user} = socket.data;

		logger.info('User connected to WebSocket', {
			socketId: socket.id,
			userId: user?.id,
			userEmail: user?.email,
		});

		// Join user-specific room
		if (user?.id) {
			socket.join(`user:${user.id}`);
		}

		// Handle booking updates subscription
		socket.on('subscribe:bookings', () => {
			if (user?.id) {
				socket.join(`bookings:${user.id}`);
				logger.debug('User subscribed to booking updates', { userId: user.id });
			}
		});

		// Handle payment updates subscription
		socket.on('subscribe:payments', (bookingId: string) => {
			if (user?.id && bookingId) {
				socket.join(`payments:${bookingId}`);
				logger.debug('User subscribed to payment updates', {
					userId: user.id,
					bookingId,
				});
			}
		});

		// Handle search collaboration (for group bookings)
		socket.on('join:search', (sessionId: string) => {
			if (sessionId && user?.id) {
				socket.join(`search:${sessionId}`);
				socket.to(`search:${sessionId}`).emit('user:joined', {
					userId: user.id,
					userName: `${user.firstName} ${user.lastName}`,
				});
				logger.debug('User joined search session', {
					userId: user.id,
					sessionId,
				});
			}
		});

		socket.on(
			'search:update',
			(data: { sessionId: string; searchParams: any }) => {
				if (data.sessionId && user?.id) {
					socket.to(`search:${data.sessionId}`).emit('search:updated', {
						userId: user.id,
						searchParams: data.searchParams,
						timestamp: new Date().toISOString(),
					});
				}
			},
		);

		// Handle notifications acknowledgment
		socket.on('notification:read', (notificationId: string) => {
			if (user?.id) {
				logger.debug('Notification read', { userId: user.id, notificationId });
				// Here you could update notification status in database
			}
		});

		// Handle typing indicators for chat/support
		socket.on('typing:start', (conversationId: string) => {
			if (user?.id) {
				socket.to(`conversation:${conversationId}`).emit('typing:user', {
					userId: user.id,
					isTyping: true,
				});
			}
		});

		socket.on('typing:stop', (conversationId: string) => {
			if (user?.id) {
				socket.to(`conversation:${conversationId}`).emit('typing:user', {
					userId: user.id,
					isTyping: false,
				});
			}
		});

		// Handle disconnection
		socket.on('disconnect', (reason) => {
			logger.info('User disconnected from WebSocket', {
				socketId: socket.id,
				userId: user?.id,
				reason,
			});
		});

		// Handle connection errors
		socket.on('error', (error) => {
			logger.error('WebSocket connection error', {
				socketId: socket.id,
				userId: user?.id,
				error,
			});
		});

		// Send welcome message
		socket.emit('connected', {
			message: 'Connected to Hotel Booking WebSocket',
			userId: user?.id,
			timestamp: new Date().toISOString(),
		});
	});

	// Global error handling
	io.engine.on('connection_error', (err) => {
		logger.error('WebSocket connection error', {
			error: err.message,
			code: err.code,
			context: err.context,
		});
	});

	logger.info('WebSocket server initialized successfully');
};

// Utility functions to emit events from other parts of the application
export const emitToUser = (
	io: SocketIOServer,
	userId: string,
	event: string,
	data: any,
) => {
	io.to(`user:${userId}`).emit(event, {
		...data,
		timestamp: new Date().toISOString(),
	});
};

export const emitBookingUpdate = (
	io: SocketIOServer,
	userId: string,
	bookingData: any,
) => {
	io.to(`bookings:${userId}`).emit('booking:updated', bookingData);
};

export const emitPaymentUpdate = (
	io: SocketIOServer,
	bookingId: string,
	paymentData: any,
) => {
	io.to(`payments:${bookingId}`).emit('payment:updated', paymentData);
};

export const emitNotification = (
	io: SocketIOServer,
	userId: string,
	notification: any,
) => {
	io.to(`user:${userId}`).emit('notification', {
		...notification,
		timestamp: new Date().toISOString(),
	});
};
