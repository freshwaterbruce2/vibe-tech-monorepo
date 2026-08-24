/**
 * AIChat StepCard helpers
 * Non-component utilities shared by step card components.
 * Kept out of StepCard.tsx so Fast Refresh works (react-refresh/only-export-components).
 */
import type { ReactElement } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Shield, XCircle } from 'lucide-react';

import type { StepStatus } from '../../types';

export function getStepIcon(status: StepStatus): ReactElement {
  switch (status) {
    case 'in_progress':
      return <Loader2 size={14} className="animate-spin" />;
    case 'completed':
      return <CheckCircle2 size={14} />;
    case 'failed':
      return <XCircle size={14} />;
    case 'awaiting_approval':
      return <Shield size={14} />;
    default:
      return <AlertCircle size={14} />;
  }
}
