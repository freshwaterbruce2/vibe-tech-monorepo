import React from 'react';
import type { ChatMessage } from '../../../types';

export interface ReportModalProps {
  pendingReport: ChatMessage;
  includeReportContent: boolean;
  setIncludeReportContent: (include: boolean) => void;
  reportError: string | null;
  reportingTimestamp: number | null;
  onCancel: () => void;
  onReport: (msg: ChatMessage) => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  pendingReport,
  includeReportContent,
  setIncludeReportContent,
  reportError,
  reportingTimestamp,
  onCancel,
  onReport,
}) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Report message"
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    >
      <div className="w-full max-w-md rounded-xl bg-[var(--background-card)] p-5 shadow-xl">
        <h2 className="text-lg font-bold">Report this response?</h2>
        <p className="mt-2 text-sm text-text-secondary">
          Reports include only chat type, role, and time by default. Message content is not
          attached unless you choose it.
        </p>
        <label className="mt-4 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeReportContent}
            onChange={(event) => setIncludeReportContent(event.target.checked)}
          />{' '}
          <span>Attach this message’s content</span>
        </label>
        {reportError && <p role="alert" className="mt-3 text-sm text-red-200">{reportError}</p>}
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            disabled={reportingTimestamp === pendingReport.timestamp}
            className="min-h-[44px] px-3 disabled:opacity-50"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={reportingTimestamp === pendingReport.timestamp}
            className="min-h-[44px] rounded bg-red-600 px-3 disabled:opacity-50"
            onClick={() => onReport(pendingReport)}
          >
            {reportingTimestamp === pendingReport.timestamp
              ? 'Sending report…'
              : reportError
                ? 'Retry report'
                : 'Send report'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;
