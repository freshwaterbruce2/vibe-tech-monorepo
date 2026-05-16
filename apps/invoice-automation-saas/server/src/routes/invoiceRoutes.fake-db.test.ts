// @vitest-environment node
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
	resolveRecurringEnabled: true,
	createRecurringSchedule: vi.fn(),
	enqueueJob: vi.fn(),
	emitEvent: vi.fn(),
	getRate: vi.fn(async () => 1),
}));

vi.mock('../entitlements.js', () => ({
	INVOICE_SAAS_FEATURES: {
		recurringBilling: 'recurring.billing',
	},
	resolveUserEntitlement: vi.fn(() => ({
		featureKey: 'recurring.billing',
		plan: state.resolveRecurringEnabled ? 'legacy' : 'free',
		enabled: state.resolveRecurringEnabled,
	})),
}));

vi.mock('../events.js', () => ({
	events: {
		emitEvent: state.emitEvent,
	},
}));

vi.mock('../fx/cache.js', () => ({
	getRate: state.getRate,
}));

vi.mock('../jobs/enqueue.js', () => ({
	enqueueJob: state.enqueueJob,
}));

vi.mock('./recurringRoutes.js', () => ({
	createRecurringSchedule: state.createRecurringSchedule,
}));

import { registerInvoiceRoutes } from './invoiceRoutes.js';

interface UserRow {
	id: string;
	default_currency: string;
}

interface ClientRecord {
	id: string;
	user_id: string;
	name: string;
	email: string;
	phone: string | null;
	company: string | null;
	address: string | null;
	created_at: string;
	updated_at: string;
}

interface InvoiceRecord {
	id: string;
	user_id: string;
	invoice_number: string;
	client_id: string;
	issue_date: string;
	due_date: string;
	subtotal: number;
	tax: number;
	total: number;
	status: string;
	notes: string | null;
	terms: string | null;
	currency: string;
	recurring_json: string | null;
	parent_invoice_id: string | null;
	public_token: string;
	tax_strategy: 'invoice' | 'item';
	created_at: string;
	updated_at: string;
	exchange_rate_to_user_currency?: number | null;
	user_currency_at_issue?: string | null;
}

interface InvoiceItemRecord {
	id: string;
	invoice_id: string;
	description: string;
	quantity: number;
	price: number;
	total: number;
	tax_rate_id: string | null;
	created_at: string;
}

interface RunResult {
	changes: number;
}

class FakeStatement {
	constructor(
		private readonly sql: string,
		private readonly db: FakeDb,
	) {}

	get(...params: unknown[]): unknown {
		if (this.sql.startsWith('select * from clients where user_id = ? and email = ?')) {
			const [userId, email] = params as [string, string];
			return (
				[...this.db.clients.values()].find(
					(client) => client.user_id === userId && client.email === email,
				) ?? null
			);
		}

		if (this.sql.startsWith('SELECT default_currency FROM users WHERE id = ?')) {
			const [userId] = params as [string];
			const user = this.db.users.get(userId);
			return user ? { default_currency: user.default_currency } : undefined;
		}

		if (this.sql.startsWith('select * from invoices where id = ?')) {
			const [invoiceId] = params as [string];
			return this.db.invoices.get(invoiceId);
		}

		if (this.sql.startsWith('select * from clients where id = ?')) {
			const [clientId] = params as [string];
			return this.db.clients.get(clientId);
		}

		throw new Error(`Unsupported fake-db get SQL: ${this.sql}`);
	}

	all(...params: unknown[]): unknown[] {
		if (
			this.sql.startsWith(
				'select * from invoice_items where invoice_id = ? order by created_at asc',
			)
		) {
			const [invoiceId] = params as [string];
			return this.db.invoiceItems
				.filter((item) => item.invoice_id === invoiceId)
				.sort((left, right) => left.created_at.localeCompare(right.created_at));
		}

		if (this.sql.includes('FROM expenses WHERE id IN')) {
			return [];
		}

		if (this.sql.includes('FROM time_entries WHERE id IN')) {
			return [];
		}

		if (this.sql.includes('SELECT id, name FROM projects WHERE id IN')) {
			return [];
		}

		throw new Error(`Unsupported fake-db all SQL: ${this.sql}`);
	}

