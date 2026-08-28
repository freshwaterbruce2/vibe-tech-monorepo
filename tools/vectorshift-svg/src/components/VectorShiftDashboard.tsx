import { useState } from 'react';
import BatchUploadZone from './BatchUploadZone';
import { ExportHistory } from './ExportHistory';
import { SettingsPanel } from './SettingsPanel';
import { Layers, Activity, Hexagon, Settings } from 'lucide-react';

export interface HistoryItem {
  id: string;
  name: string;
  time: string;
  status: 'success' | 'failed' | 'skipped';
  error?: string;
  outputPath?: string;
  outputName?: string;
  downloadUrl?: string;
}

export function VectorShiftDashboard() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const handleAddItems = (newItems: HistoryItem[]) => {
    setHistory((prev) => [...newItems, ...prev]);
  };

  const handleClearHistory = () => {
    setHistory([]);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F0F0F0] font-sans flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex justify-between items-center px-8 py-6 border-b border-[#333] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border-2 border-[#CCFF00] flex items-center justify-center text-[#CCFF00]">
            <Hexagon className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black uppercase italic tracking-tighter leading-none">Vector<span className="text-[#CCFF00]">Shift</span>.PRO</h1>
            <span className="text-[#CCFF00] font-mono text-[10px] tracking-widest uppercase">Neural Tracing Engine v1.3</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-2 text-xs font-mono text-neutral-400">
             <Activity className="w-4 h-4 text-[#CCFF00]" />
             <span>System Status: <span className="text-emerald-500 font-bold">Optimal</span></span>
          </div>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 border border-[#333] text-neutral-400 hover:text-[#0A0A0A] hover:bg-[#CCFF00] hover:border-[#CCFF00] transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 p-8 grid grid-cols-1 lg:grid-cols-4 gap-8 min-h-0 overflow-y-auto">

        {/* Left Column: Context or Export */}
        <div className="col-span-1 flex flex-col gap-6">
             <div className="bg-neutral-900 border border-[#333] p-6 flex flex-col h-full">
               <h2 className="text-[#CCFF00] text-[10px] font-black uppercase tracking-widest mb-6 py-1 px-2 border border-[#CCFF00] inline-block self-start">Pro Tier Activated</h2>

               <div className="space-y-6 flex-1">
                 <div className="border-l-2 border-[#CCFF00] pl-4">
                   <h3 className="text-sm font-bold uppercase italic text-[#F0F0F0]">Batch Processing</h3>
                   <p className="text-xs text-neutral-500 mt-1">Upload image folders and convert PNG, JPG, and WEBP assets into local SVG files.</p>
                 </div>

                 <div className="border-l-2 border-[#333] pl-4">
                   <h3 className="text-sm font-bold uppercase italic text-neutral-400">Format Support</h3>
                   <p className="text-xs text-neutral-500 mt-1">Outputs go to D:/VectorShift_Outputs by default and can be downloaded from the ledger.</p>
                 </div>
               </div>

               <div className="mt-8 pt-6 border-t border-[#333]">
                 <div className="flex items-center gap-3">
                   <Layers className="w-5 h-5 text-[#CCFF00]" />
                   <div className="text-xs font-mono uppercase text-neutral-400">
                      Auto-Tracing Models:<br/>
                      <span className="text-[#F0F0F0] font-bold tracking-wider">Exact Visual SVG (Active)</span>
                   </div>
                 </div>
               </div>
             </div>
        </div>

        {/* Center/Right Area: Viewport & Ledger */}
        <div className="col-span-1 lg:col-span-3 flex flex-col min-h-0 relative">
             <div className="flex-1 flex flex-col border border-[#333]">
               <BatchUploadZone onAddHistory={handleAddItems} />
             </div>

             <ExportHistory history={history} onClearHistory={handleClearHistory} />
        </div>

      </main>

      <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
