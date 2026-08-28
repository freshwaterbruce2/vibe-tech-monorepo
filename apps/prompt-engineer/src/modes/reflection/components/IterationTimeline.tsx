import type { PassState } from '../types';
import { scoreColor } from '../lib/utils';

interface Props {
  passes: PassState[];
  status: 'idle' | 'running' | 'complete' | 'error';
  onSelectPass: (pass: number) => void;
  selectedPass: number;
}

export function IterationTimeline({ passes, status, onSelectPass, selectedPass }: Props) {
  if (passes.length === 0) return null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0',
      padding: '8px 20px',
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      overflowX: 'auto',
      flexShrink: 0,
    }}>
      {passes.map((p, i) => {
        const score = p.critique?.score;
        const isSelected = p.pass === selectedPass;
        const isStreaming = p.streaming;
        const isApproved = p.critique?.approved;

        return (
          <div key={p.pass} style={{ display: 'flex', alignItems: 'center' }}>
            {i > 0 && (
              <div style={{
                width: '32px',
                height: '2px',
                background: 'var(--border)',
                margin: '0 4px',
              }} />
            )}
            <button
              onClick={() => onSelectPass(p.pass)}
              title={`Pass ${p.pass}${score !== undefined ? ` — score ${Math.round(score * 100)}%` : ''}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '3px',
                padding: '6px 10px',
                background: isSelected ? 'var(--surface-2)' : 'transparent',
                border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: '6px',
                cursor: 'pointer',
                color: 'var(--text)',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: '11px', fontWeight: 600, color: isSelected ? 'var(--accent)' : 'var(--text-muted)' }}>
                {p.pass === 1 ? 'Gen' : `Rev ${p.pass}`}
              </span>
              {isStreaming && (
                <span style={{ fontSize: '10px', color: 'var(--accent)' }}>●</span>
              )}
              {score !== undefined && !isStreaming && (
                <span style={{ fontSize: '10px', fontWeight: 700, color: scoreColor(score) }}>
                  {Math.round(score * 100)}%{isApproved ? ' ✓' : ''}
                </span>
              )}
            </button>
          </div>
        );
      })}

      {status === 'running' && passes[passes.length - 1]?.critique && !passes[passes.length - 1]?.critique?.approved && (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '32px', height: '2px', background: 'var(--border)', margin: '0 4px' }} />
          <div style={{
            padding: '6px 10px',
            border: '1px dashed var(--border)',
            borderRadius: '6px',
            fontSize: '11px',
            color: 'var(--text-muted)',
          }}>
            …
          </div>
        </div>
      )}
    </div>
  );
}