	run(...params: unknown[]): RunResult {
		if (
			this.sql.startsWith(
				'insert into clients (id, user_id, name, email, phone, company, address, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?, ?, ?)',
			)
		) {
			const [
				id,
				userId,
				name,
				email,
				phone,
				company,
				address,
				createdAt,
				updatedAt,
			] = params as [
				string,
				string,
				string,
				string,
				string | null,
				string | null,
				string | null,
				string,
				string,
			];
			this.db.clients.set(id, {
				id,
				user_id: userId,
				name,
				email,
				phone,
				company,
				address,
				created_at: createdAt,
				updated_at: updatedAt,
			});
			return { changes: 1 };
		}

		if (
			this.sql.startsWith(
				'update clients set name = ?, phone = ?, company = ?, address = ?, updated_at = ? where id = ?',
			)
		) {
			const [name, phone, company, address, updatedAt, clientId] = params as [
				string,
				string | null,
				string | null,
				string | null,
				string,
				string,
			];
			const existing = this.db.clients.get(clientId);
			if (!existing) {
				return { changes: 0 };
			}
			this.db.clients.set(clientId, {
				...existing,
				name,
				phone,
				company,
				address,
				updated_at: updatedAt,
			});
			return { changes: 1 };
		}

		if (this.sql.startsWith('insert into invoices')) {
			const [
				id,
				userId,
				invoiceNumber,
				clientId,
				issueDate,
				dueDate,
				subtotal,
				tax,
				total,
				status,
				notes,
				terms,
				currency,
				recurringJson,
				parentInvoiceId,
				publicToken,
				taxStrategy,
				createdAt,
				updatedAt,
			] = params as [
				string,
				string,
				string,
				string,
				string,
				string,
				number,
				number,
				number,
				string,
				string | null,
				string | null,
				string,
				string | null,
				string | null,
				string,
				'invoice' | 'item',
				string,
				string,
			];
			this.db.invoices.set(id, {
				id,
				user_id: userId,
				invoice_number: invoiceNumber,
				client_id: clientId,
				issue_date: issueDate,
				due_date: dueDate,
				subtotal,
				tax,
				total,
				status,
				notes,
				terms,
				currency,
				recurring_json: recurringJson,
				parent_invoice_id: parentInvoiceId,
				public_token: publicToken,
				tax_strategy: taxStrategy,
				created_at: createdAt,
				updated_at: updatedAt,
			});
			return { changes: 1 };
		}

		if (this.sql.startsWith('insert into invoice_items')) {
			const [
				id,
				invoiceId,
				description,
				quantity,
				price,
				total,
				taxRateId,
				createdAt,
			] = params as [
				string,
				string,
				string,
				number,
				number,
				number,
				string | null,
				string,
			];
			this.db.invoiceItems.push({
				id,
				invoice_id: invoiceId,
				description,
				quantity,
				price,
				total,
				tax_rate_id: taxRateId,
				created_at: createdAt,
			});
			return { changes: 1 };
		}

		if (this.sql.startsWith('UPDATE invoices')) {
			const existing = this.db.invoices.get(params[params.length - 1] as string);
			if (!existing) {
				return { changes: 0 };
			}

			if (this.sql.includes('user_currency_at_issue = ?') && this.sql.includes('WHERE id = ?')) {
				if (params.length === 2) {
					const [userCurrency, invoiceId] = params as [string, string];
					this.db.invoices.set(invoiceId, {
						...existing,
						user_currency_at_issue: userCurrency,
					});
					return { changes: 1 };
				}

				const [rate, userCurrency, invoiceId] = params as [number, string, string];
				this.db.invoices.set(invoiceId, {
					...existing,
					exchange_rate_to_user_currency: rate,
					user_currency_at_issue: userCurrency,
				});
				return { changes: 1 };
			}
		}

		throw new Error(`Unsupported fake-db run SQL: ${this.sql}`);
	}
}

