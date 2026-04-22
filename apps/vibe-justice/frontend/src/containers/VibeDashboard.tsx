import { useState, useEffect } from 'react';
import { useBrainScan } from '../hooks/useBrainScan';
import { JusticeResultCard } from '../components/JusticeResultCard';

export const VibeDashboard = () => {
  const [activeCode, setActiveCode] = useState<string>('');
  const { performScan, results, isScanning, error } = useBrainScan();

  // 2025 Standard: Debounced "Passive Scan"
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeCode.trim().length > 10) {
        performScan(activeCode);
      }
    }, 800); // 800ms debounce to prevent D: drive thrashing

    return () => clearTimeout(timer);
  }, [activeCode, performScan]);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
      {/* Code Input Area */}
      <div className="flex-1 flex flex-col border-r border-slate-800">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <h2 className="text-sm font-bold tracking-tight text-slate-400">ARCHITECT VIEW</h2>
          <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            D:\VIBE-TECH ACTIVE
          </span>
        </div>
        <textarea
          className="flex-1 p-6 bg-transparent font-mono text-sm resize-none focus:outline-none placeholder:text-slate-700"
          placeholder="// Paste logic here for a real-time BrainScan..."
          value={activeCode}
          onChange={(e) => setActiveCode(e.target.value)}
        />
      </div>

      {/* Intelligence Sidebar */}
      <div className="w-96 bg-slate-900/30 backdrop-blur-xl p-4 overflow-y-auto">
        <div className="mb-6 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isScanning ? 'bg-indigo-500 animate-pulse' : 'bg-slate-700'}`} />
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Justice Rules Found</h3>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            {error}
          </div>
        )}

        {!isScanning && results.length === 0 && activeCode.length > 0 && (
          <p className="text-xs text-slate-600 italic">No direct logic violations detected. Vibe is clear.</p>
        )}

        <div className="space-y-4">
          {results.map((item) => (
            <JusticeResultCard 
              key={item.id} 
              pattern={item} 
              score={item.relevance} 
            />
          ))}
        </div>
      </div>
    </div>
  );
};
