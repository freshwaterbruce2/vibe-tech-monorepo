/**
 * Loads all read-only dashboard panels from the gateway concurrently and
 * exposes a single loading/error/data/refetch surface, so the tab components
 * are pure consumers.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  api,
  type WorkspaceHealth,
  type DatabaseHealth,
  type DDriveHealth,
  type Telemetry,
  type GitReport,
} from '../lib/api';

export interface GatewayData {
  workspace?: WorkspaceHealth;
  databases?: DatabaseHealth;
  dDrive?: DDriveHealth;
  telemetry?: Telemetry;
  git?: GitReport;
}

export interface GatewayState {
  loading: boolean;
  error?: string;
  data: GatewayData;
  refetch: () => void;
}

export function useGatewayData(): GatewayState {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [data, setData] = useState<GatewayData>({});

  const refetch = useCallback(() => {
    setLoading(true);
    setError(undefined);
    Promise.all([
      api.workspaceHealth(),
      api.databaseHealth(),
      api.dDriveHealth(),
      api.telemetry(),
      api.gitStatus(),
    ])
      .then(([workspace, databases, dDrive, telemetry, git]) =>
        setData({ workspace, databases, dDrive, telemetry, git }),
      )
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => refetch(), [refetch]);

  return { loading, error, data, refetch };
}
