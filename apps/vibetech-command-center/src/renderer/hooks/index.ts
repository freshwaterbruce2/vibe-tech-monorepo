import { useEffect, useState } from 'react';
import { useQuery, useMutation, type UseQueryResult, type UseMutationResult } from '@tanstack/react-query';
import { unwrap } from '@renderer/lib/ipc';
import { useUiStore } from '@renderer/stores';
import type {
  NxGraph, ProbeResult, DbMetric, BackupLogEntry, ProcessHandle,
  FileEvent, StreamTopic, RagSearchQuery, RagSearchResult,
  ClaudeInvocation, ClaudeInvocationResult, ClaudeStreamEvent
} from '@shared/types';

export function useNxGraph(): UseQueryResult<NxGraph> {
  return useQuery({
    queryKey: ['nx', 'graph'],
    queryFn: () => unwrap(window.commandCenter.nx.get()),
    staleTime: 30_000,
    refetchInterval: 60_000
  });
}

export function useHealth(): UseQueryResult<ProbeResult[]> {
  return useQuery({
    queryKey: ['health', 'all'],
    queryFn: () => unwrap(window.commandCenter.health.probeAll()),
    refetchInterval: 5_000
  });
}

export function useDbMetrics(): UseQueryResult<DbMetric[]> {
  return useQuery({
    queryKey: ['db', 'metrics'],
    queryFn: () => unwrap(window.commandCenter.db.collectAll()),
    refetchInterval: 30_000
  });
}

export function useBackupList(limit = 20): UseQueryResult<BackupLogEntry[]> {
  return useQuery({
    queryKey: ['backups', 'recent', limit],
    queryFn: () => unwrap(window.commandCenter.backup.list(limit)),
    refetchInterval: 10_000
  });
}

export function useProcessList(): UseQueryResult<ProcessHandle[]> {
  return useQuery({
    queryKey: ['processes', 'list'],
    queryFn: () => unwrap(window.commandCenter.process.list()),
    refetchInterval: 2_000
  });
}

export function useStream<T = unknown>(topic: StreamTopic, handler: (payload: T) => void): void {
  useEffect(() => {
    const unsub = window.commandCenter.stream.subscribe(topic, (payload) => handler(payload as T));
    return unsub;
  }, [topic, handler]);
}

export function useFileEventSubscription(): void {
  const pushFileEvents = useUiStore((s) => s.pushFileEvents);
  const setWsConnected = useUiStore((s) => s.setWsConnected);
  useStream<FileEvent[]>('cc.watcher.events', pushFileEvents);
  useStream<null>('cc.watcher.ready', () => setWsConnected(true));
  useStream<{ message: string }>('cc.watcher.error', () => setWsConnected(false));
}

export function useRagSearch(): UseMutationResult<RagSearchResult, Error, RagSearchQuery> {
  return useMutation({
    mutationFn: async (query: RagSearchQuery) => unwrap(window.commandCenter.rag.search(query))
  });
}

export function useClaudeInvoke(): UseMutationResult<ClaudeInvocationResult, Error, ClaudeInvocation> {
  return useMutation({
    mutationFn: async (inv: ClaudeInvocation) => unwrap(window.commandCenter.claude.invoke(inv))
  });
}

export function useClaudeStream(invocationId: string | null): ClaudeStreamEvent[] {
  const [events, setEvents] = useState<ClaudeStreamEvent[]>([]);

  useEffect(() => {
    if (!invocationId) { setEvents([]); return; }
    const unsub = window.commandCenter.stream.subscribe('cc.claude.stream', (payload) => {
      const evt = payload as ClaudeStreamEvent;
      if (evt.invocationId === invocationId) {
        setEvents((prev) => [...prev, evt].slice(-500));
      }
    });
    return unsub;
  }, [invocationId]);

  return events;
}

export function useProcessOutput(
  processId: string | null
): Array<{ stream: 'stdout' | 'stderr'; data: string; timestamp: number }> {
  const [chunks, setChunks] = useState<
    Array<{ stream: 'stdout' | 'stderr'; data: string; timestamp: number }>
  >([]);

  useEffect(() => {
    if (!processId) { setChunks([]); return; }
    const unsub = window.commandCenter.stream.subscribe('cc.process.chunk', (payload) => {
      const chunk = payload as { processId: string; stream: 'stdout' | 'stderr'; data: string; timestamp: number };
      if (chunk.processId === processId) {
        setChunks((prev) => [
          ...prev,
          { stream: chunk.stream, data: chunk.data, timestamp: chunk.timestamp }
        ].slice(-2000));
      }
    });
    return unsub;
  }, [processId]);

  return chunks;
}
