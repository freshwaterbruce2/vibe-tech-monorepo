// Square payment integration with 2025 standards

import crypto, { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import { SquareClient, SquareEnvironment } from 'square';
import { config } from '../config';
import { getDb } from '../database';
import { paymentMethods, payments, refunds } from '../database/schema';
import { logger } from '../utils/logger';

export class SquarePaymentService {
	private client: SquareClient;

	constructor() {
		this.client = new SquareClient({
			token: config.square.accessToken,
			environment:
				config.square.environment === 'production'
					? SquareEnvironment.Production
					: SquareEnvironment.Sandbox,
		});
	}

	/**
	 * Create a Square payment
	 */
	async createPayment(params: {
		sourceId: string; // Payment method token from frontend
		amount: number;
		currency?: string;
		bookingId: string;
		userId?: string;
		metadata?: Record<string, string>;
		billingAddress?: {
			firstName?: string;
			lastName?: string;
			addressLine1?: string;
			addressLine2?: string;
			locality?: string;
			administrativeDistrictLevel1?: string;
			postalCode?: string;
			country?: string;
		};
	}): Promise<{
		success: boolean;
		paymentId?: string;
		receiptUrl?: string;
		errorMessage?: string;
	}> {
		try {
			const idempotencyKey = randomUUID();
			const amountMoney = {
				amount: BigInt(Math.round(params.amount * 100)), // Convert to cents
				currency: params.currency || 'USD',
			};

			const createPaymentRequest = {
				sourceId: params.sourceId,
				idempotencyKey,
				amountMoney,
				referenceId: params.bookingId,
				note: `Vibe Booking payment for booking ${params.bookingId}`,
				buyerEmailAddress: params.metadata?.email,
				billingAddress: params.billingAddress
					? {
							firstName: params.billingAddress.firstName,
							lastName: params.billingAddress.lastName,
							addressLine1: params.billingAddress.addressLine1,
							addressLine2: params.billingAddress.addressLine2,
							locality: params.billingAddress.locality,
							administrativeDistrictLevel1:
								params.billingAddress.administrativeDistrictLevel1,
							postalCode: params.billingAddress.postalCode,
							country: params.billingAddress.country || 'US',
						}
					: undefined,
			};

			const { result } =
				await this.client.payments.create(createPaymentRequest);

			if (result.payment) {
				// Store payment record in database
				const db = await getDb();
				await db.insert(payments).values({
					bookingId: params.bookingId,
					userId: params.userId,
					amount: params.amount.toString(),
					currency: params.currency || 'USD',
					status:
						result.payment.status === 'COMPLETED' ? 'succeeded' : 'pending',
					method: 'card',
					provider: 'square',
					transactionId: result.payment.id,
					referenceNumber: result.payment.orderId || undefined,
					cardLast4: result.payment.cardDetails?.card?.last4,
					cardBrand: result.payment.cardDetails?.card?.cardBrand,
					metadata: {
						...params.metadata,
						squarePaymentId: result.payment.id,
						receiptUrl: result.payment.receiptUrl,
					},
				} as any); // cast to any to bypass potential numeric precision issues

				logger.info('Square payment created successfully', {
					paymentId: result.payment.id,
					bookingId: params.bookingId,
					amount: params.amount,
					status: result.payment.status,
				});

				return {
					success: true,
					paymentId: result.payment.id,
					receiptUrl: result.payment.receiptUrl,
				};
			} else {
				logger.error('Square payment creation failed - no payment returned');
				return {
					success: false,
					errorMessage: 'Payment creation failed',
				};
			}
		} catch (error) {
			logger.error('Square payment creation error', {
				error,
				bookingId: params.bookingId,
			});

			if (error instanceof Error) {
				const squareErr: any = error as any;
				const errorMessage =
					squareErr.errors?.[0]?.detail ||
					squareErr.message ||
					'Payment processing failed';
				return {
					success: false,
					errorMessage,
				};
			}

			return {
				success: false,
				errorMessage: 'Payment processing failed. Please try again.',
			};
		}
	}

	/**
	 * Get payment details
	 */
	async getPayment(paymentId: string): Promise<{
		success: boolean;
		payment?: any;
		errorMessage?: string;
	}> {
		try {
			const { result } = await this.client.payments.get(paymentId);

			return {
				success: true,
				payment: result.payment,
			};
		} catch (error) {
			logger.error('Error fetching Square payment', { error, paymentId });

			if (error instanceof Error) {
				const squareErr: any = error as any;
				return {
					success: false,
					errorMessage:
						squareErr.errors?.[0]?.detail ||
						squareErr.message ||
						'Failed to fetch payment details',
				};
			}

			return {
				success: false,
				errorMessage: 'Failed to fetch payment details',
			};
		}
	}

	/**
	 * Process refund
	 */
	async createRefund(params: {
		paymentId: string;
		amount?: number; // If not provided, refunds full amount
		reason?: string;
		bookingId: string;
	}): Promise<{
		success: boolean;
		refundId?: string;
		errorMessage?: string;
	}> {
		try {
			const idempotencyKey = randomUUID();

			// Get original payment to determine refund amount
			const paymentResult = await this.getPayment(params.paymentId);
			if (!paymentResult.success || !paymentResult.payment) {
				return {
					success: false,
					errorMessage: 'Original payment not found',
				};
			}

			const refundAmount = params.amount
				? {
						amount: BigInt(Math.round(params.amount * 100)),
						currency: paymentResult.payment.amountMoney.currency,
					}
				: paymentResult.payment.amountMoney;

			const createRefundRequest = {
				idempotencyKey,
				amountMoney: refundAmount,
				paymentId: params.paymentId,
				reason: params.reason || 'Vibe Booking cancellation',
			};

			const { result } = await this.client.refunds.refund(createRefundRequest);

			if (result.refund) {
				// Store refund record in database
				const db = await getDb();
				await db.insert(refunds).values({
					bookingId: params.bookingId,
					paymentId: params.paymentId,
					amount: (Number(refundAmount.amount) / 100).toString(),
					currency: refundAmount.currency,
					status:
						result.refund.status === 'COMPLETED' ? 'succeeded' : 'pending',
					transactionId: result.refund.id,
					reason: params.reason || 'Vibe Booking cancellation',
					metadata: { squareRefundId: result.refund.id },
				} as any);

				logger.info('Square refund created successfully', {
					refundId: result.refund.id,
					paymentId: params.paymentId,
					bookingId: params.bookingId,
					amount: Number(refundAmount.amount) / 100,
				});

				return {
					success: true,
					refundId: result.refund.id,
				};
			} else {
				logger.error('Square refund creation failed - no refund returned');
				return {
					success: false,
					errorMessage: 'Refund creation failed',
				};
			}
		} catch (error) {
			logger.error('Square refund creation error', {
				error,
				paymentId: params.paymentId,
			});

			if (error instanceof Error) {
				const squareErr: any = error as any;
				const errorMessage =
					squareErr.errors?.[0]?.detail ||
					squareErr.message ||
					'Refund processing failed';
				return {
					success: false,
					errorMessage,
				};
			}

			return {
				success: false,
				errorMessage: 'Refund processing failed. Please try again.',
			};
		}
	}

	/**
	 * Save payment method for future use
	 */
	async savePaymentMethod(params: {
		sourceId: string;
		userId: string;
		customerId?: string;
	}): Promise<{
		success: boolean;
		cardId?: string;
		errorMessage?: string;
	}> {
		try {
			const idempotencyKey = randomUUID();

			const createCardRequest = {
				idempotencyKey,
				sourceId: params.sourceId,
				card: {
					customerId: params.customerId,
				},
			};

			const { result } = await this.client.cards.create(createCardRequest);

			if (result.card) {
				// Store payment method in database
				const db = await getDb();
				await db.insert(paymentMethods).values({
					userId: params.userId,
					provider: 'square',
					type: 'card',
					token: result.card.id,
					last4: result.card.last4 || '',
					brand: result.card.cardBrand || '',
					metadata: {
						squareCardId: result.card.id,
						customerId: params.customerId,
					},
				} as any);

				logger.info('Square payment method saved successfully', {
					cardId: result.card.id,
					userId: params.userId,
					last4: result.card.last4,
				});

				return {
					success: true,
					cardId: result.card.id,
				};
			} else {
				logger.error('Square card creation failed - no card returned');
				return {
					success: false,
					errorMessage: 'Failed to save payment method',
				};
			}
		} catch (error) {
			logger.error('Square card creation error', {
				error,
				userId: params.userId,
			});

			if (error instanceof Error) {
				const squareErr: any = error as any;
				const errorMessage =
					squareErr.errors?.[0]?.detail ||
					squareErr.message ||
					'Failed to save payment method';
				return {
					success: false,
					errorMessage,
				};
			}

			return {
				success: false,
				errorMessage: 'Failed to save payment method',
			};
		}
	}

	/**
	 * Create customer for saved payment methods
	 */
	async createCustomer(params: {
		givenName?: string;
		familyName?: string;
		emailAddress?: string;
		phoneNumber?: string;
	}): Promise<{
		success: boolean;
		customerId?: string;
		errorMessage?: string;
	}> {
		try {
			const createCustomerRequest = {
				givenName: params.givenName,
				familyName: params.familyName,
				emailAddress: params.emailAddress,
				phoneNumber: params.phoneNumber,
			};

			const { result } = await this.client.customers.create(
				createCustomerRequest,
			);

			if (result.customer) {
				logger.info('Square customer created successfully', {
					customerId: result.customer.id,
					email: params.emailAddress,
				});

				return {
					success: true,
					customerId: result.customer.id,
				};
			} else {
				logger.error('Square customer creation failed - no customer returned');
				return {
					success: false,
					errorMessage: 'Customer creation failed',
				};
			}
		} catch (error) {
			logger.error('Square customer creation error', {
				error,
				email: params.emailAddress,
			});

			if (error instanceof Error) {
				const squareErr: any = error as any;
				const errorMessage =
					squareErr.errors?.[0]?.detail ||
					squareErr.message ||
					'Customer creation failed';
				return {
					success: false,
					errorMessage,
				};
			}

			return {
				success: false,
				errorMessage: 'Customer creation failed',
			};
		}
	}

	/**
	 * Webhook handler for Square events with proper signature verification
	 */
	async handleWebhook(
		payload: any,
		signature: string,
		rawBody?: string,
		notificationUrl?: string,
	): Promise<{
		success: boolean;
		message: string;
	}> {
		try {
			// Verify signature if key present
			if (config.square.webhookSignatureKey) {
				const verificationResult = this.verifyWebhookSignature(
					signature,
					payload,
					rawBody,
					notificationUrl,
				);
				if (!verificationResult.valid) {
					logger.warn('Square webhook signature verification failed', {
						reason: verificationResult.reason,
						signature: `${signature?.substring(0, 20)}...`,
						hasRawBody: !!rawBody,
						hasNotificationUrl: !!notificationUrl,
					});
					return { success: false, message: 'Invalid webhook signature' };
				}
				logger.info('Square webhook signature verified successfully');
			} else {
				logger.warn(
					'Square webhook signature key not configured - unable to verify webhook authenticity',
				);
			}

			const eventType = payload.type;
			const eventData = payload.data;

			switch (eventType) {
				case 'payment.updated':
					await this.handlePaymentUpdated(eventData);
					break;
				case 'refund.updated':
					await this.handleRefundUpdated(eventData);
					break;
				default:
					logger.info('Unhandled Square webhook event', { eventType });
			}

			return {
				success: true,
				message: 'Webhook processed successfully',
			};
		} catch (error) {
			logger.error('Square webhook processing error', { error, payload });
			return {
				success: false,
				message: 'Webhook processing failed',
			};
		}
	}

	// Raw variant with proper signature (URL + body)
	async handleWebhookRaw(
		rawBody: Buffer,
		signature: string,
		url: string,
	): Promise<{ success: boolean; message: string }> {
		try {
			if (config.square.webhookSignatureKey) {
				const hmac = crypto.createHmac(
					'sha256',
					config.square.webhookSignatureKey,
				);
				hmac.update(url + rawBody.toString());
				const expected = hmac.digest('base64');
				if (signature !== expected) {
					logger.warn('Square webhook signature mismatch (raw variant)');
					return { success: false, message: 'Invalid signature' };
				}
			}
			const payload = JSON.parse(rawBody.toString());
			return this.handleWebhook(payload, signature);
		} catch (err) {
			logger.error('Square raw webhook error', { err });
			return { success: false, message: 'Webhook processing failed' };
		}
	}

	private async handlePaymentUpdated(data: any): Promise<void> {
		try {
			const payment = data.object?.payment;
			if (!payment) {
return;
}

			const db = await getDb();
			await db
				.update(payments)
				.set({
					status: payment.status === 'COMPLETED' ? 'succeeded' : 'failed',
					updatedAt: new Date(),
				})
				.where(eq(payments.transactionId, payment.id));

			logger.info('Payment status updated from Square webhook', {
				paymentId: payment.id,
				status: payment.status,
			});
		} catch (error) {
			logger.error('Error handling Square payment updated webhook', {
				error,
				data,
			});
		}
	}

	private async handleRefundUpdated(data: any): Promise<void> {
		try {
			const refund = data.object?.refund;
			if (!refund) {
return;
}

			const db = await getDb();
			await db
				.update(refunds)
				.set({
					status: refund.status === 'COMPLETED' ? 'succeeded' : 'failed',
					updatedAt: new Date(),
				})
				.where(eq(refunds.transactionId, refund.id));

			logger.info('Refund status updated from Square webhook', {
				refundId: refund.id,
				status: refund.status,
			});
		} catch (error) {
			logger.error('Error handling Square refund updated webhook', {
				error,
				data,
			});
		}
	}

	/**
	 * Verify Square webhook signature according to their specification
	 * Square spec: signature = Base64( HMAC_SHA256( signatureKey, notificationUrl + body ) )
	 */
	private verifyWebhookSignature(
		providedSignature: string,
		payload: any,
		rawBody?: string,
		notificationUrl?: string,
	): { valid: boolean; reason?: string } {
		if (!config.square.webhookSignatureKey) {
			return { valid: false, reason: 'Webhook signature key not configured' };
		}

		if (!providedSignature) {
			return { valid: false, reason: 'No signature provided' };
		}

		try {
			// Method 1: Full Square specification (preferred)
			// Requires notification URL + raw body
			if (rawBody && notificationUrl) {
				const fullPayload = notificationUrl + rawBody;
				const hmac = crypto.createHmac(
					'sha256',
					config.square.webhookSignatureKey,
				);
				hmac.update(fullPayload, 'utf8');
				const expectedSignature = hmac.digest('base64');

				if (providedSignature === expectedSignature) {
					logger.info(
						'Webhook signature verified using full Square specification',
					);
					return { valid: true };
				}

				logger.debug('Full Square specification signature mismatch', {
					expected: `${expectedSignature.substring(0, 20)}...`,
					provided: `${providedSignature.substring(0, 20)}...`,
					notificationUrl: `${notificationUrl.substring(0, 50)}...`,
					bodyLength: rawBody.length,
				});
			}

			// Method 2: Raw body only (fallback)
			if (rawBody) {
				const hmac = crypto.createHmac(
					'sha256',
					config.square.webhookSignatureKey,
				);
				hmac.update(rawBody, 'utf8');
				const expectedSignature = hmac.digest('base64');

				if (providedSignature === expectedSignature) {
					logger.info('Webhook signature verified using raw body fallback');
					return { valid: true };
				}

				logger.debug('Raw body signature mismatch', {
					expected: `${expectedSignature.substring(0, 20)}...`,
					provided: `${providedSignature.substring(0, 20)}...`,
					bodyLength: rawBody.length,
				});
			}

			// Method 3: JSON string (legacy fallback)
			const bodyString = JSON.stringify(payload);
			const hmac = crypto.createHmac(
				'sha256',
				config.square.webhookSignatureKey,
			);
			hmac.update(bodyString, 'utf8');
			const expectedSignature = hmac.digest('base64');

			if (providedSignature === expectedSignature) {
				logger.warn(
					'Webhook signature verified using JSON string fallback - consider implementing proper raw body handling',
				);
				return { valid: true };
			}

			logger.debug('JSON string signature mismatch', {
				expected: `${expectedSignature.substring(0, 20)}...`,
				provided: `${providedSignature.substring(0, 20)}...`,
				jsonLength: bodyString.length,
			});

			return {
				valid: false,
				reason: 'All signature verification methods failed',
			};
		} catch (error) {
			logger.error('Webhook signature verification error', {
				error: error instanceof Error ? error.message : error,
				hasRawBody: !!rawBody,
				hasNotificationUrl: !!notificationUrl,
			});
			return { valid: false, reason: 'Signature verification threw an error' };
		}
	}

	/**
	 * Validate webhook payload structure
	 */
	private validateWebhookPayload(payload: any): {
		valid: boolean;
		reason?: string;
	} {
		if (!payload || typeof payload !== 'object') {
			return { valid: false, reason: 'Invalid payload: not an object' };
		}

		if (!payload.type || typeof payload.type !== 'string') {
			return {
				valid: false,
				reason: 'Invalid payload: missing or invalid type field',
			};
		}

		if (!payload.data) {
			return { valid: false, reason: 'Invalid payload: missing data field' };
		}

		// Check for required timestamp
		if (!payload.created_at) {
			return {
				valid: false,
				reason: 'Invalid payload: missing created_at timestamp',
			};
		}

		// Validate timestamp is recent (within last hour to prevent replay attacks)
		const createdAt = new Date(payload.created_at);
		const now = new Date();
		const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

		if (createdAt < oneHourAgo) {
			return {
				valid: false,
				reason: 'Webhook payload is too old (potential replay attack)',
			};
		}

		if (createdAt > new Date(now.getTime() + 5 * 60 * 1000)) {
			return {
				valid: false,
				reason: 'Webhook payload timestamp is in the future',
			};
		}

		return { valid: true };
	}

	/**
	 * Enhanced webhook processing with security checks
	 */
	async processWebhookSecurely(
		payload: any,
		signature: string,
		rawBody?: string,
		notificationUrl?: string,
	): Promise<{ success: boolean; message: string; processedEvent?: string }> {
		try {
			// Step 1: Validate payload structure
			const payloadValidation = this.validateWebhookPayload(payload);
			if (!payloadValidation.valid) {
				logger.warn('Invalid webhook payload', {
					reason: payloadValidation.reason,
				});
				return { success: false, message: 'Invalid payload structure' };
			}

			// Step 2: Verify signature
			const signatureValidation = this.verifyWebhookSignature(
				signature,
				payload,
				rawBody,
				notificationUrl,
			);
			if (!signatureValidation.valid) {
				logger.warn('Webhook signature verification failed', {
					reason: signatureValidation.reason,
					eventType: payload.type,
				});
				return { success: false, message: 'Signature verification failed' };
			}

			// Step 3: Process the webhook
			const result = await this.handleWebhook(
				payload,
				signature,
				rawBody,
				notificationUrl,
			);

			return {
				...result,
				processedEvent: payload.type,
			};
		} catch (error) {
			logger.error('Secure webhook processing error', {
				error: error instanceof Error ? error.message : error,
				eventType: payload?.type,
			});
			return {
				success: false,
				message: 'Internal processing error',
			};
		}
	}
}

// Export singleton instance
export const squarePaymentService = new SquarePaymentService();
