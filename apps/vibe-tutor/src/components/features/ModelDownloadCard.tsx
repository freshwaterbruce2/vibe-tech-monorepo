import type { UseLocalAIResult } from '../../hooks/useLocalAI';

interface ModelDownloadCardProps {
  localAi: UseLocalAIResult;
}

/**
 * Download lifecycle UI for the on-device AI model. Renders the one-time
 * download prompt, a live progress bar while weights are fetched, and any
 * download error. Renders nothing when the model is ready or unsupported.
 */
const ModelDownloadCard = ({ localAi }: ModelDownloadCardProps) => {
  const { status, progress, error, requestDownload } = localAi;

  if (status === 'available' || status === 'unavailable') {
    return error ? <p className="text-sm text-[var(--error-accent)] mt-2">{error}</p> : null;
  }

  if (status === 'downloading') {
    const percent = Math.round(progress * 100);
    return (
      <div className="mt-3 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
        <p className="text-sm text-text-primary mb-2">
          Setting up offline AI... downloading model weights ({percent}%)
        </p>
        <div
          className="w-full h-2 bg-slate-700 rounded-full overflow-hidden"
          role="progressbar"
          aria-label="AI model download progress"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full bg-[var(--secondary-accent)] transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-xs text-text-secondary mt-2">
          This happens once. You can keep using the app while it downloads.
        </p>
      </div>
    );
  }

  // status === 'downloadable'
  return (
    <div className="mt-3 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
      <p className="text-sm text-text-primary mb-3">
        Study tools can run fully on this device -- free, private, and offline. A one-time
        model download (about 2 GB) is needed first.
      </p>
      <button
        type="button"
        onClick={() => void requestDownload()}
        className="px-4 py-2 rounded-md bg-[var(--secondary-accent)] text-background-main font-semibold text-sm hover:opacity-90"
      >
        Enable offline AI
      </button>
      {error && <p className="text-sm text-[var(--error-accent)] mt-2">{error}</p>}
    </div>
  );
};

export default ModelDownloadCard;
