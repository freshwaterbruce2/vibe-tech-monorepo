import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { squarePaymentService } from '../services/squarePaymentService';
import { adminRouter } from './admin';
import { aiRouter } from './ai';
import { authRouter } from './auth';
import { bookingsRouter } from './bookings';
import { hotelsRouter } from './hotels';
import { paymentsRouter } from './payments';
import { reviewsRouter } from './reviews';
import { usersRouter } from './users';

export const apiRouter = Router();

// Public routes
apiRouter.use('/auth', authRouter);
apiRouter.use('/hotels', hotelsRouter);
apiRouter.use('/ai', aiRouter);
apiRouter.use('/reviews', reviewsRouter);

// Protected routes
apiRouter.use('/bookings', authenticate, bookingsRouter);
// Public Square webhook (must come before protected /payments to avoid auth)
apiRouter.post('/payments/webhook/square', async (req, res) => {
	try {
		// Raw body is a Buffer because of express.raw middleware
		const rawBody =
			req.body instanceof Buffer
				? req.body
				: Buffer.from(JSON.stringify(req.body));
		const signature =
			(req.headers['x-square-hmacsha256-signature'] as string) || '';
		const result = await squarePaymentService.handleWebhookRaw(
			rawBody,
			signature,
			`${req.protocol}://${req.get('host')}${req.originalUrl}`,
		);
		if (result.success) {
			return res.json({ received: true });
		}
		return res.status(400).json({ error: 'Webhook processing failed' });
	} catch (error) {
		return res.status(400).json({ error: 'Webhook processing error' });
	}
});

apiRouter.use('/payments', authenticate, paymentsRouter);
apiRouter.use('/users', authenticate, usersRouter);

// Admin routes
apiRouter.use('/admin', authenticate, adminRouter);

// API health check
apiRouter.get('/health', (req, res) => {
	res.json({
		status: 'healthy',
		timestamp: new Date().toISOString(),
		version: '1.0.0',
	});
});

// 404 handler for API routes
apiRouter.use('*', (req, res) => {
	res.status(404).json({
		error: 'Not Found',
		message: 'The requested API endpoint does not exist',
		path: req.originalUrl,
	});
});
