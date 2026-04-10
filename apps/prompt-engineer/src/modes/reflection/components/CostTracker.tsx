import { formatCost } from '../lib/utils';

interface Props {
  totalCost: number;
  costLimit: number;
  status: 'idle' | 'running' | 'complete' | 'error';
}

export function CostTracker({ totalCost, costLimit, status }: Props) {
  const pct = Math.min((totalCost / costLimit) * 100, 100);
  const color = pct > 80 ? 'var(--danger)' : pct > 50 ? 'var(--warning)' : 'var(--success)';

  if (status === 'idle') return null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '6px 20px',
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      fontSize: '12px',
      color: 'var(--text-muted)',
      flexShrink: 0,
    }}>
      <span>Cost</span>
      <div style={{ flex: 1, maxWidth: '160px', height: '4px', background: 'var(--surface-2)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 0.3s', borderRadius: '2px' }} />
      </div>
      <span style={{ color }}>{formatCost(totalCost)}</span>
      <span style={{ opacity: 0.5 }}>/ {formatCost(costLimit)}</span>
      {status === 'running' && (
        <span style={{ color: 'var(--accent)', animation: 'pulse 1.4s infinite' }}>● running</span>
      )}
      {status === 'complete' && (
        <span style={{ color: 'var(--success)' }}>✓ complete</span>
      )}
      {status === 'error' && (
        <span style={{ color: 'var(--danger)' }}>✗ stopped</span>
      )}
    </div>
  );
}
