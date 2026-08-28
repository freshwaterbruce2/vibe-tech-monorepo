// @vitest-environment node
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
	verifyWebhookSignature: vi.fn(),
	resendVerify: vi.fn(),
	recordAudit: vi.fn(),
	enqueueJob: vi.fn(),
	emitEvent: vi.fn(),
}));

vi.mock('../payments/stripeAdapter.js', () => ({
	verifyWebhookSignature: state.verifyWebhookSignature,
}));

vi.mock('../audit.js', () => ({
	recordAudit: state.recordAudit,
}));

vi.mock('../jobs/enqueue.js', () => ({
	enqueueJob: state.enqueueJob,
}));

vi.mock('../events.js', () => ({
	events: {
		emitEvent: state.emitEvent,
	},
}));

vi.mock('svix', () => ({
	Webhook: class MockWebhook {
		constructor(_secret: string) {}

		verify(body: string, headers: Record<string, string>) {
			return state.resendVerify(body, headers);
		}
	},
}));

import { registerWebhookRoutes } from './webhookRoutes.js';

interface InvoiceRecord {
	id: string;
	user_id: string;
	currency: string;
	status: string;
}

interface PaymentRecord {
	invoice_id: string;
	amount: number;
	currency: string;
	method: string;
	stripe_payment_intent_id: string | null;
	stripe_checkout_session_id: string;
}

interface EmailLogRecord {
	resend_message_id: string;
	status: string;
	error: string | null;
}

class FakeStatement {
	constructor(
		private readonly sql: string,
		private readonly db: FakeDb,
	) {}

	get(...params: unknown[]): unknown {
		if (this.sql.startsWith('SELECT id, user_id, currency FROM invoices WHERE id = ?')) {
			const [invoiceId] = params as [string];
			return this.db.invoices.get(invoiceId);
		}

		throw new Error(`Unsupported fake-db get SQL: ${this.sql}`);
	}

	run(...params: unknown[]): { changes: number } {
		if (this.sql.startsWith('INSERT OR IGNORE INTO stripe_events')) {
			const [eventId] = params as [string];
			if (this.db.stripeEventIds.has(eventId)) {
				return { changes: 0 };
			}
			this.db.stripeEventIds.add(eventId);
			return { changes: 1 };
		}

		if (this.sql.startsWith('INSERT INTO payments')) {
			const [, invoiceId, amount, currency, paymentIntentId, sessionId] = params as [
				string,
				string,
				number,
				string,
				string | null,
				string,
			];
			this.db.payments.push({
				invoice_id: invoiceId,
				amount,
				currency,
				method: 'stripe',
				stripe_payment_intent_id: paymentIntentId,
				stripe_checkout_session_id: sessionId,
			});
			return { changes: 1 };
		}

		if (this.sql.startsWith("UPDATE invoices SET status='paid', updated_at=? WHERE id=?")) {
			const [, invoiceId] = params as [string, string];
			const invoice = this.db.invoices.get(invoiceId);
			if (!invoice) {
				return { changes: 0 };
			}
			this.db.invoices.set(invoiceId, {
				...invoice,
				status: 'paid',
			});
			return { changes: 1 };
		}

		if (this.sql.startsWith('UPDATE email_log')) {
			const [status, error, messageId] = params as [string, string | null, string];
			const existing = this.db.emailLog.get(messageId);
			if (!existing) {
				return { changes: 0 };
			}
			this.db.emailLog.set(messageId, {
				...existing,
				status,
				error,
			});
			return { changes: 1 };
		}

		throw new Error(`Unsupported fake-db run SQL: ${this.sql}`);
	}
}

class FakeDb {
	invoices = new Map<string, InvoiceRecord>();
	payments: PaymentRecord[] = [];
	stripeEventIds = new Set<string>();
	emailLog = new Map<string, EmailLogRecord>();

	prepare(sql: string): FakeStatement {
		return new FakeStatement(sql, this);
	}

	transaction<T extends (...args: never[]) => unknown>(fn: T): T {
		return fn;
	}
}

