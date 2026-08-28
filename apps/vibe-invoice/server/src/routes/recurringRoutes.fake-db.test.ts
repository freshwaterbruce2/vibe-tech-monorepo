// @vitest-environment node
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
	resolveRecurringEnabled: true,
	recordAudit: vi.fn(),
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

vi.mock('../audit.js', () => ({
	recordAudit: state.recordAudit,
}));

import { registerRecurringRoutes } from './recurringRoutes.js';

interface ScheduleRecord {
	id: string;
	user_id: string;
	template_invoice_id: string;
	frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
	interval_count: number;
	next_run_at: string;
	end_type: 'never' | 'date' | 'occurrences';
	end_date: string | null;
	occurrences_remaining: number | null;
	status: 'active' | 'paused' | 'ended';
	created_at: string;
	updated_at: string;
}

class FakeStatement {
	constructor(
		private readonly sql: string,
		private readonly db: FakeDb,
	) {}

	get(...params: unknown[]): unknown {
		if (this.sql.startsWith('SELECT user_id FROM recurring_schedules WHERE id = ?')) {
			const [scheduleId] = params as [string];
			const row = this.db.schedules.get(scheduleId);
			return row ? { user_id: row.user_id } : undefined;
		}

		if (this.sql.startsWith('SELECT * FROM recurring_schedules WHERE id = ?')) {
			const [scheduleId] = params as [string];
			return this.db.schedules.get(scheduleId);
		}

		throw new Error(`Unsupported fake-db get SQL: ${this.sql}`);
	}

	all(...params: unknown[]): unknown[] {
		if (this.sql.includes('WHERE user_id = ?')) {
			const [userId] = params as [string];
			return [...this.db.schedules.values()]
				.filter((schedule) => schedule.user_id === userId)
				.sort((left, right) => left.next_run_at.localeCompare(right.next_run_at));
		}

		throw new Error(`Unsupported fake-db all SQL: ${this.sql}`);
	}

	run(...params: unknown[]): { changes: number } {
		if (this.sql.includes('UPDATE recurring_schedules')) {
			if (this.sql.includes("SET status = 'ended'")) {
				const [updatedAt, scheduleId] = params as [string, string];
				const existing = this.db.schedules.get(scheduleId);
				if (!existing) {
					return { changes: 0 };
				}
				this.db.schedules.set(scheduleId, {
					...existing,
					status: 'ended',
					updated_at: updatedAt,
				});
				return { changes: 1 };
			}

			const scheduleId = params[params.length - 1] as string;
			const existing = this.db.schedules.get(scheduleId);
			if (!existing) {
				return { changes: 0 };
			}

			const updated = { ...existing };
			const assignments = this.sql
				.slice(this.sql.indexOf('SET') + 3, this.sql.lastIndexOf('WHERE'))
				.split(',')
				.map((part) => part.trim());

			let index = 0;
			for (const assignment of assignments) {
				const field = assignment.split('=')[0]?.trim();
				if (!field) {
					continue;
				}
				const value = params[index++];
				switch (field) {
					case 'status':
						updated.status = value as ScheduleRecord['status'];
						break;
					case 'next_run_at':
						updated.next_run_at = value as string;
						break;
					case 'frequency':
						updated.frequency = value as ScheduleRecord['frequency'];
						break;
					case 'interval_count':
						updated.interval_count = value as number;
						break;
					case 'end_type':
						updated.end_type = value as ScheduleRecord['end_type'];
						break;
					case 'end_date':
						updated.end_date = value as string | null;
						break;
					case 'occurrences_remaining':
						updated.occurrences_remaining = value as number | null;
						break;
					case 'updated_at':
						updated.updated_at = value as string;
						break;
					default:
						throw new Error(`Unsupported recurring update field: ${field}`);
				}
			}

			this.db.schedules.set(scheduleId, updated);
			return { changes: 1 };
		}

		throw new Error(`Unsupported fake-db run SQL: ${this.sql}`);
	}
}

class FakeDb {
	schedules = new Map<string, ScheduleRecord>();

	prepare(sql: string): FakeStatement {
		return new FakeStatement(sql, this);
	}
}

