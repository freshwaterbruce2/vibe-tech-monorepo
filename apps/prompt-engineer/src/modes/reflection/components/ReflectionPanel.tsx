import { useEffect, useRef } from 'react';
import type { PassState } from '../types';
import { CritiqueCard } from './CritiqueCard';

interface Props {
  passState: PassState;
  isLatest: boolean;
}

// Split text into word-size tokens for animation
function StreamingText({ text, streaming }: { text: string; streaming: boolean }) {
  // Chunk into ~word-size pieces for the fade-in animation
  const chunks = text.match(/\S+\s*/g) ?? [];

  return (
    <span aria-live={streaming ? 'polite' : 'off'} aria-atomic={false}>
      {chunks.map((chunk, i) => (
        <span key={i} className="token">{chunk}</span>
      ))}
      {streaming && <span style={{ display: 'inline-block', width: '8px', height: '14px', background: 'var(--accent)', marginLeft: '2px', animation: 'pulse 1s infinite', verticalAlign: 'middle', borderRadius: '1px' }} />}
    </span>
  );
}

export function ReflectionPanel({ passState, isLatest }: Props) {
  const { pass, output, streaming, critique } = passState;
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll while streaming
  useEffect(() => {
    if (streaming && isLatest) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [output, streaming, isLatest]);

  const label = pass === 1 ? 'Generator' : `Reviser (pass ${pass})`;
  const isApproved = critique?.approved;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '10px',
      overflow: 'hidden',
      height: '100%',
      flexShrink: 0,
    }}>
      {/* Panel header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 14px',
        background: 'var(--surface-2)',
        borderBottom: '1px solid var(--border)',
        fontSize: '12px',
        fontWeight: 600,
        flexShrink: 0,
      }}>
        <span style={{
          padding: '2px 8px',
          borderRadius: '4px',
          background: pass === 1 ? 'var(--accent-dim)' : '#2a1a3a',
          color: pass === 1 ? 'var(--accent)' : 'var(--critic-b)',
          border: `1px solid ${pass === 1 ? 'var(--accent-dim)' : '#5a3a7a'}`,
        }}>
          {label}
        </span>
        {isApproved && <span style={{ color: 'var(--success)', fontSize: '11px' }}>✓ approved</span>}
        {streaming && <span style={{ color: 'var(--text-muted)', fontSize: '11px', marginLeft: 'auto' }}>streaming…</span>}
      </div>

      {/* Output content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '14px 16px',
        fontSize: '13px',
        lineHeight: 1.7,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        color: 'var(--text)',
      }}>
        {output
          ? <StreamingText text={output} streaming={streaming} />
          : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Waiting…</span>
        }
        <div ref={bottomRef} />
      </div>

      {/* Critique section */}
      <CritiqueCard passState={passState} />
    </div>
  );
}
