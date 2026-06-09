import { useState, useEffect, useRef } from 'react';
import { Play, Square, ExternalLink, RefreshCw, Cpu, Activity, ShieldCheck } from 'lucide-react';
import { Panel } from '@renderer/components/Panel';

export function HermesPanel() {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(true);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [processId, setProcessId] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [webviewLoading, setWebviewLoading] = useState<boolean>(true);
  const [webviewError, setWebviewError] = useState<{ message: string; code?: number } | null>(null);
  const logsEndRef = useRef<HTMLDivElement | null>(null);
  const webviewRef = useRef<any>(null);

  // Probe server health to see if it is running (even if launched externally)
  const probeHealth = async (): Promise<boolean> => {
    try {
      // Use no-cors to prevent CORS blocks, we only care if a TCP response is returned
      await fetch('http://127.0.0.1:8787/health', { mode: 'no-cors', cache: 'no-store' });
      return true;
    } catch {
      return false;
    }
  };

  const checkStatus = async () => {
    setIsChecking(true);
    const alive = await probeHealth();
    setIsRunning(alive);
    setIsChecking(false);
  };

  // Initial check and periodic polling
  useEffect(() => {
    checkStatus();
    const interval = setInterval(async () => {
      const alive = await probeHealth();
      setIsRunning(alive);
      if (alive) {
        setIsStarting(false);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Reset webview states when isRunning becomes true
  useEffect(() => {
    if (isRunning) {
      setWebviewLoading(true);
      setWebviewError(null);
    }
  }, [isRunning]);

  // Hook up webview events to track loading lifecycle and errors
  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleStartLoading = () => {
      setWebviewLoading(true);
      setWebviewError(null);
    };

    const handleStopLoading = () => {
      setWebviewLoading(false);
    };

    const handleDomReady = () => {
      setWebviewLoading(false);
    };

    const handleFailLoad = (e: any) => {
      if (e.isMainFrame) {
        setWebviewError({
          message: e.errorDescription || 'Connection to Hermes WebUI failed.',
          code: e.errorCode,
        });
        setWebviewLoading(false);
      }
    };

    const handleCrashed = () => {
      setWebviewError({
        message: 'The Hermes WebUI guest process crashed.',
      });
      setWebviewLoading(false);
    };

    webview.addEventListener('did-start-loading', handleStartLoading);
    webview.addEventListener('did-stop-loading', handleStopLoading);
    webview.addEventListener('dom-ready', handleDomReady);
    webview.addEventListener('did-fail-load', handleFailLoad);
    webview.addEventListener('crashed', handleCrashed);

    return () => {
      webview.removeEventListener('did-start-loading', handleStartLoading);
      webview.removeEventListener('did-stop-loading', handleStopLoading);
      webview.removeEventListener('dom-ready', handleDomReady);
      webview.removeEventListener('did-fail-load', handleFailLoad);
      webview.removeEventListener('crashed', handleCrashed);
    };
  }, [isRunning, webviewRef.current]);

  const handleReloadWebview = () => {
    if (webviewRef.current) {
      setWebviewError(null);
      setWebviewLoading(true);
      webviewRef.current.reload();
    }
  };

  // Auto-scroll logs to the bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Subscribe to process outputs if we spawned it
  useEffect(() => {
    if (!processId) return;

    const unsubscribe = window.commandCenter.stream.subscribe('cc.process.chunk', (chunk: any) => {
      if (chunk && chunk.processId === processId) {
        setLogs((prev) => [...prev, chunk.data].slice(-100));
      }
    });

    const unsubscribeExit = window.commandCenter.stream.subscribe('cc.process.exit', (event: any) => {
      if (event && event.id === processId) {
        setIsStarting(false);
        setIsRunning(false);
        setProcessId(null);
        setLogs((prev) => [...prev, `[System] Hermes WebUI process exited with code ${event.exitCode}`]);
      }
    });

    return () => {
      unsubscribe();
      unsubscribeExit();
    };
  }, [processId]);

  const handleLaunch = async () => {
    setIsStarting(true);
    setLogs(['[System] Launching Hermes WebUI via start.ps1...']);

    // Check if hermes-webui exists
    const statRes = await window.commandCenter.fs.stat('C:\\dev\\tools\\hermes-webui\\start.ps1');
    if (!statRes.ok || !statRes.data.exists) {
      setLogs((prev) => [...prev, '[Error] start.ps1 not found in C:\\dev\\tools\\hermes-webui\\. Please check your installation.']);
      setIsStarting(false);
      return;
    }

    // Spawn powershell execution in background
    const spawnRes = await window.commandCenter.process.spawn({
      command: 'powershell.exe',
      args: ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', 'C:\\dev\\tools\\hermes-webui\\start.ps1', '-Port', '8787'],
      cwd: 'C:\\dev\\tools\\hermes-webui'
    });

    if (spawnRes.ok) {
      const procData = spawnRes.data;
      setProcessId(procData.id);
      setLogs((prev) => [...prev, `[System] Process spawned (PID: ${procData.pid || 'unknown'}). Waiting for server response...`]);

      // Poll aggressively for 15 seconds to detect startup
      let attempts = 0;
      const pollTimer = setInterval(async () => {
        attempts++;
        const alive = await probeHealth();
        if (alive) {
          setIsRunning(true);
          setIsStarting(false);
          clearInterval(pollTimer);
          setLogs((prev) => [...prev, '[System] Hermes WebUI is up and responding! Loading interface...']);
        } else if (attempts >= 15) {
          clearInterval(pollTimer);
          setIsStarting(false);
          setLogs((prev) => [...prev, '[Warning] WebUI did not respond in time. It might still be starting, or check the terminal output below.']);
        }
      }, 1000);
    } else {
      setIsStarting(false);
      setLogs((prev) => [...prev, `[Error] Failed to spawn process: ${spawnRes.error || 'Unknown error'}`]);
    }
  };

  const handleStop = async () => {
    if (processId) {
      await window.commandCenter.process.kill(processId);
      setProcessId(null);
    }
    setIsStarting(false);
    setIsRunning(false);
    setLogs((prev) => [...prev, '[System] Hermes WebUI process terminated.']);
  };

  const handleOpenExternal = async () => {
    await window.commandCenter.process.spawn({
      command: 'explorer.exe',
      args: ['http://127.0.0.1:8787'],
      cwd: 'C:\\dev'
    });
  };

  return (
    <Panel
      title="Hermes Workspace"
      loading={isChecking && !isStarting}
      onRefresh={checkStatus}
      actions={
        <div className="flex items-center gap-2">
          {isRunning ? (
            <>
              <span className="flex items-center gap-1.5 text-xs text-status-ok font-mono bg-status-ok/10 px-2.5 py-1 rounded-full border border-status-ok/20">
                <ShieldCheck size={12} className="text-status-ok" />
                Live on 8787
              </span>
              <button
                onClick={handleOpenExternal}
                className="btn btn-primary text-xs py-1 px-2.5"
                title="Open in external browser"
              >
                <ExternalLink size={12} /> Browser
              </button>
              {processId && (
                <button
                  onClick={handleStop}
                  className="btn text-xs py-1 px-2.5 text-status-error border-status-error/30 hover:bg-status-error/10"
                  title="Stop server"
                >
                  <Square size={12} /> Stop
                </button>
              )}
            </>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-slate-400 font-mono bg-bg-elev px-2.5 py-1 rounded-full border border-bg-line">
              <span className="status-dot bg-status-off" />
              Offline
            </span>
          )}
          <button
            onClick={checkStatus}
            className="btn text-xs py-1"
            title="Refresh status"
            disabled={isChecking || isStarting}
          >
            <RefreshCw size={12} className={isChecking ? 'animate-spin' : ''} />
          </button>
        </div>
      }
    >
      <div className="flex flex-col h-[calc(100vh-170px)]">
        {isRunning ? (
          <div className="flex-1 w-full h-full relative rounded-lg overflow-hidden border border-bg-line bg-bg-base shadow-glow-cyan">
            <webview
              ref={webviewRef}
              src="http://127.0.0.1:8787"
              className="w-full h-full border-0 absolute inset-0"
              allowpopups="true"
            />
            {/* Loading Overlay */}
            {webviewLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg-base/80 backdrop-blur-sm z-10">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative w-12 h-12">
                    <div className="absolute inset-0 rounded-full border-4 border-slate-800" />
                    <div className="absolute inset-0 rounded-full border-4 border-pulse-cyan border-t-transparent animate-spin" />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm font-mono tracking-wider text-pulse-cyan animate-pulse">
                      CONNECTING TO WEBUI...
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      Loading system resources
                    </span>
                  </div>
                </div>
              </div>
            )}
            {/* Error Overlay */}
            {webviewError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg-base/95 p-6 z-20 text-center border border-status-error/30 rounded-lg shadow-[0_0_25px_rgba(248,113,113,0.15)]">
                <div className="w-14 h-14 rounded-full bg-status-error/15 border border-status-error/30 flex items-center justify-center mb-4 text-status-error animate-bounce">
                  <Cpu size={28} />
                </div>
                <h3 className="text-lg font-bold text-slate-100 font-mono tracking-wide mb-2">
                  WebUI Connection Error
                </h3>
                <p className="text-slate-400 text-sm max-w-md mb-6 leading-relaxed text-wrap break-words">
                  {webviewError.message}
                  {webviewError.code && (
                    <span className="block mt-2 font-mono text-xs text-slate-500 bg-bg-elev/50 py-1 px-2.5 rounded border border-bg-line inline-block">
                      Error Code: {webviewError.code}
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleReloadWebview}
                    className="btn btn-primary px-4 py-2 flex items-center gap-2"
                  >
                    <RefreshCw size={14} /> Retry Connection
                  </button>
                  <button
                    onClick={handleStop}
                    className="btn text-status-error border-status-error/30 hover:bg-status-error/10 px-4 py-2 flex items-center gap-2"
                  >
                    <Square size={14} /> Stop Server
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-bg-elev/40 border border-bg-line rounded-lg text-center max-w-3xl mx-auto w-full my-4">
            <div className="w-16 h-16 rounded-full bg-pulse-cyan-900/40 border border-pulse-cyan-500/30 flex items-center justify-center mb-6 shadow-glow-cyan animate-pulse">
              <Cpu className="text-pulse-cyan text-pulse-cyan-300" size={32} />
            </div>

            <h2 className="text-xl font-bold text-slate-100 mb-2 font-mono tracking-wide">
              Hermes WebUI Launcher
            </h2>
            <p className="text-slate-400 text-sm max-w-md mb-6 leading-relaxed">
              Instantly launch the purpose-built browser dashboard for your Hermes AI agents.
              Keep operations centralized, run tasks, browse workspaces, and manage background settings.
            </p>

            <div className="flex items-center gap-3 mb-8">
              {!isStarting ? (
                <button
                  onClick={handleLaunch}
                  className="btn btn-primary px-6 py-2.5 text-base flex items-center gap-2 shadow-glow-cyan hover:shadow-glow-cyan-strong transition-all"
                >
                  <Play size={16} fill="currentColor" /> Launch WebUI
                </button>
              ) : (
                <button
                  disabled
                  className="btn btn-primary px-6 py-2.5 text-base flex items-center gap-2 cursor-not-allowed"
                >
                  <RefreshCw size={16} className="animate-spin text-pulse-cyan" /> Starting server...
                </button>
              )}
            </div>

            {/* Live Startup console logs */}
            {(isStarting || logs.length > 0) && (
              <div className="w-full max-w-xl text-left bg-[#080b12] border border-bg-line rounded-md p-4 mt-2">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-500 mb-2 pb-2 border-b border-bg-line">
                  <span className="flex items-center gap-1.5 font-mono">
                    <Activity size={10} className="text-pulse-cyan animate-pulse" />
                    Startup Console
                  </span>
                  {isStarting && <span className="text-pulse-cyan animate-pulse">polling health...</span>}
                </div>
                <div className="font-mono text-xs space-y-1.5 max-h-48 overflow-y-auto text-slate-300 leading-normal scrollbar-thin">
                  {logs.map((log, index) => {
                    let color = 'text-slate-300';
                    if (log.startsWith('[Error]')) color = 'text-status-error font-semibold';
                    else if (log.startsWith('[Warning]')) color = 'text-status-warn';
                    else if (log.startsWith('[System]')) color = 'text-pulse-cyan-300';
                    return (
                      <div key={index} className={color}>
                        {log}
                      </div>
                    );
                  })}
                  <div ref={logsEndRef} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}