describe('webhook routes with fake db', () => {
	let db: FakeDb;
	let app: FastifyInstance;

	beforeEach(async () => {
		vi.clearAllMocks();
		process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
		process.env.RESEND_WEBHOOK_SECRET = 'resendsec_test';

		db = new FakeDb();
		db.invoices.set('inv-1', {
			id: 'inv-1',
			user_id: 'user-1',
			currency: 'USD',
			status: 'sent',
		});
		db.emailLog.set('msg-1', {
			resend_message_id: 'msg-1',
			status: 'queued',
			error: null,
		});

		app = Fastify();
		await registerWebhookRoutes(app, db as never);
		await app.ready();
	});

	afterEach(async () => {
		await app.close();
		delete process.env.STRIPE_WEBHOOK_SECRET;
		delete process.env.RESEND_WEBHOOK_SECRET;
	});

	it('marks invoice paid, records audit, queues receipt email, and emits change event for a checkout completion', async () => {
		state.verifyWebhookSignature.mockReturnValue({
			id: 'evt_test_1',
			type: 'checkout.session.completed',
			data: {
				object: {
					id: 'cs_test_1',
					amount_total: 12550,
					currency: 'usd',
					payment_intent: 'pi_test_1',
					metadata: {
						invoice_id: 'inv-1',
					},
				},
			},
		});

		const res = await app.inject({
			method: 'POST',
			url: '/api/webhooks/stripe',
			headers: {
				'stripe-signature': 'sig_test',
				'content-type': 'application/json',
			},
			payload: Buffer.from('{"ok":true}', 'utf8'),
		});

		expect(res.statusCode).toBe(200);
		expect(db.invoices.get('inv-1')?.status).toBe('paid');
		expect(db.payments).toEqual([
			{
				invoice_id: 'inv-1',
				amount: 125.5,
				currency: 'USD',
				method: 'stripe',
				stripe_payment_intent_id: 'pi_test_1',
				stripe_checkout_session_id: 'cs_test_1',
			},
		]);
		expect(state.recordAudit).toHaveBeenCalledWith(
			db,
			expect.objectContaining({
				action: 'invoice.paid',
				entityType: 'invoice',
				entityId: 'inv-1',
				metadata: expect.objectContaining({
					stripe_event_id: 'evt_test_1',
					stripe_session_id: 'cs_test_1',
					amount: 125.5,
					currency: 'USD',
				}),
			}),
		);
		expect(state.enqueueJob).toHaveBeenCalledWith(
			db,
			expect.objectContaining({
				type: 'email.receipt',
				payload: expect.objectContaining({
					invoiceId: 'inv-1',
				}),
			}),
		);
		expect(state.emitEvent).toHaveBeenCalledWith({
			type: 'invoices:changed',
			userId: 'user-1',
		});
	});

	it('treats duplicate Stripe webhook ids as no-op', async () => {
		db.stripeEventIds.add('evt_dup');
		state.verifyWebhookSignature.mockReturnValue({
			id: 'evt_dup',
			type: 'checkout.session.completed',
			data: {
				object: {
					id: 'cs_dup',
					amount_total: 1000,
					currency: 'usd',
					metadata: { invoice_id: 'inv-1' },
				},
			},
		});

		const res = await app.inject({
			method: 'POST',
			url: '/api/webhooks/stripe',
			headers: {
				'stripe-signature': 'sig_dup',
				'content-type': 'application/json',
			},
			payload: Buffer.from('{}', 'utf8'),
		});

		expect(res.statusCode).toBe(200);
		expect(res.json()).toEqual({
			ok: true,
			duplicate: true,
		});
		expect(db.payments).toEqual([]);
		expect(state.recordAudit).not.toHaveBeenCalled();
		expect(state.enqueueJob).not.toHaveBeenCalled();
		expect(state.emitEvent).not.toHaveBeenCalled();
	});

	it('updates resend delivery state without touching the Stripe path', async () => {
		state.resendVerify.mockReturnValue({
			type: 'email.delivered',
			data: {
				email_id: 'msg-1',
			},
		});

		const res = await app.inject({
			method: 'POST',
			url: '/api/webhooks/resend',
			headers: {
				'svix-id': 'id-1',
				'svix-timestamp': '12345',
				'svix-signature': 'sig-1',
				'content-type': 'application/json',
			},
			payload: Buffer.from('{"type":"email.delivered"}', 'utf8'),
		});

		expect(res.statusCode).toBe(200);
		expect(res.json()).toEqual({
			ok: true,
			updated: 1,
		});
		expect(db.emailLog.get('msg-1')).toEqual({
			resend_message_id: 'msg-1',
			status: 'delivered',
			error: null,
		});
		expect(state.verifyWebhookSignature).not.toHaveBeenCalled();
	});
});
