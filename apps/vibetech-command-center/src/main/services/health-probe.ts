import { createConnection } from 'node:net';
import type { ProbeResult, ServiceName } from '../../shared/types';

export interface ServiceEndpoint {
  service: ServiceName;
  host: string;
  port: number;
}

export const DEFAULT_ENDPOINTS: ServiceEndpoint[] = [
  { service: 'frontend-vite',    host: '127.0.0.1', port: 5173 },
  { service: 'backend-express',  host: '127.0.0.1', port: 5177 },
  { service: 'dashboard-ui',     host: '127.0.0.1', port: 5180 },
  { service: 'openrouter-proxy', host: '127.0.0.1', port: 3001 },
  { service: 'memory-mcp',       host: '127.0.0.1', port: 3200 },
  { service: 'dashboard-ipc',    host: '127.0.0.1', port: 3210 }
];

export interface HealthProbeOptions {
  endpoints?: ServiceEndpoint[];
  timeoutMs?: number;
}

export class HealthProbe {
  private readonly endpoints: ServiceEndpoint[];
  private readonly timeoutMs: number;

  constructor(opts: HealthProbeOptions = {}) {
    this.endpoints = opts.endpoints ?? DEFAULT_ENDPOINTS;
    this.timeoutMs = opts.timeoutMs ?? 500;
  }

  async probe(service: ServiceName): Promise<ProbeResult> {
    const ep = this.endpoints.find((e) => e.service === service);
    if (!ep) {
      return {
        service, host: '', port: 0, reachable: false, latencyMs: null,
        checkedAt: Date.now(), error: 'unknown service'
      };
    }
    return this.probeEndpoint(ep);
  }

  async probeAll(): Promise<ProbeResult[]> {
    return Promise.all(this.endpoints.map(async (e) => this.probeEndpoint(e)));
  }

  private async probeEndpoint(ep: ServiceEndpoint): Promise<ProbeResult> {
    return new Promise((resolve) => {
      const start = Date.now();
      const socket = createConnection({ host: ep.host, port: ep.port });
      let settled = false;

      const done = (reachable: boolean, error?: string) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        resolve({
          service: ep.service,
          host: ep.host,
          port: ep.port,
          reachable,
          latencyMs: reachable ? Date.now() - start : null,
          checkedAt: Date.now(),
          error
        });
      };

      const timer = setTimeout(() => done(false, 'timeout'), this.timeoutMs);
      socket.once('connect', () => { clearTimeout(timer); done(true); });
      socket.once('error', (err: Error) => { clearTimeout(timer); done(false, err.message); });
    });
  }
}
