interface Props {
  before: string;
  after: string;
  beforeLabel: string;
  afterLabel: string;
}

// Simple word-level diff highlight — no external dep needed for a dev tool
function tokenize(text: string): string[] {
  return text.split(/(\s+)/);
}

export function DiffView({ before, after, beforeLabel, afterLabel }: Props) {
  if (!before || !after) return null;

  return (
    <div style={{
      display: 'flex',
      gap: '12px',
      padding: '16px 20px',
      background: 'var(--surface)',
      borderTop: '1px solid var(--border)',
      flexShrink: 0,
      maxHeight: '280px',
    }}>
      <DiffPane label={beforeLabel} text={before} side="before" />
      <div style={{ width: '1px', background: 'var(--border)', flexShrink: 0 }} />
      <DiffPane label={afterLabel} text={after} side="after" />
    </div>
  );
}

function DiffPane({ label, text, side }: { label: string; text: string; side: 'before' | 'after' }) {
  const color = side === 'before' ? 'var(--critic-a)' : 'var(--critic-b)';
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{
        fontSize: '11px',
        fontWeight: 600,
        color,
        marginBottom: '8px',
        padding: '2px 6px',
        background: 'var(--surface-2)',
        borderRadius: '4px',
        display: 'inline-flex',
        alignSelf: 'flex-start',
        border: `1px solid ${color}33`,
      }}>
        {label}
      </div>
      <div style={{
        overflowY: 'auto',
        fontSize: '12px',
        lineHeight: 1.65,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        color: 'var(--text-muted)',
        flex: 1,
      }}>
        {text.slice(0, 800)}{text.length > 800 ? '…' : ''}
      </div>
    </div>
  );
}
