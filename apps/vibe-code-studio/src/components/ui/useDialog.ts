/**
 * Hook for managing dialog state.
 * Kept out of dialog.tsx so Fast Refresh works
 * (react-refresh/only-export-components).
 */
import { useState } from 'react';

import type { DialogVariant } from './dialog';

export const useDialog = () => {
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant?: DialogVariant;
    confirmLabel?: string;
    onConfirm?: () => void;
  } | null>(null);

  const showDialog = (
    title: string,
    message: string,
    options?: {
      variant?: DialogVariant;
      confirmLabel?: string;
      onConfirm?: () => void;
    }
  ) => {
    setDialog({
      isOpen: true,
      title,
      message,
      variant: options?.variant ?? 'info',
      confirmLabel: options?.confirmLabel ?? 'Confirm',
      onConfirm: options?.onConfirm,
    });
  };

  const hideDialog = () => {
    setDialog(null);
  };

  return {
    dialog,
    showDialog,
    hideDialog,
  };
};
