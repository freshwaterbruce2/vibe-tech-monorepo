import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Shield, ShieldAlert, Play, RefreshCw, CheckCircle2, XCircle, Info } from 'lucide-react';
import type { SelfHealingTelemetry } from '../../shared/types';

export function SelfHealingPanel() {
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [terminalLog, setTerminalLog] = useState<string[]>([]);

  // Fetch telemetry from Electron IPC
  const { data: telemetry, isLoading, error, refetch } = useQuery<SelfHealingTelemetry>({
    queryKey: ['self-healing-telemetry'],
    queryFn: async () => {
      const res = await window.commandCenter.selfHealing.get();
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    refetchInterval: 10000, // Auto-refresh every 10s
  });

  // Manual Trigger Mutation
  const triggerMutation = useMutation({
    mutationFn: async () => {
      setRunning(true);
      setTerminalLog(['[SYSTEM] Initializing Self-Healing Loop...', '[SYSTEM] Spawning python -m tools.self-healing.orchestrator --auto-apply...']);
      const res = await window.commandCenter.selfHealing.trigger();
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (processHandle) => {
      setTerminalLog((prev) => [...prev, `[PROCESS] Spawened with PID ${processHandle.pid || 'unknown'}`, '[PROCESS] Monitoring logs...']);

      // Subscribe to process stdout/stderr streams via commandCenter stream API
      const unsubscribe = window.commandCenter.stream.subscribe('cc.process.chunk', (payload: any) => {
        if (payload && payload.processId === processHandle.id) {
          setTerminalLog((prev) => [...prev, payload.data]);
        }
      });

      const unsubscribeExit = window.commandCenter.stream.subscribe('cc.process.exit', (payload: any) => {
        if (payload && payload.processId === processHandle.id) {
          setTerminalLog((prev) => [...prev, `[SYSTEM] Process exited with code ${payload.exitCode}`]);
          setRunning(false);
          refetch();
          unsubscribe();
          unsubscribeExit();
        }
      });
    },
    onError: (err: any) => {
      setTerminalLog((prev) => [...prev, `[ERROR] Failed to run: ${err.message || String(err)}`]);
      setRunning(false);
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="animate-spin text-pulse-cyan mr-3" size={24} />
        <span className="text-slate-400 font-mono">Loading Self-Healing Telemetry...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-950/20 border border-red-500/30 rounded-lg flex items-start gap-4">
        <ShieldAlert className="text-red-400 shrink-0" size={24} />
        <div>
          <h3 className="font-semibold text-red-300">Failed to load Self-Healing Telemetry</h3>
          <p className="text-red-400/80 text-sm mt-1">{error instanceof Error ? error.message : String(error)}</p>
        </div>
      </div>
    );
  }

  const history = telemetry?.history ?? [];
  const selectedReport = history.find((h) => h.report_file === selectedReportId) ?? history[0] ?? null;

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-bg-panel border border-bg-line p-4 rounded-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-pulse-cyan" />
          <div className="text-slate-400 text-xs font-mono uppercase">System Status</div>
          <div className="mt-2 flex items-center gap-2">
            {telemetry?.config.killSwitch ? (
              <>
                <XCircle className="text-red-400" size={20} />
                <span className="text-red-400 font-bold tracking-wider font-mono">BLOCKED</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="text-status-ok" size={20} />
                <span className="text-status-ok font-bold tracking-wider font-mono">ACTIVE / SAFE</span>
              </>
            )}
          </div>
        </div>

        <div className="bg-bg-panel border border-bg-line p-4 rounded-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
          <div className="text-slate-400 text-xs font-mono uppercase">Dry Run Policy</div>
          <div className="mt-2 flex items-center gap-2">
            <Info className="text-amber-400" size={20} />
            <span className="text-amber-400 font-bold tracking-wider font-mono">
              {telemetry?.config.dryRun ? 'DRY-RUN (DRY)' : 'AUTO-FIX (LIVE)'}
            </span>
          </div>
        </div>

        <div className="bg-bg-panel border border-bg-line p-4 rounded-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
          <div className="text-slate-400 text-xs font-mono uppercase">Total Runs Logged</div>
          <div className="mt-2 text-2xl font-bold font-mono text-blue-400">{history.length}</div>
        </div>

        <div className="bg-bg-panel border border-bg-line p-4 rounded-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
          <div className="text-slate-400 text-xs font-mono uppercase">Issues Resolved</div>
          <div className="mt-2 text-2xl font-bold font-mono text-status-ok">
            {history.reduce((sum, h) => sum + (h.summary.total_issues_fixed || 0), 0)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Execution Controls & History */}
        <div className="space-y-6 lg:col-span-1">
          {/* Controls */}
          <div className="bg-bg-panel border border-bg-line p-4 rounded-lg space-y-4">
            <h3 className="text-sm font-semibold text-slate-300 font-mono uppercase">Controls</h3>
            <button
              onClick={() => triggerMutation.mutate()}
              disabled={running || telemetry?.config.killSwitch}
              className="w-full py-2.5 px-4 bg-pulse-cyan-900 border border-pulse-cyan text-pulse-cyan-300 hover:bg-pulse-cyan-800 disabled:opacity-50 disabled:cursor-not-allowed rounded font-semibold font-mono flex items-center justify-center gap-2 transition-all shadow-glow"
            >
              {running ? (
                <>
                  <RefreshCw className="animate-spin" size={16} />
                  HEALING RUNNING...
                </>
              ) : (
                <>
                  <Play size={16} />
                  TRIGGER MANUAL TRIAGE
                </>
              )}
            </button>
            <div className="text-[11px] text-slate-500 font-mono">
              Target: <span className="text-slate-400">python -m tools.self-healing.orchestrator --auto-apply</span>
            </div>
          </div>

          {/* History List */}
          <div className="bg-bg-panel border border-bg-line p-4 rounded-lg flex flex-col h-[400px]">
            <h3 className="text-sm font-semibold text-slate-300 font-mono uppercase mb-3 flex items-center justify-between">
              <span>Run History</span>
              <button onClick={() => refetch()} className="text-slate-400 hover:text-pulse-cyan">
                <RefreshCw size={14} />
              </button>
            </h3>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {history.length === 0 ? (
                <div className="text-slate-500 text-xs font-mono text-center pt-8">No reports found in log path.</div>
              ) : (
                history.map((report) => {
                  const isSelected = selectedReportId === report.report_file || (!selectedReportId && selectedReport === report);
                  const status = report.summary.overall_status;
                  const borderClass = isSelected ? 'border-pulse-cyan bg-pulse-cyan-950/20' : 'border-bg-line hover:border-slate-700 bg-bg-elev/30';
                  
                  return (
                    <button
                      key={report.report_file}
                      onClick={() => setSelectedReportId(report.report_file)}
                      className={`w-full text-left p-3 border rounded transition-all font-mono text-xs space-y-1 block ${borderClass}`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-slate-300 font-bold truncate max-w-[150px]">{report.report_file}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          status === 'healthy' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20' :
                          status === 'degraded' ? 'bg-red-950/40 text-red-400 border border-red-500/20' :
                          'bg-amber-950/40 text-amber-400 border border-amber-500/20'
                        }`}>
                          {status.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-slate-500 text-[10px]">{new Date(report.timestamp).toLocaleString()}</div>
                      <div className="flex gap-3 text-slate-400 text-[10px] pt-1">
                        <span>Found: {report.summary.total_issues_found}</span>
                        <span>Fixed: <span className="text-emerald-400 font-bold">{report.summary.total_issues_fixed}</span></span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right: Selected Report Details & Console Log */}
        <div className="space-y-6 lg:col-span-2">
          {/* Running Terminal Console */}
          {(running || terminalLog.length > 0) && (
            <div className="bg-black/85 border border-slate-800 rounded-lg overflow-hidden flex flex-col h-[280px]">
              <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex justify-between items-center">
                <span className="text-xs text-pulse-cyan font-mono font-bold flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-pulse-cyan animate-pulse" />
                  Live Triage Terminal Output
                </span>
                <button
                  onClick={() => setTerminalLog([])}
                  className="text-slate-500 hover:text-slate-300 text-xs font-mono"
                >
                  Clear Console
                </button>
              </div>
              <div className="flex-1 p-4 overflow-y-auto font-mono text-[11px] text-slate-300 space-y-1 bg-black/90 scrollbar-thin">
                {terminalLog.map((line, idx) => (
                  <div key={idx} className="whitespace-pre-wrap leading-relaxed">
                    {line.startsWith('[ERROR]') && <span className="text-red-400">{line}</span>}
                    {line.startsWith('[SYSTEM]') && <span className="text-pulse-cyan">{line}</span>}
                    {line.startsWith('[PROCESS]') && <span className="text-blue-400">{line}</span>}
                    {!line.startsWith('[ERROR]') && !line.startsWith('[SYSTEM]') && !line.startsWith('[PROCESS]') && line}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Details Section */}
          {selectedReport && (
            <div className="bg-bg-panel border border-bg-line p-5 rounded-lg space-y-4">
              <div className="flex justify-between items-center border-b border-bg-line pb-3">
                <div>
                  <h3 className="font-semibold text-slate-200 font-mono">{selectedReport.report_file}</h3>
                  <p className="text-[11px] text-slate-500 font-mono">Timestamp: {new Date(selectedReport.timestamp).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <span className={`px-2.5 py-1 rounded text-xs font-bold font-mono ${
                    selectedReport.summary.overall_status === 'healthy' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20' :
                    selectedReport.summary.overall_status === 'degraded' ? 'bg-red-950/40 text-red-400 border border-red-500/20' :
                    'bg-amber-950/40 text-amber-400 border border-amber-500/20'
                  }`}>
                    {selectedReport.summary.overall_status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Loop Details Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-400 font-mono uppercase">Loop Metrics</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse font-mono text-xs">
                    <thead>
                      <tr className="border-b border-bg-line text-slate-500 text-left">
                        <th className="py-2 pr-4 font-normal">Loop Name</th>
                        <th className="py-2 px-4 font-normal">Status</th>
                        <th className="py-2 px-4 font-normal text-center">Found</th>
                        <th className="py-2 px-4 font-normal text-center">Fixed</th>
                        <th className="py-2 px-4 font-normal text-center">Blocked</th>
                        <th className="py-2 pl-4 font-normal text-right">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-bg-line/50">
                      {selectedReport.loops.map((loop, idx) => (
                        <tr key={idx} className="hover:bg-bg-elev/10">
                          <td className="py-2.5 pr-4 font-semibold text-slate-300">{loop.loop_name}</td>
                          <td className="py-2.5 px-4">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              loop.status === 'success' ? 'bg-emerald-950/30 text-emerald-400 border border-emerald-500/10' :
                              loop.status === 'failed' ? 'bg-red-950/30 text-red-400 border border-red-500/10' :
                              loop.status === 'skipped' ? 'bg-slate-900 text-slate-500 border border-slate-800' :
                              'bg-amber-950/30 text-amber-400 border border-amber-500/10'
                            }`}>
                              {loop.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-center text-slate-300">{loop.issues_found}</td>
                          <td className="py-2.5 px-4 text-center text-emerald-400 font-bold">{loop.issues_fixed}</td>
                          <td className="py-2.5 px-4 text-center text-amber-500">{loop.issues_blocked}</td>
                          <td className="py-2.5 pl-4 text-right text-slate-500">{loop.duration_seconds.toFixed(1)}s</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Loop Details/Errors Block */}
              {selectedReport.loops.some((l) => (l.errors && l.errors.length > 0) || (l.fixes_applied && l.fixes_applied.length > 0)) && (
                <div className="space-y-4 pt-3 border-t border-bg-line/50">
                  <h4 className="text-xs font-semibold text-slate-400 font-mono uppercase">Details & Applied Fixes</h4>
                  {selectedReport.loops.map((loop, idx) => {
                    const hasErrors = loop.errors && loop.errors.length > 0;
                    const hasFixes = loop.fixes_applied && loop.fixes_applied.length > 0;
                    if (!hasErrors && !hasFixes) return null;

                    return (
                      <div key={idx} className="bg-bg-elev/20 border border-bg-line p-3 rounded font-mono text-xs space-y-2">
                        <div className="font-semibold text-slate-300 uppercase">{loop.loop_name} logs</div>
                        {hasFixes && (
                          <div className="space-y-1">
                            <div className="text-[10px] text-slate-500">Fixes Applied:</div>
                            <ul className="list-disc list-inside space-y-0.5 text-emerald-400/90 text-[11px]">
                              {loop.fixes_applied.map((fix, fIdx) => (
                                <li key={fIdx}>{fix}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {hasErrors && (
                          <div className="space-y-1">
                            <div className="text-[10px] text-slate-500">Errors:</div>
                            <ul className="list-disc list-inside space-y-0.5 text-red-400/90 text-[11px]">
                              {loop.errors.map((err, eIdx) => (
                                <li key={eIdx}>{err}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Policy Viewer */}
          {telemetry?.policy && (
            <div className="bg-bg-panel border border-bg-line p-5 rounded-lg space-y-3">
              <h3 className="text-sm font-semibold text-slate-300 font-mono uppercase flex items-center gap-2">
                <Shield size={16} className="text-pulse-cyan" />
                Self-Healing Policy Config (SELF_HEALING.md)
              </h3>
              <div className="max-h-[300px] overflow-y-auto bg-black/30 border border-bg-line/50 p-4 rounded font-mono text-xs text-slate-400 whitespace-pre-wrap leading-relaxed">
                {telemetry.policy}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
