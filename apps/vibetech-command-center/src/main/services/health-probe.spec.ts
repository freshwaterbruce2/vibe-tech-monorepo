import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server } from 'node:net';
import { HealthProbe } from './health-probe';
import type { ServiceEndpoint } from './health-probe';

describe('HealthProbe', () => {
  let server: Server;
  let port: number;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = createServer();
      server.listen(0, '127.0.0.1', () => {
        port = (server.address() as { port: number }).port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('reports reachable=true for a listening port', async () => {
    const endpoints: ServiceEndpoint[] = [
      { service: 'dashboard-ui', host: '127.0.0.1', port }
    ];
    const probe = new HealthProbe({ endpoints, timeoutMs: 500 });
    const results = await probe.probeAll();
    expect(results[0]?.reachable).toBe(true);
    expect(results[0]?.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('reports reachable=false for a closed port', async () => {
    const endpoints: ServiceEndpoint[] = [
      { service: 'dashboard-ui', host: '127.0.0.1', port: 1 } // port 1 should be closed
    ];
    const probe = new HealthProbe({ endpoints, timeoutMs: 300 });
    const results = await probe.probeAll();
    expect(results[0]?.reachable).toBe(false);
    expect(results[0]?.latencyMs).toBeNull();
    expect(results[0]?.error).toBeDefined();
  });

  it('honors timeout on unreachable host', async () => {
    // 10.255.255.1 is typically unroutable and will hang
    const endpoints: ServiceEndpoint[] = [
      { service: 'dashboard-ui', host: '10.255.255.1', port: 80 }
    ];
    const probe = new HealthProbe({ endpoints, timeoutMs: 200 });
    const start = Date.now();
    const results = await probe.probeAll();
    const elapsed = Date.now() - start;
    expect(results[0]?.reachable).toBe(false);
    expect(elapsed).toBeLessThan(1000);
  });

  it('probe(service) returns error for unknown service name', async () => {
    const probe = new HealthProbe({ endpoints: [] });
    const r = await probe.probe('dashboard-ui');
    expect(r.reachable).toBe(false);
    expect(r.error).toBe('unknown service');
  });
});
