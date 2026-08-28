import { DownloadCloud, CheckCircle2, AlertTriangle, Clock, Trash2 } from 'lucide-react';
import { HistoryItem } from './VectorShiftDashboard';

interface ExportHistoryProps {
  history: HistoryItem[];
  onClearHistory: () => void;
}

export function ExportHistory({ history, onClearHistory }: ExportHistoryProps) {
  return (
    <div className="bg-neutral-900 border border-[#333] flex flex-col font-mono mt-8">
      <header className="flex justify-between items-center p-4 border-b border-[#333] bg-[#0A0A0A]">
        <div className="flex items-center gap-3">
          <Clock className="w-4 h-4 text-[#CCFF00]" />
          <h3 className="text-[#CCFF00] text-xs font-black uppercase tracking-widest">Local Processing Ledger</h3>
        </div>

        {history.length > 0 && (
          <button
            onClick={onClearHistory}
            className="flex items-center gap-2 px-3 py-1 text-[10px] uppercase font-bold tracking-widest border border-transparent text-neutral-500 hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Clear History
          </button>
        )}
      </header>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#333] bg-neutral-900/50">
              <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-neutral-500">File Name</th>
              <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Timestamp</th>
              <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Status</th>
              <th className="p-4 text-[10px] font-bold uppercase tracking-widest text-neutral-500 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-xs text-neutral-500 italic">No exports recorded yet.</td>
              </tr>
            ) : (
              history.map((item) => (
                <tr key={item.id} className="border-b border-[#222] hover:bg-[#111] transition-colors">
                  <td className="p-4 text-xs text-[#F0F0F0] truncate max-w-[200px]">{item.name}</td>
                  <td className="p-4 text-xs text-neutral-500">{item.time}</td>
                  <td className="p-4">
                    {item.status === 'success' ? (
                      <span className="inline-flex items-center gap-1.5 text-[10px] text-[#CCFF00] uppercase font-bold tracking-widest border border-[#CCFF00]/30 bg-[#CCFF00]/10 px-2 py-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Completed
                      </span>
                    ) : item.status === 'skipped' ? (
                      <span className="inline-flex items-center gap-1.5 text-[10px] text-amber-400 uppercase font-bold tracking-widest border border-amber-400/30 bg-amber-400/10 px-2 py-1" title={item.error}>
                        <AlertTriangle className="w-3 h-3" />
                        Skipped
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[10px] text-red-500 uppercase font-bold tracking-widest border border-red-500/30 bg-red-500/10 px-2 py-1" title={item.error}>
                        <AlertTriangle className="w-3 h-3" />
                        Failed
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    {item.status === 'success' && item.downloadUrl ? (
                      <a
                        href={item.downloadUrl}
                        download={item.outputName}
                        className="inline-flex p-2 border border-[#333] text-neutral-400 hover:text-[#CCFF00] hover:border-[#CCFF00] transition-colors"
                        title={item.outputPath || 'Download SVG'}
                      >
                        <DownloadCloud className="w-4 h-4" />
                      </a>
                    ) : (
                      <button
                        disabled
                        className="p-2 border border-[#333] text-neutral-400 opacity-30 transition-colors"
                        title="No SVG output available"
                      >
                        <DownloadCloud className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