class FakeDb {
	users = new Map<string, UserRow>();
	clients = new Map<string, ClientRecord>();
	invoices = new Map<string, InvoiceRecord>();
	invoiceItems: InvoiceItemRecord[] = [];

	prepare(sql: string): FakeStatement {
		return new FakeStatement(sql, this);
	}

	transaction<T extends (...args: never[]) => unknown>(fn: T): T {
		return fn;
	}
}

const buildInvoiceBody = (overrides: Record<string, unknown> = {}) => ({
	invoiceNumber: 'INV-100',
	issueDate: '2026-05-01',
	dueDate: '2026-05-31',
	currency: 'USD',
	status: 'draft',
	client: { name: 'Acme', email: 'acme@example.com' },
	items: [{ description: 'Service', quantity: 2, price: 100, total: 200 }],
	tax: 0,
	...overrides,
});

describe('POST /api/invoices recurring entitlement with fake db', () => {
	let app: FastifyInstance;
	let db: FakeDb;

	beforeEach(async () => {
		vi.clearAllMocks();
		db = new FakeDb();
		db.users.set('user-1', { id: 'user-1', default_currency: 'USD' });

		app = Fastify();
		app.addHook('preHandler', async (req) => {
			(req as unknown as { authUserId: string }).authUserId = 'user-1';
		});
		registerInvoiceRoutes(app, db as never);
		await app.ready();
	});

	afterEach(async () => {
		await app.close();
	});

	it('rejects recurring invoice creation before any writes when the plan is not entitled', async () => {
		state.resolveRecurringEnabled = false;

		const res = await app.inject({
			method: 'POST',
			url: '/api/invoices',
			payload: buildInvoiceBody({
				recurring: {
					enabled: true,
					frequency: 'monthly',
					interval: 2,
				},
			}),
		});

		expect(res.statusCode).toBe(403);
		expect(res.json()).toEqual({
			error: 'Recurring billing is not enabled for your plan',
		});
		expect(db.clients.size).toBe(0);
		expect(db.invoices.size).toBe(0);
		expect(db.invoiceItems).toEqual([]);
		expect(state.enqueueJob).not.toHaveBeenCalled();
		expect(state.createRecurringSchedule).not.toHaveBeenCalled();
		expect(state.emitEvent).not.toHaveBeenCalled();
	});

	it('creates the invoice and delegates recurring schedule creation when entitlement is enabled', async () => {
		state.resolveRecurringEnabled = true;

		const res = await app.inject({
			method: 'POST',
			url: '/api/invoices',
			payload: buildInvoiceBody({
				recurring: {
					enabled: true,
					frequency: 'monthly',
					interval: 2,
				},
			}),
		});

		expect(res.statusCode).toBe(200);
		expect(db.clients.size).toBe(1);
		expect(db.invoices.size).toBe(1);
		expect(db.invoiceItems).toHaveLength(1);
		const invoice = res.json() as {
			invoice: { id: string; invoiceNumber: string; recurring: { enabled: boolean } };
		};
		expect(invoice.invoice.invoiceNumber).toBe('INV-100');
		expect(invoice.invoice.recurring).toEqual({
			enabled: true,
			frequency: 'monthly',
			interval: 2,
		});
		expect(state.createRecurringSchedule).toHaveBeenCalledTimes(1);
		expect(state.createRecurringSchedule).toHaveBeenCalledWith(
			db,
			expect.objectContaining({
				userId: 'user-1',
				templateInvoiceId: invoice.invoice.id,
				frequency: 'monthly',
				intervalCount: 2,
				endType: 'never',
				endDate: null,
				occurrencesRemaining: null,
			}),
		);
		expect(state.emitEvent).toHaveBeenCalledWith({
			type: 'invoices:changed',
			userId: 'user-1',
		});
	});
});
