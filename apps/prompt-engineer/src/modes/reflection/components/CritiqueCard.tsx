import { scoreColor, scoreLabel } from '../lib/utils';
import type { PassState } from '../types';

interface Props {
  passState: PassState;
}

function ScoreRing({ score }: { score: number }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const offset = circ - score * circ;
  const color = scoreColor(score);

  return (
    <svg width={48} height={48} viewBox="0 0 48 48" aria-label={`Score ${Math.round(score * 100)}%`}>
      <circle cx={24} cy={24} r={r} fill="none" stroke="var(--surface-2)" strokeWidth={5} />
      <circle
        cx={24} cy={24} r={r}
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 24 24)"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text x={24} y={28} textAnchor="middle" fontSize={11} fill={color} fontWeight={700}>
        {Math.round(score * 100)}
      </text>
    </svg>
  );
}

function CriticBadge({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <span style={{
      fontSize: '11px',
      padding: '2px 7px',
      borderRadius: '4px',
      border: `1px solid ${color}`,
      color,
      whiteSpace: 'nowrap',
    }}>
      {label} {Math.round(score * 100)}%
    </span>
  );
}

export function CritiqueCard({ passState }: Props) {
  const { critique, streaming } = passState;

  if (streaming || !critique) {
    return (
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '13px' }}>
        {streaming ? '⏳ Generating…' : '⌛ Awaiting critique…'}
      </div>
    );
  }

  const { score, approved, issues, suggestions, criticA, criticB } = critique;

  return (
    <div style={{
      borderTop: '1px solid var(--border)',
      background: 'var(--surface)',
      padding: '12px 16px',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
        <ScoreRing score={score} />
        <div>
          <div style={{ fontWeight: 600, fontSize: '13px', color: scoreColor(score) }}>
            {scoreLabel(score)} {approved ? '✓' : '→ revising'}
          </div>
          <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
            {criticA && <CriticBadge label="A" score={criticA.score} color="var(--critic-a)" />}
            {criticB && <CriticBadge label="B" score={criticB.score} color="var(--critic-b)" />}
          </div>
        </div>
      </div>

      {/* Issues */}
      {issues.length > 0 && (
        <ul style={{ margin: '0 0 8px', padding: '0 0 0 16px', fontSize: '12px', color: 'var(--danger)', lineHeight: 1.6 }}>
          {issues.map((iss, i) => <li key={i}>{iss}</li>)}
        </ul>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <ul style={{ margin: 0, padding: '0 0 0 16px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          {suggestions.map((s, i) => <li key={i} style={{ color: 'var(--accent)' }}>{s}</li>)}
        </ul>
      )}
    </div>
  );
}
