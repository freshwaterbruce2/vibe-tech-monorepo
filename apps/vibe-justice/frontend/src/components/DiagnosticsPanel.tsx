import { useState } from 'react';

export const DiagnosticsPanel = () => {
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${type.toUpperCase()}: ${msg}`, ...prev]);
  };

  const runDiagnostics = async () => {
    setLogs([]);
    addLog('Starting System Pulse...', 'info');

    try {
      // 1. Test IPC Bridge
      addLog('Pinging IPC Bridge...', 'info');
      const pong = await window.vibeTech.ping(); 
      if (pong === 'pong') addLog('IPC Bridge: ONLINE', 'success');
      
      // 2. Test Settings Write (D: Drive Config)
      addLog('Testing Config Persistence...', 'info');
      await window.vibeTech.setSetting('autoScan', false);
      const check = await window.vibeTech.getSetting('autoScan');
      if (check === false) {
        addLog('Config Persistence: WRITE VERIFIED', 'success');
        await window.vibeTech.setSetting('autoScan', true); // Revert
      } else {
        throw new Error(`Config write failed. Expected false, got ${check}`);
      }

      // 3. Test Vector Database
      // (Trigger a small search for "test")
      addLog('Scanning Vector Store...', 'info');
      // Note: This might fail if backend isn't running or returning correct format, 
      // but the diagnostics purpose is to check connectivity.
      const results = await window.vibeTech.searchLogic('test scan');
      // If results come back (even empty array), it means the call succeeded.
      const count = Array.isArray(results) ? results.length : (results?.patterns?.length || 0);
      addLog(`Vector Store: CONNECTED (${count} nodes found)`, 'success');

    } catch (error: unknown) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown IPC Error';
      addLog(`FAILURE: ${errorMessage}`, 'error');
    }
  };

  return (
    <div className="p-4 bg-slate-900 border border-slate-700 rounded-lg font-mono text-xs text-slate-300">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-slate-300 font-bold">SYSTEM DIAGNOSTICS</h3>
        <button 
          onClick={runDiagnostics}
          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded transition"
        >
          RUN PULSE
        </button>
      </div>
      <div className="h-32 overflow-y-auto bg-slate-950 p-2 rounded border border-slate-800">
        {logs.map((log, i) => (
          <div key={i} className={`mb-1 ${
            log.includes('SUCCESS') ? 'text-green-400' : 
            log.includes('FAILURE') ? 'text-red-400' : 'text-slate-400'
          }`}>
            {log}
          </div>
        ))}
      </div>
    </div>
  );
};
