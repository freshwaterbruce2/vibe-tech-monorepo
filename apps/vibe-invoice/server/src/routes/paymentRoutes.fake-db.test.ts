// @vitest-environment node
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
	buildCheckoutSession: vi.fn(),
}));

vi.mock('../payments/stripeAdapter.js', () => ({
	buildCheckoutSession: state.buildCheckoutSession,
}));

import { registerPaymentRoutes } from './paymentRoutes.js';

interface InvoiceRecord {
	id: string;
	user_id: string;
	total: number;
	currency: string;
	invoice_number: string;
	status: string;
	public_token: string | null;
	client_id: string;
}

interface ClientRecord {
	id: string;
	email: string | null;
}

interface AuditRecord {
	action: string;
	entity_type: string;
	entity_id: string | null;
	metadata_json: string | null;
}

class FakeStatement {
	constructor(
		private readonly sql: string,
		private readonly db: FakeDb,
	) {}

	get(...params: unknown[]): unknown {
		if (this.sql.includes('FROM invoices WHERE id = ?')) {
			const [invoiceId] = params as [string];
			return this.db.invoices.get(invoiceId);
		}

		if (this.sql.includes('SELECT c.email FROM clients c')) {
			const [invoiceId] = params as [string];
			const invoice = this.db.invoices.get(invoiceId);
			if (!invoice) {
				return undefined;
			}
			const client = this.db.clients.get(invoice.client_id);
			return client ? { email: client.email } : undefined;
		}

		throw new Error(`Unsupported fake-db get SQL: ${this.sql}`);
	}

	run(...params: unknown[]): { changes: number } {
		if (this.sql.startsWith('INSERT INTO audit_log')) {
			const [, , action, entityType, entityId, metadataJson] = params as [
				string,
				string | null,
				string,
				string,
				string | null,
				string | null,
			];
			this.db.auditLog.push({
				action,
				entity_type: entityType,
				entity_id: entityId,
				metadata_json: metadataJson,
			});
			return { changes: 1 };
		}

		throw new Error(`Unsupported fake-db run SQL: ${this.sql}`);
	}
}

class FakeDb {
	invoices = new Map<string, InvoiceRecord>();
	clients = new Map<string, ClientRecord>();
	auditLog: AuditRecord[] = [];

	prepare(sql: string): FakeStatement {
		return new FakeStatement(sql, this);
	}
}

describe('POST /api/public/invoices/:id/checkout-session with fake db', () => {
	let db: FakeDb;
	let app: FastifyInstance;

	beforeEach(async () => {
		vi.clearAllMocks();
		process.env.APP_BASE_URL = 'https://app.example.com';
		db = new FakeDb();
		db.clients.set('client-1', {
			id: 'client-1',
			email: 'acme@example.com',
		});
		db.invoices.set('inv-1', {
			id: 'inv-1',
			user_id: 'user-1',
			total: 125.5,
			currency: 'USD',
			invoice_number: 'INV-100',
			status: 'sent',
			public_token: 'tok-123',
			client_id: 'client-1',
		});

		app = Fastify();
		registerPaymentRoutes(app, db as never);
		await app.ready();
	});

	afterEach(async () => {
		await app.close();
		delete process.env.APP_BASE_URL;
	});

	it('creates a checkout session through the shared billing bridge and records an audit row', async () => {
		state.buildCheckoutSession.mockResolvedValue({
			id: 'cs_test_123',
			url: 'https://checkout.stripe.test/session/cs_test_123',
		});

		const res = await app.inject({
			method: 'POST',
			url: '/api/public/invoices/inv-1/checkout-session',
			payload: {
				token: 'tok-123',
			},
		});

		expect(res.statusCode).toBe(200);
		expect(res.json()).toEqual({
			url: 'https://checkout.stripe.test/session/cs_test_123',
		});
		expect(state.buildCheckoutSession).toHaveBeenCalledWith({
			currency: 'USD',
			successUrl: 'https://app.example.com/pay/inv-1?token=tok-123&status=success',
			cancelUrl: 'https://app.example.com/pay/inv-1?token=tok-123&status=canceled',
			customerEmail: 'acme@example.com',
			metadata: {
				invoice_id: 'inv-1',
				public_token: 'tok-123',
				invoice_number: 'INV-100',
			},
			lineItems: [
				{
					name: 'Invoice INV-100',
					unitAmount: 125.5,
				},
			],
		});
		expect(db.auditLog).toHaveLength(1);
		expect(db.auditLog[0]).toEqual({
			action: 'payment.checkout_session_created',
			entity_type: 'invoice',
			entity_id: 'inv-1',
			metadata_json: JSON.stringify({ stripe_session_id: 'cs_test_123' }),
		});
	});

	it('returns 409 for already-paid invoices without calling the billing bridge', async () => {
		db.invoices.set('inv-paid', {
			...db.invoices.get('inv-1')!,
			id: 'inv-paid',
			status: 'paid',
		});

		const res = await app.inject({
			method: 'POST',
			url: '/api/public/invoices/inv-paid/checkout-session',
			payload: {
				token: 'tok-123',
			},
		});

		expect(res.statusCode).toBe(409);
		expect(res.json()).toEqual({
			error: 'Invoice is already paid',
		});
		expect(state.buildCheckoutSession).not.toHaveBeenCalled();
		expect(db.auditLog).toEqual([]);
	});
});
