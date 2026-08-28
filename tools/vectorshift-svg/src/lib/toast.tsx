import { useEffect, useState } from 'react';

type ToastKind = 'success' | 'error';

interface ToastMessage {
  id: string;
  kind: ToastKind;
  message: string;
}

interface ToastOptions {
  id?: string;
}

type ToastEventDetail = ToastMessage;

const TOAST_EVENT = 'vectorshift-toast';

const emitToast = (kind: ToastKind, message: string, options?: ToastOptions) => {
  const detail: ToastEventDetail = {
    id: options?.id ?? `${Date.now()}-${Math.random()}`,
    kind,
    message,
  };

  window.dispatchEvent(new CustomEvent<ToastEventDetail>(TOAST_EVENT, { detail }));
};

const toast = {
  success: (message: string, options?: ToastOptions) => emitToast('success', message, options),
  error: (message: string, options?: ToastOptions) => emitToast('error', message, options),
};

interface ToasterProps {
  position?: string;
  toastOptions?: unknown;
}

export function Toaster(_props: ToasterProps) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const onToast = (event: Event) => {
      const { detail } = event as CustomEvent<ToastEventDetail>;
      setMessages((previous) => {
        const withoutDuplicate = previous.filter((message) => message.id !== detail.id);
        return [...withoutDuplicate, detail].slice(-4);
      });

      window.setTimeout(() => {
        setMessages((previous) => previous.filter((message) => message.id !== detail.id));
      }, 4500);
    };

    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex max-w-sm flex-col gap-3">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`border bg-[#0A0A0A] px-4 py-3 font-mono text-xs uppercase tracking-wider text-[#F0F0F0] shadow-2xl ${
            message.kind === 'success' ? 'border-[#CCFF00]' : 'border-red-500'
          }`}
        >
          {message.message}
        </div>
      ))}
    </div>
  );
}

export default toast;
