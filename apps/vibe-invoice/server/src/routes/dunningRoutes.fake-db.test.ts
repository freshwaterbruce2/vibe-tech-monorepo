// @vitest-environment node
import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  getPolicy: vi.fn(),
  upsertPolicy: vi.fn(),
  recordAudit: vi.fn(),
  prepare: vi.fn(),
  draftPaymentReminder: vi.fn(),
  sendDraftReminder: vi.fn(),
}));

vi.mock('../dunning/policy.js', () => ({
  getPolicy: state.getPolicy,
  upsertPolicy: state.upsertPolicy,
}));

vi.mock('../audit.js', () => ({
  recordAudit: state.recordAudit,
}));

vi.mock('../clients/aiGateway.js', () => ({
  draftPaymentReminder: state.draftPaymentReminder,
}));

vi.mock('../email/send.js', () => ({
  sendDraftReminder: state.sendDraftReminder,
}));

import { registerDunningRoutes } from './dunningRoutes.js';

describe('dunning routes with fake db', () => {
  let app: FastifyInstance;
  let fakeDb: { prepare: typeof state.prepare };

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
    state.draftPaymentReminder.mockImplementation(async (input) => ({
      subject: `Payment Reminder: Invoice ${input.invoiceNumber}`,
      headline: `Invoice ${input.invoiceNumber} is ${input.overdueDays} days past due`,
      body: `Dear ${input.clientName}, please pay ${input.currency || 'USD'} ${input.amount}.`,
      suggestedTone: input.tone || (input.overdueDays <= 7 ? 'friendly' : input.overdueDays <= 21 ? 'firm' : 'urgent'),
      overdueDays: input.overdueDays,
      amount: input.amount,
      currency: input.currency || 'USD',
      callToAction: 'Pay Now',
      fallbackUsed: false,
    }));

    fakeDb = {
      prepare: state.prepare,
    };

    app = Fastify();
    app.addHook('preHandler', async (req) => {
      if (!req.headers['x-unauthorized']) {
        (req as unknown as { authUserId: string }).authUserId = 'user-1';
      }
    });
    registerDunningRoutes(app, fakeDb as never);
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

  it('rejects unauthorized requests on /api/dunning/smart-draft', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/dunning/smart-draft',
      headers: { 'x-unauthorized': 'true' },
      payload: { amount: 100, overdueDays: 5 },
    });

    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('generates a smart draft with direct parameters', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/dunning/smart-draft',
      payload: {
        amount: 2500,
        currency: 'USD',
        overdueDays: 14,
        clientName: 'Global Logistics',
        invoiceNumber: 'INV-2026-99',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.draft).toBeDefined();
    expect(body.draft.subject).toBeDefined();
    expect(body.draft.amount).toBe(2500);
    expect(body.draft.overdueDays).toBe(14);
    expect(body.draft.suggestedTone).toBe('firm');
    expect(state.recordAudit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'dunning.smart_draft_generated',
        actorUserId: 'user-1',
      }),
    );
  });

  it('returns 400 when neither invoiceId nor required parameters are provided', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/dunning/smart-draft',
      payload: { clientName: 'No Amount Client' },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toContain('required');
  });

  it('queries database and drafts reminder when invoiceId is supplied', async () => {
    state.prepare.mockReturnValue({
      get: vi.fn().mockReturnValue({
        id: 'inv-42',
        invoice_number: 'INV-42',
        total: 750,
        currency: 'USD',
        due_date: '2026-08-15',
        status: 'overdue',
        client_name: 'Stark Industries',
        client_email: 'tony@stark.com',
        client_company: 'Stark Industries LLC',
        user_full_name: 'Bruce Wayne',
        user_company_name: 'Wayne Enterprises',
      }),
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/dunning/smart-draft',
      payload: {
        invoiceId: 'inv-42',
        overdueDays: 25,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.draft.amount).toBe(750);
    expect(body.draft.overdueDays).toBe(25);
    expect(body.draft.suggestedTone).toBe('urgent');
    expect(body.draft.subject).toContain('INV-42');
  });

  it('returns 404 when invoiceId is not found', async () => {
    state.prepare.mockReturnValue({
      get: vi.fn().mockReturnValue(undefined),
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/dunning/smart-draft',
      payload: { invoiceId: 'inv-nonexistent' },
    });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'Invoice not found' });
  });

  it('rejects unauthorized requests on /api/dunning/send-reminder', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/dunning/send-reminder',
      headers: { 'x-unauthorized': 'true' },
      payload: { invoiceId: 'inv-1', subject: 'Sub', body: 'Body' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('validates required fields on /api/dunning/send-reminder', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/dunning/send-reminder',
      payload: { invoiceId: 'inv-1' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toContain('required');
  });

  it('sends reminder email and returns ok when authorized', async () => {
    state.prepare.mockReturnValue({
      get: vi.fn().mockReturnValue({ id: 'inv-1', user_id: 'user-1' }),
    });
    state.sendDraftReminder.mockResolvedValue({ emailLogId: 'log-123', status: 'sent' });

    const res = await app.inject({
      method: 'POST',
      url: '/api/dunning/send-reminder',
      payload: {
        invoiceId: 'inv-1',
        subject: 'Reminder: Invoice INV-001',
        body: 'Please pay invoice INV-001',
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true, emailLogId: 'log-123' });
    expect(state.sendDraftReminder).toHaveBeenCalledWith(
      expect.anything(),
      'inv-1',
      'Reminder: Invoice INV-001',
      'Please pay invoice INV-001',
    );
  });
});
