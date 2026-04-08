/**
 * MemoryPanel — Shows memory system state, decay stats,
 * recent memories, and semantic search.
 */
import { invoke } from '@tauri-apps/api/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getDecayStats,
  isMemoryAvailable,
  searchMemory,
  type DecayStats,
  type MemorySearchResult,
} from '../lib/memory-bridge';

export function MemoryPanel({ onClose }: { onClose: () => void }) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [stats, setStats] = useState<DecayStats | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MemorySearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [starting, setStarting] = useState(false);
  const mountedRef = useRef(true);
  const delayedCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkAvailability = useCallback(async () => {
    try {
      const ok = await isMemoryAvailable();
      if (!mountedRef.current) return;

      setAvailable(ok);
      setStarting(false);
      if (!ok) {
        setStats(null);
        return;
      }

      const nextStats = await getDecayStats();
      if (mountedRef.current) {
        setStats(nextStats);
      }
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void checkAvailability();
    const interval = setInterval(() => {
      void checkAvailability();
    }, 5000); // Check every 5s
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
      if (delayedCheckRef.current) {
        clearTimeout(delayedCheckRef.current);
      }
    };
  }, [checkAvailability]);

  const handleStartMemory = async () => {
    setStarting(true);
    try {
      await invoke('start_memory_mcp');
      // Optimistically wait a few seconds then check again
      delayedCheckRef.current = setTimeout(() => {
        void checkAvailability();
      }, 3000);
    } catch (e) {
      console.error('Failed to start memory MCP:', e);
      setStarting(false);
    }
  };

  const handleSearch = useCallback(async () => {
    if (!query.trim() || searching || !available) return;
    setSearching(true);
    try {
      const r = await searchMemory(query.trim());
      setResults(r);
    } catch (e) {
      console.error('Search failed', e);
    } finally {
      setSearching(false);
    }
  }, [query, searching, available]);

  return (
    <div className="memory-panel">
      <div className="heal-header">
        <h2>🧠 Neural Memory</h2>
        <button className="heal-close" onClick={onClose}>
          ✕
        </button>
      </div>

      {/* Connection Status */}
      <div className="memory-panel__status">
        <div className="memory-panel__status-info">
          <span className={`memory-dot ${available ? 'online' : 'offline'}`} />
          <span>
            {available === null
              ? 'Checking...'
              : available
                ? 'Memory MCP Online'
                : 'Memory MCP Offline'}
          </span>
        </div>
        {available === false && (
          <button
            className="memory-panel__start-btn"
            onClick={() => {
              void handleStartMemory();
            }}
            disabled={starting}
          >
            {starting ? 'Starting...' : 'Start Server'}
          </button>
        )}
      </div>

      {/* Decay Stats */}
      {stats && (
        <div className="heal-stats-grid">
          <div className="heal-stat-card" style={{ borderTopColor: '#22d3ee' }}>
            <span className="heal-stat-value">{stats.total_memories}</span>
            <span className="heal-stat-label">Total</span>
          </div>
          <div className="heal-stat-card" style={{ borderTopColor: '#10b981' }}>
            <span className="heal-stat-value">{stats.active_count}</span>
            <span className="heal-stat-label">Active</span>
          </div>
          <div className="heal-stat-card" style={{ borderTopColor: '#f59e0b' }}>
            <span className="heal-stat-value">{stats.decayed_count}</span>
            <span className="heal-stat-label">Decayed</span>
          </div>
          <div className="heal-stat-card" style={{ borderTopColor: '#6366f1' }}>
            <span className="heal-stat-value">{(stats.avg_score ?? 0).toFixed(1)}</span>
            <span className="heal-stat-label">Avg Score</span>
          </div>
        </div>
      )}

      {/* Semantic Search */}
      <div className="memory-search">
        <input
          id="memory-search-input"
          name="memory-search-input"
          className="launcher__search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleSearch();
          }}
          placeholder="Search memories..."
        />
      </div>

      {/* Results */}
      <div className="memory-results">
        {searching && <div className="heal-loading">Searching...</div>}
        {!searching && results.length === 0 && query && (
          <div className="heal-empty">No memories found</div>
        )}
        {results.map((r) => (
          <div key={r.id} className="memory-result-card">
            <div className="memory-result-header">
              <span className="memory-result-category">{r.category}</span>
              <span className="memory-result-score">{(r.score * 100).toFixed(0)}%</span>
            </div>
            <div className="memory-result-content">{r.content}</div>
            <div className="memory-result-date">{new Date(r.created_at).toLocaleDateString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

