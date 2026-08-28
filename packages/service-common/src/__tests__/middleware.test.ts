import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { createHealthCheck, createRateLimitConfig, asyncHandler } from '../middleware.js';

function makeRes() {
  const res = {
    json: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response & { json: ReturnType<typeof vi.fn>; status: ReturnType<typeof vi.fn> };
}

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    method: 'GET',
    path: '/test',
    headers: {},
    get: vi.fn(),
    ...overrides,
  } as unknown as Request;
}

describe('createHealthCheck', () => {
  it('responds with healthy status and the given service name', () => {
    const handler = createHealthCheck('my-service');
    const res = makeRes();

    handler(makeReq(), res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.status).toBe('healthy');
    expect(payload.service).toBe('my-service');
    expect(payload.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(typeof payload.uptime).toBe('number');
  });

  it('includes a fresh timestamp on each call', async () => {
    const handler = createHealthCheck('svc');
    const res1 = makeRes();
    handler(makeReq(), res1);
    await new Promise(r => setTimeout(r, 2));
    const res2 = makeRes();
    handler(makeReq(), res2);

    const t1 = new Date(res1.json.mock.calls[0][0].timestamp).getTime();
    const t2 = new Date(res2.json.mock.calls[0][0].timestamp).getTime();
    expect(t2).toBeGreaterThanOrEqual(t1);
  });
});

describe('createRateLimitConfig', () => {
  it('returns defaults when called with no options', () => {
    const config = createRateLimitConfig();
    expect(config.windowMs).toBe(15 * 60 * 1000);
    expect(config.max).toBe(100);
    expect(config.message).toBe('Too many requests, please try again later');
    expect(config.standardHeaders).toBe(true);
    expect(config.legacyHeaders).toBe(false);
  });

  it('overrides windowMs', () => {
    expect(createRateLimitConfig({ windowMs: 60000 }).windowMs).toBe(60000);
  });

  it('overrides max', () => {
    expect(createRateLimitConfig({ max: 10 }).max).toBe(10);
  });

  it('overrides message', () => {
    expect(createRateLimitConfig({ message: 'slow down' }).message).toBe('slow down');
  });
});

describe('asyncHandler', () => {
  it('calls next with the error when the wrapped function rejects', async () => {
    const error = new Error('async failure');
    const fn = vi.fn().mockRejectedValue(error);
    const handler = asyncHandler(fn);

    const next = vi.fn() as unknown as NextFunction;
    handler(makeReq(), makeRes(), next);
    await new Promise(resolve => setImmediate(resolve));

    expect(next).toHaveBeenCalledWith(error);
  });

  it('does not call next when the wrapped function resolves', async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    const handler = asyncHandler(fn);

    const next = vi.fn() as unknown as NextFunction;
    handler(makeReq(), makeRes(), next);
    await new Promise(resolve => setImmediate(resolve));

    expect(next).not.toHaveBeenCalled();
  });

  it('passes req, res, next to the wrapped function', async () => {
    const fn = vi.fn().mockResolvedValue(undefined);
    const handler = asyncHandler(fn);
    const req = makeReq();
    const res = makeRes();
    const next = vi.fn() as unknown as NextFunction;

    handler(req, res, next);
    await new Promise(resolve => setImmediate(resolve));

    expect(fn).toHaveBeenCalledWith(req, res, next);
  });
});
