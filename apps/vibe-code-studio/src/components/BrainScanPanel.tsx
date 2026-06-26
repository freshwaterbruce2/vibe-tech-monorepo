/**
 * BrainScanPanel — Vibe Code Studio learning-memory viewer.
 *
 * Reads the durable `strategy_memory` table (D:\databases\vibe_studio.db) through the Tauri
 * SQLite bridge and renders the agent's learned patterns. `pattern_data` holds the full
 * StrategyPattern JSON, so we parse it for a readable card instead of dumping raw JSON.
 * Also supports teaching a manual rule, persisted via the same UNIQUE-safe upsert.
 *
 * Styled with inline styles — this project does not use Tailwind (see postcss.config.js).
 */
import { Activity, Brain, Plus, RefreshCw, Save, ShieldAlert, X } from 'lucide-react';
import { useCallback, useEffect, useState, type CSSProperties } from 'react';

import { logger } from '../services/Logger';

interface PatternRow {
  id: string | number;
  pattern_hash?: string;
  pattern_data?: string;
  usage_count?: number;
  success_rate?: number;
  updated_at?: string | number;
}

/** Decoded view of a stored pattern, resilient to legacy / manual shapes. */
interface PatternView {
  key: string;
  title: string;
  approach: string;
  usageCount: number;
  successRate: number;
  updatedAt?: string | number;
}

// Manual-rule upsert. Single statement; pattern_hash is UNIQUE so ON CONFLICT resolves.
const MANUAL_UPSERT = `INSERT INTO strategy_memory (pattern_hash, pattern_data, success_rate, usage_count)
VALUES (?, ?, ?, ?)
ON CONFLICT(pattern_hash) DO UPDATE SET
  pattern_data = excluded.pattern_data,
  usage_count  = strategy_memory.usage_count + 1,
  last_used    = CURRENT_TIMESTAMP`;

const styles: Record<string, CSSProperties> = {
  root: {
    height: '100%',
    overflowY: 'auto',
    padding: '24px',
    background: 'rgba(8, 17, 31, 0.97)',
    color: '#e2e8f0',
    fontFamily: 'system-ui, sans-serif',
    backdropFilter: 'blur(4px)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px',
    borderBottom: '1px solid #334155',
    paddingBottom: '16px',
  },
  title: {
    fontSize: '22px',
    fontWeight: 700,
    color: '#67e8f9',
    margin: 0,
  },
  subtitle: { fontSize: '12px', color: '#64748b', margin: 0 },
  btnRow: { display: 'flex', alignItems: 'center', gap: '8px' },
  iconBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: '#334155',
    color: '#fff',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  primaryBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: '#0891b2',
    color: '#fff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  form: {
    marginBottom: '24px',
    background: 'rgba(30, 41, 59, 0.5)',
    border: '1px solid rgba(6, 182, 212, 0.3)',
    borderRadius: '12px',
    padding: '16px',
  },
  formHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  input: {
    flex: 1,
    background: '#020617',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '14px',
    color: '#e2e8f0',
  },
  saveBtn: {
    background: '#16a34a',
    color: '#fff',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
  },
  card: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '12px',
    padding: '16px',
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  badge: {
    fontSize: '12px',
    padding: '2px 8px',
    borderRadius: '6px',
    border: '1px solid rgba(6, 182, 212, 0.2)',
    background: 'rgba(8, 145, 178, 0.2)',
    color: '#67e8f9',
  },
  cardTitle: { fontWeight: 500, color: '#e2e8f0', margin: '0 0 8px', lineHeight: 1.4 },
  cardApproach: { fontSize: '12px', color: '#94a3b8', margin: '0 0 8px', lineHeight: 1.4 },
  cardMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '12px',
    fontSize: '13px',
    color: '#94a3b8',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '256px',
    color: '#64748b',
  },
};

function decodePattern(row: PatternRow): PatternView {
  const rawData = row.pattern_data ?? '';
  let title = rawData || 'Unknown pattern';
  let approach = '';
  let usageCount = row.usage_count ?? 0;
  let successRate = row.success_rate ?? 0;

  try {
    const parsed = JSON.parse(rawData) as Record<string, unknown>;
    if (parsed && typeof parsed === 'object') {
      title = String(parsed['problemDescription'] ?? parsed['problemSignature'] ?? title);
      approach = String(parsed['successfulApproach'] ?? '');
      if (typeof parsed['usageCount'] === 'number') usageCount = parsed['usageCount'];
      if (typeof parsed['successRate'] === 'number') successRate = parsed['successRate'];
    }
  } catch {
    // Not JSON (legacy/manual plain text) — fall back to the raw string title.
  }

  return {
    key: String(row.pattern_hash ?? row.id),
    title,
    approach,
    usageCount,
    successRate,
    updatedAt: row.updated_at,
  };
}

