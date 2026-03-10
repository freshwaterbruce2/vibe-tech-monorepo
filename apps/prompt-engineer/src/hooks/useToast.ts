// Local stub — @vibetech/ui doesn't exist in this workspace

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  return {
    toast: (_opts?: ToastOptions) => {
      // no-op stub
    },
  };
}

export function toast(_opts?: ToastOptions) {
  // no-op stub
}
