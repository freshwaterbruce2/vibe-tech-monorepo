interface Props {
  onSubmit: (task: string) => void;
  onCancel: () => void;
  running: boolean;
}

export function TaskInput({ onSubmit, onCancel, running }: Props) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const task = (fd.get('task') as string).trim();
    if (task) onSubmit(task);
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        gap: '8px',
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        flexShrink: 0,
        alignItems: 'flex-start',
      }}
    >
      {/* Task textarea */}
      <textarea
        name="task"
        placeholder="Enter your task… e.g. 'Explain transformer attention for a backend engineer'"
        rows={2}
        disabled={running}
        required
        style={{
          flex: 1,
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          padding: '10px 14px',
          color: 'var(--text)',
          fontSize: '14px',
          resize: 'none',
          outline: 'none',
          fontFamily: 'inherit',
          lineHeight: 1.5,
        }}
        aria-label="Task description"
      />

      {/* Run / Cancel */}
      {running ? (
        <button
          type="button"
          onClick={onCancel}
          style={{
            alignSelf: 'center',
            padding: '9px 18px',
            background: 'var(--danger)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          Cancel
        </button>
      ) : (
        <button
          type="submit"
          style={{
            alignSelf: 'center',
            padding: '9px 18px',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}
        >
          Run ↵
        </button>
      )}
    </form>
  );
}
