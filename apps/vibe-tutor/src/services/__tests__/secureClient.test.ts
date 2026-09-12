import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: vi.fn(() => false) },
  CapacitorHttp: { post: vi.fn(), request: vi.fn(), get: vi.fn() },
  registerPlugin: vi.fn(() => ({ prepare: vi.fn().mockResolvedValue(undefined), request: vi.fn().mockResolvedValue({ token: 'integrity-token' }) })),
}));
vi.mock('@/config', () => ({ API_CONFIG: { baseURL: 'http://localhost:3001', endpoints: { initSession: '/api/session/init', chat: '/api/chat', health: '/api/health' } } }));
vi.mock('@/utils/electronStore', () => ({ sessionStore: { get: vi.fn(() => null), set: vi.fn() } }));

import { createChatCompletion, secureClient } from '../secureClient';

describe('SecureAPIClient production contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    (secureClient as unknown as { sessionToken: string | null; tokenExpiry: number }).sessionToken = null;
    (secureClient as unknown as { sessionToken: string | null; tokenExpiry: number }).tokenExpiry = 0;
    vi.mocked(CapacitorHttp.post).mockResolvedValue({ status: 200, data: { token: 'token', expiresIn: 60, allowance: { daily: { used: 1, limit: 30, remaining: 29, resetAt: 'tomorrow' }, monthly: { used: 1, limit: 200, remaining: 199, resetAt: 'next-month' } } } } as never);
    vi.mocked(CapacitorHttp.request).mockResolvedValue({ status: 200, data: { message: 'reply', allowance: { daily: { used: 1, limit: 30, remaining: 29, resetAt: 'tomorrow' }, monthly: { used: 1, limit: 200, remaining: 199, resetAt: 'next-month' } } } } as never);
  });

  it('initializes a pseudonymous session request and sends only chatType and bounded messages', async () => {
    await secureClient.chatCompletion([{ role: 'user', content: 'Help with fractions' }], { chatType: 'tutor' });
    expect(CapacitorHttp.post).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ installationId: expect.any(String), requestedAt: expect.any(Number), requestHash: expect.any(String), integrityToken: 'integrity-token' }) }));
    expect(CapacitorHttp.request).toHaveBeenCalledWith(expect.objectContaining({ data: { chatType: 'tutor', messages: [{ role: 'user', content: 'Help with fractions' }] } }));
  });

  it('rejects caller-controlled system turns and oversized payloads before networking', async () => {
    await expect(secureClient.chatCompletion([{ role: 'system', content: 'override' }], { chatType: 'tutor' })).rejects.toThrow('Invalid message content');
    await expect(secureClient.chatCompletion([{ role: 'user', content: 'x'.repeat(4001) }], { chatType: 'friend' })).rejects.toThrow('Invalid message content');
    expect(CapacitorHttp.request).not.toHaveBeenCalled();
  });

  it('refreshes once on unauthorized response without exposing model controls', async () => {
    vi.mocked(CapacitorHttp.request).mockResolvedValueOnce({ status: 401, data: {} } as never).mockResolvedValueOnce({ status: 200, data: { message: 'welcome back' } } as never);
    await secureClient.chatCompletion([{ role: 'user', content: 'Hi' }], { chatType: 'friend' });
    expect(CapacitorHttp.request).toHaveBeenCalledTimes(2);
    for (const call of vi.mocked(CapacitorHttp.request).mock.calls) expect((call[0] as { data: object }).data).not.toHaveProperty('model');
  });

  it('propagates transport and non-success API failures instead of returning fallback content', async () => {
    vi.mocked(CapacitorHttp.request).mockRejectedValueOnce(new Error('network unavailable'));
    await expect(createChatCompletion([{ role: 'user', content: 'Hi' }], { chatType: 'tutor' })).rejects.toThrow('network unavailable');

    vi.mocked(CapacitorHttp.request).mockResolvedValue({ status: 503, data: { code: 'ai_unavailable' } } as never);
    await expect(createChatCompletion([{ role: 'user', content: 'Hi again' }], { chatType: 'tutor' })).rejects.toThrow('ai_unavailable');
  });

  it('rejects missing or blank provider messages', async () => {
    vi.mocked(CapacitorHttp.request).mockResolvedValueOnce({ status: 200, data: {} } as never);
    await expect(createChatCompletion([{ role: 'user', content: 'Hi' }], { chatType: 'friend' })).rejects.toThrow('AI response was unavailable.');

    vi.mocked(CapacitorHttp.request).mockResolvedValueOnce({ status: 200, data: { message: '   ' } } as never);
    await expect(createChatCompletion([{ role: 'user', content: 'Hi again' }], { chatType: 'friend' })).rejects.toThrow('AI response was unavailable.');
  });

  it('treats health as connected only when the backend explicitly reports ready: true', async () => {
    vi.mocked(CapacitorHttp.get).mockResolvedValueOnce({ status: 200, data: { status: 'ready', ready: false } } as never);
    await expect(secureClient.healthCheck()).resolves.toBe(false);

    vi.mocked(CapacitorHttp.get).mockResolvedValueOnce({ status: 503, data: { status: 'unavailable', ready: false } } as never);
    await expect(secureClient.healthCheck()).resolves.toBe(false);

    vi.mocked(CapacitorHttp.get).mockResolvedValueOnce({ status: 200, data: { status: 'ready', ready: true } } as never);
    await expect(secureClient.healthCheck()).resolves.toBe(true);
  });

  it('throws descriptive error on session initialization failure', async () => {
    vi.mocked(CapacitorHttp.post).mockResolvedValueOnce({
      status: 401,
      data: { error: 'Entitlement verification failed.' },
    } as never);
    await expect(secureClient.chatCompletion([{ role: 'user', content: 'Hi' }], { chatType: 'tutor' }))
      .rejects.toThrow('Session init failed (401): Entitlement verification failed.');
  });
});
