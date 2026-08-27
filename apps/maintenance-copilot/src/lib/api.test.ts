// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, apiBaseUrl } from './api';

const setLocation = (hostname: string, protocol = 'http:') =>
  Object.defineProperty(window, 'location', {
    value: { hostname, protocol },
    writable: true,
    configurable: true,
  });

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  setLocation('localhost');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('apiBaseUrl', () => {
  it('honors the VITE_GATEWAY_URL override above everything', () => {
    vi.stubEnv('VITE_GATEWAY_URL', 'http://example:9000');
    setLocation('example.com', 'https:');
    expect(apiBaseUrl()).toBe('http://example:9000');
  });

  it.each([
    ['localhost', 'http:'],
    ['127.0.0.1', 'http:'],
    ['tauri.localhost', 'http:'],
    ['anything', 'tauri:'],
  ])('returns the :8675 gateway for local/Tauri origin (%s)', (host, proto) => {
    setLocation(host, proto);
    expect(apiBaseUrl()).toBe('http://localhost:8675');
  });

  it('falls back to same-origin for a remote host', () => {
    setLocation('dashboard.example.com', 'https:');
    expect(apiBaseUrl()).toBe('');
  });
});

const jsonOk = (body: unknown) => ({ ok: true, json: async () => Promise.resolve(body) });

describe('api client', () => {
  it('GET helpers hit the right path and return parsed JSON', async () => {
    fetchMock.mockResolvedValue(jsonOk({ packages: [], drifts: [] }));
    const ws = await api.workspaceHealth();
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8675/api/mcp/get_workspace_health');
    expect(ws).toEqual({ packages: [], drifts: [] });

    fetchMock.mockResolvedValue(jsonOk({ databases: [] }));
    await api.databaseHealth();
    expect(fetchMock).toHaveBeenLastCalledWith('http://localhost:8675/api/mcp/get_database_health');

    fetchMock.mockResolvedValue(jsonOk({ totalSize: '1 GB' }));
    await api.dDriveHealth();
    expect(fetchMock).toHaveBeenLastCalledWith('http://localhost:8675/api/mcp/get_d_drive_health');

    fetchMock.mockResolvedValue(jsonOk({ healthScore: 100 }));
    await api.telemetry();
    expect(fetchMock).toHaveBeenLastCalledWith('http://localhost:8675/api/telemetry');

    fetchMock.mockResolvedValue(jsonOk({ branch: 'main', isDirty: false, recentCommits: [] }));
    await api.gitStatus();
    expect(fetchMock).toHaveBeenLastCalledWith('http://localhost:8675/api/mcp/get_git_status');
  });

  it('throws on non-ok GET responses', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 503, json: async () => Promise.resolve({}) });
    await expect(api.telemetry()).rejects.toThrow('HTTP 503');
  });

  it('POST helpers send a JSON body and return the envelope (even on failure status)', async () => {
    fetchMock.mockResolvedValue(jsonOk({ success: true, dryRun: true, script: 'x' }));
    const r = await api.runMaintenance({ dryRun: true, vacuum: true });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8675/api/mcp/run_workspace_maintenance',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ dryRun: true, vacuum: true }),
      }),
    );
    expect(r.success).toBe(true);

    fetchMock.mockResolvedValue(jsonOk({ success: true, dryRun: false }));
    await api.runCleanup(false);
    expect(fetchMock).toHaveBeenLastCalledWith(
      'http://localhost:8675/api/mcp/run_workspace_cleanup',
      expect.objectContaining({ body: JSON.stringify({ dryRun: false }) }),
    );

    fetchMock.mockResolvedValue(jsonOk({ active: false, notice: 'off' }));
    const d = await api.diagnose();
    expect(d).toEqual({ active: false, notice: 'off' });
  });
});