const seedSchedule = (overrides: Partial<ScheduleRecord> = {}): ScheduleRecord => ({
	id: overrides.id ?? 'sched-1',
	user_id: overrides.user_id ?? 'user-1',
	template_invoice_id: overrides.template_invoice_id ?? 'inv-1',
	frequency: overrides.frequency ?? 'monthly',
	interval_count: overrides.interval_count ?? 1,
	next_run_at: overrides.next_run_at ?? '2026-06-01T00:00:00.000Z',
	end_type: overrides.end_type ?? 'never',
	end_date: overrides.end_date ?? null,
	occurrences_remaining: overrides.occurrences_remaining ?? null,
	status: overrides.status ?? 'active',
	created_at: overrides.created_at ?? '2026-05-01T00:00:00.000Z',
	updated_at: overrides.updated_at ?? '2026-05-01T00:00:00.000Z',
});

describe('recurring routes with fake db', () => {
	let db: FakeDb;
	let app: FastifyInstance;

	beforeEach(async () => {
		vi.clearAllMocks();
		state.resolveRecurringEnabled = true;
		db = new FakeDb();
		db.schedules.set('sched-1', seedSchedule());
		db.schedules.set(
			'sched-2',
			seedSchedule({
				id: 'sched-2',
				next_run_at: '2026-07-01T00:00:00.000Z',
			}),
		);

		app = Fastify();
		app.addHook('preHandler', async (req) => {
			(req as unknown as { authUserId: string }).authUserId = 'user-1';
		});
		registerRecurringRoutes(app, db as never);
		await app.ready();
	});

	afterEach(async () => {
		await app.close();
	});

	it('lists schedules for the authenticated user', async () => {
		const res = await app.inject({
			method: 'GET',
			url: '/api/recurring',
		});

		expect(res.statusCode).toBe(200);
		const body = res.json() as { schedules: Array<{ id: string }> };
		expect(body.schedules.map((schedule) => schedule.id)).toEqual(['sched-1', 'sched-2']);
	});

	it('rejects updates when recurring billing is not enabled', async () => {
		state.resolveRecurringEnabled = false;

		const res = await app.inject({
			method: 'PATCH',
			url: '/api/recurring/sched-1',
			payload: {
				status: 'paused',
			},
		});

		expect(res.statusCode).toBe(403);
		expect(res.json()).toEqual({
			error: 'Recurring billing is not enabled for your plan',
		});
		expect(db.schedules.get('sched-1')?.status).toBe('active');
		expect(state.recordAudit).not.toHaveBeenCalled();
	});

	it('updates a schedule and records an audit entry when entitled', async () => {
		const res = await app.inject({
			method: 'PATCH',
			url: '/api/recurring/sched-1',
			payload: {
				status: 'paused',
				frequency: 'quarterly',
				interval_count: 2,
				end_type: 'occurrences',
				occurrences_remaining: 4,
			},
		});

		expect(res.statusCode).toBe(200);
		const updated = db.schedules.get('sched-1');
		expect(updated).toMatchObject({
			status: 'paused',
			frequency: 'quarterly',
			interval_count: 2,
			end_type: 'occurrences',
			occurrences_remaining: 4,
		});
		expect(state.recordAudit).toHaveBeenCalledWith(
			db,
			expect.objectContaining({
				action: 'recurring.updated',
				entityType: 'recurring_schedule',
				entityId: 'sched-1',
				actorUserId: 'user-1',
				metadata: {
					status: 'paused',
					frequency: 'quarterly',
					interval_count: 2,
					end_type: 'occurrences',
					occurrences_remaining: 4,
				},
			}),
		);
	});

	it('ends a schedule and returns 204 when entitled', async () => {
		const res = await app.inject({
			method: 'DELETE',
			url: '/api/recurring/sched-1',
		});

		expect(res.statusCode).toBe(204);
		expect(db.schedules.get('sched-1')?.status).toBe('ended');
		expect(state.recordAudit).toHaveBeenCalledWith(
			db,
			expect.objectContaining({
				action: 'recurring.ended',
				entityType: 'recurring_schedule',
				entityId: 'sched-1',
				actorUserId: 'user-1',
			}),
		);
	});
});
