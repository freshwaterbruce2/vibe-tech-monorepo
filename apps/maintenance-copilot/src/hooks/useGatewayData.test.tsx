// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

vi.mock('../lib/api', () => ({
  api: {
    workspaceHealth: vi.fn(),
    databaseHealth: vi.fn(),
    dDriveHealth: vi.fn(),
    telemetry: vi.fn(),
  },
}));

import { api } from '../lib/api';
import { useGatewayData } from './useGatewayData';

const resolveAll = () => {
  vi.mocked(api.workspaceHealth).mockResolvedValue({ packages: [], drifts: [] } as never);
  vi.mocked(api.databaseHealth).mockResolvedValue({ databases: [] } as never);
  vi.mocked(api.dDriveHealth).mockResolvedValue({ totalSize: '1 GB' } as never);
  vi.mocked(api.telemetry).mockResolvedValue({ healthScore: 90 } as never);
};

beforeEach(() => vi.clearAllMocks());

describe('useGatewayData', () => {
  it('loads all four panels concurrently and exposes the data', async () => {
    resolveAll();
    const { result } = renderHook(() => useGatewayData());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeUndefined();
    expect(result.current.data.telemetry?.healthScore).toBe(90);
    expect(api.workspaceHealth).toHaveBeenCalledOnce();
  });

  it('surfaces an Error rejection message', async () => {
    resolveAll();
    vi.mocked(api.workspaceHealth).mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useGatewayData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('boom');
  });

  it('stringifies a non-Error rejection', async () => {
    resolveAll();
    vi.mocked(api.telemetry).mockRejectedValue('offline');
    const { result } = renderHook(() => useGatewayData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('offline');
  });

  it('refetch re-runs every loader', async () => {
    resolveAll();
    const { result } = renderHook(() => useGatewayData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.refetch());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(api.telemetry).toHaveBeenCalledTimes(2);
  });
});
