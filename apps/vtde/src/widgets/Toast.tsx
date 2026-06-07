export interface Toast {
  id: number;
  icon: string;
  title: string;
  body: string;
  accent: string;
}

export function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="vtde-toast-container">
      {toasts.map((t) => (
        <div key={t.id} className="vtde-toast" style={{ borderLeftColor: t.accent }}>
          <span className="vtde-toast-icon">{t.icon}</span>
          <div className="vtde-toast-content">
            <strong>{t.title}</strong>
            <span>{t.body}</span>
          </div>
          <button className="vtde-toast-dismiss" onClick={() => onDismiss(t.id)}>✕</button>
        </div>
      ))}
    </div>
  );
}
