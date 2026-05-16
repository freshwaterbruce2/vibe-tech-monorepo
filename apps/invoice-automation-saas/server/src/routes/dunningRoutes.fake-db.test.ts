// @vitest-environment node
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  getPolicy: vi.fn(),
  upsertPolicy: vi.fn(),
  recordAudit: vi.fn(),
}));

vi.mock('../dunning/policy.js', () => ({
  getPolicy: state.getPolicy,
  upsertPolicy: state.upsertPolicy,
}));

vi.mock('../audit.js', () => ({
  recordAudit: state.recordAudit,
}));

import { registerDunningRoutes } from './dunningRoutes.js';

describe('dunning routes with fake db', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    state.getPolicy.mockReturnValue({
      enabled: true,
      reminders: [{ daysAfterDue: 3, channel: 'email' }],
    });
    state.upsertPolicy.mockImplementation((_db, _userId, input) => ({
      enabled: input.enabled,
      reminders: input.reminders,
    }));

    app = Fastify();
    app.addHook('preHandler', async (req) => {
      (req as unknown as { authUserId: string }).authUserId = 'user-1';
    });
    registerDunningRoutes(app, { kind: 'db' } as never);
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns the shared dunning policy for the authenticated user', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/dunning/policy',
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      policy: {
        enabled: true,
        reminders: [{ daysAfterDue: 3, channel: 'email' }],
      },
    });
    expect(state.getPolicy).toHaveBeenCalledWith(expect.anything(), 'user-1');
  });

  it('updates the shared dunning policy and records an audit entry', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/dunning/policy',
      payload: {
        enabled: false,
        reminders: [{ daysAfterDue: 7, channel: 'email' }],
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      policy: {
        enabled: false,
        reminders: [{ daysAfterDue: 7, channel: 'email' }],
      },
    });
    expect(state.upsertPolicy).toHaveBeenCalledWith(expect.anything(), 'user-1', {
      enabled: false,
      reminders: [{ daysAfterDue: 7, channel: 'email' }],
    });
    expect(state.recordAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'dunning.policy_updated',
        entityType: 'dunning_policy',
        entityId: 'user-1',
        actorUserId: 'user-1',
        metadata: {
          enabled: false,
          reminders: [{ daysAfterDue: 7, channel: 'email' }],
        },
      }),
    );
  });

  it('returns a 400 when the shared policy bridge rejects invalid reminders', async () => {
    state.upsertPolicy.mockImplementation(() => {
      throw new Error('Reminder days must be strictly increasing');
    });

    const res = await app.inject({
      method: 'PUT',
      url: '/api/dunning/policy',
      payload: {
        enabled: true,
        reminders: [
          { daysAfterDue: 7, channel: 'email' },
          { daysAfterDue: 3, channel: 'email' },
        ],
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({
      error: 'Reminder days must be strictly increasing',
    });
    expect(state.recordAudit).not.toHaveBeenCalled();
  });
});