export const BrainScanPanel = ({ onClose }: { onClose: () => void }) => {
  const [patterns, setPatterns] = useState<PatternView[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPattern, setNewPattern] = useState('');

  const fetchMemory = useCallback(async () => {
    setLoading(true);
    try {
      if (window.electron?.db?.getPatterns) {
        const data = (await window.electron.db.getPatterns()) as
          | { patterns?: PatternRow[] }
          | undefined;
        setPatterns((data?.patterns ?? []).map(decodePattern));
      }
    } catch (err) {
      logger.error('[BrainScan] Failed to read learning memory:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMemory();
  }, [fetchMemory]);

  const handleSave = async () => {
    const text = newPattern.trim();
    if (!text || !window.electron?.db?.execute) return;
    try {
      const signature = `manual::${text.slice(0, 50).toLowerCase()}::custom`;
      const data = JSON.stringify({
        problemSignature: signature,
        problemDescription: text,
        successfulApproach: 'Manual rule',
        usageCount: 1,
        successRate: 100,
      });
      const result = (await window.electron.db.execute(MANUAL_UPSERT, [
        signature,
        data,
        '100',
        '1',
      ])) as { success?: boolean; error?: string } | undefined;
      if (result?.success === false) {
        throw new Error(result.error ?? 'Failed to save pattern');
      }
      setNewPattern('');
      setShowAddForm(false);
      await fetchMemory();
    } catch (err) {
      logger.error('[BrainScan] Failed to save pattern:', err);
    }
  };

  return (
    <div style={styles.root}>
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Brain size={32} color="#67e8f9" />
          <div>
            <h1 style={styles.title}>Learning Memory</h1>
            <p style={styles.subtitle}>
              {patterns.length} pattern{patterns.length === 1 ? '' : 's'} • D:\databases\vibe_studio.db
            </p>
          </div>
        </div>

        <div style={styles.btnRow}>
          <button onClick={fetchMemory} aria-label="Refresh patterns" style={styles.iconBtn}>
            <RefreshCw size={16} />
          </button>
          <button onClick={() => setShowAddForm(true)} style={styles.primaryBtn}>
            <Plus size={16} /> Add Rule
          </button>
          <button onClick={onClose} aria-label="Close learning memory" style={styles.iconBtn}>
            <X size={16} />
          </button>
        </div>
      </header>

      {showAddForm && (
        <div style={styles.form}>
          <div style={styles.formHeader}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#67e8f9', margin: 0 }}>
              Teach the AI a new rule
            </h3>
            <button
              onClick={() => setShowAddForm(false)}
              aria-label="Close form"
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={newPattern}
              onChange={(e) => setNewPattern(e.target.value)}
              placeholder="E.g., 'Always use styled-components for new UI elements'..."
              aria-label="New logic rule pattern"
              style={styles.input}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleSave();
              }}
            />
            <button onClick={handleSave} aria-label="Save rule" style={styles.saveBtn}>
              <Save size={16} />
            </button>
          </div>
        </div>
      )}

      <div style={styles.grid}>
        {patterns.map((p) => (
          <div key={p.key} style={styles.card}>
            <div style={styles.cardTop}>
              <span style={styles.badge}>{`Success: ${Math.round(p.successRate)}%`}</span>
              <span style={{ color: '#64748b', fontSize: '12px' }}>
                {p.updatedAt ? new Date(p.updatedAt).toLocaleString() : ''}
              </span>
            </div>
            <h3 style={styles.cardTitle}>{p.title}</h3>
            {p.approach && <p style={styles.cardApproach}>{p.approach}</p>}
            <div style={styles.cardMeta}>
              <Activity size={12} />
              <span>Used: {p.usageCount}</span>
            </div>
          </div>
        ))}
      </div>

      {patterns.length === 0 && !loading && (
        <div style={styles.empty}>
          <ShieldAlert size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
          <p>No learning patterns yet. Complete an agent task to start building memory.</p>
        </div>
      )}
    </div>
  );
};

export default BrainScanPanel;
