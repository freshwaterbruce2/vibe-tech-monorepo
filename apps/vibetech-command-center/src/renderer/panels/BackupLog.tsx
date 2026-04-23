import { useState } from 'react';
import { Archive, HardDrive, FileArchive } from 'lucide-react';
import { Panel, Bytes, RelativeTime } from '@renderer/components/Panel';
import { useBackupList } from '@renderer/hooks';
import { basename } from '@renderer/lib/path';

export function BackupLog() {
  const { data, isLoading, isFetching, error, refetch } = useBackupList(50);
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const handleQuickBackup = async (sourcePath: string, label: string): Promise<void> => {
    setBusy(true);
    setLastResult(null);
    try {
      const res = await window.commandCenter.backup.create({ sourcePath, label });
      if (res.ok) {
        setLastResult(`backup created: ${basename(res.data.zipPath)} (${(res.data.sizeBytes / 1024 / 1024).toFixed(1)} MB)`);
        await refetch();
      } else {
        setLastResult(`backup failed: ${res.error}`);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel
      title={`Recent Backups (${data?.length ?? 0})`}
      loading={isFetching}
      error={error instanceof Error ? error.message : null}
      onRefresh={() => { void refetch(); }}
      actions={
        <div className="flex gap-2">
          <button
            className="btn btn-primary text-xs"
            disabled={busy}
            onClick={() => { void handleQuickBackup('C:\\dev\\apps', 'all-apps'); }}
          >
            <Archive size={12} /> Backup apps/
          </button>
          <button
            className="btn btn-primary text-xs"
            disabled={busy}
            onClick={() => { void handleQuickBackup('C:\\dev\\packages', 'all-packages'); }}
          >
            <Archive size={12} /> Backup packages/
          </button>
        </div>
      }
    >
      {lastResult && (
        <div className="mb-3 text-xs font-mono text-pulse-cyan-300 bg-pulse-cyan-900/30 border border-pulse-cyan-800 rounded px-3 py-2">
          {lastResult}
        </div>
      )}

      {isLoading ? (
        <div className="text-slate-500 text-sm">loading backups...</div>
      ) : (data ?? []).length === 0 ? (
        <div className="text-slate-500 text-sm italic">{'no backups yet in C:\\dev\\_backups'}</div>
      ) : (
        <div className="overflow-hidden rounded border border-bg-line">
          <table className="w-full text-sm">
            <thead className="bg-bg-elev text-slate-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="text-left px-3 py-2 font-medium">File</th>
                <th className="text-left px-3 py-2 font-medium">Label</th>
                <th className="text-right px-3 py-2 font-medium">Size</th>
                <th className="text-right px-3 py-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((b) => (
                <tr key={b.zipPath} className="border-t border-bg-line hover:bg-bg-elev/60 transition-colors">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <FileArchive size={14} className="text-pulse-cyan shrink-0" />
                      <span className="font-mono text-xs truncate max-w-[420px]" title={b.zipPath}>
                        {basename(b.zipPath)}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-slate-400 text-xs">{b.label ?? '—'}</td>
                  <td className="px-3 py-2 text-right"><Bytes n={b.sizeBytes} /></td>
                  <td className="px-3 py-2 text-right"><RelativeTime ts={b.createdAt} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        <HardDrive size={12} />
        <span className="font-mono">C:\dev\_backups\</span>
      </div>
    </Panel>
  );
}
