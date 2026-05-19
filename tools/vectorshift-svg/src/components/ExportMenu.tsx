import { FileType2, Download, Zap } from 'lucide-react';
import { useState } from 'react';

interface ExportMenuProps {
  onExport: (format: string) => void;
  isExporting: boolean;
}

export function ExportMenu({ onExport, isExporting }: ExportMenuProps) {
  const [selectedFormat, setSelectedFormat] = useState('svg');

  const formats = [
    { id: 'svg', label: 'SVG', desc: 'Scalable web format, fully editable', badge: 'Recommended' },
    { id: 'eps', label: 'EPS', desc: 'Print industry standard, legacy support' },
    { id: 'pdf', label: 'PDF', desc: 'Document format with vector preservation' },
  ];

  return (
    <div className="bg-neutral-900 border border-[#333] flex flex-col p-6">
      <h3 className="text-[#CCFF00] font-mono text-xs tracking-widest uppercase mb-6 flex items-center gap-2">
        <Zap className="w-4 h-4" />
        Processing Complete
      </h3>

      <div className="space-y-4 flex-1">
        <p className="text-sm font-bold uppercase italic border-b border-[#333] pb-2 mb-4">Export Settings</p>

        <div className="flex flex-col gap-3">
          {formats.map((f) => (
            <label
              key={f.id}
              className={`flex items-start gap-3 p-4 border cursor-pointer transition-colors ${
                selectedFormat === f.id
                  ? 'border-[#CCFF00] bg-[#CCFF000a]'
                  : 'border-[#333] hover:border-neutral-500 bg-[#0A0A0A]'
              }`}
            >
              <input
                type="radio"
                name="format"
                value={f.id}
                checked={selectedFormat === f.id}
                onChange={() => setSelectedFormat(f.id)}
                className="mt-1 accent-[#CCFF00] bg-[#0A0A0A] border-[#333]"
              />
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className={`font-black uppercase tracking-tight ${selectedFormat === f.id ? 'text-[#CCFF00]' : 'text-[#F0F0F0]'}`}>
                    {f.label}
                  </span>
                  {f.badge && (
                    <span className="text-[9px] uppercase font-bold tracking-widest bg-neutral-800 text-neutral-400 px-2 py-0.5">
                      {f.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-neutral-500 font-mono">{f.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={() => onExport(selectedFormat)}
        disabled={isExporting}
        className="mt-8 w-full flex items-center justify-center gap-2 bg-[#CCFF00] text-[#0A0A0A] py-4 font-black uppercase text-sm tracking-widest hover:bg-[#AACC00] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isExporting ? (
           <div className="w-5 h-5 border-2 border-[#0A0A0A] border-t-transparent rounded-full animate-spin" />
        ) : (
           <>
             <Download className="w-5 h-5" />
             Download Vector
           </>
        )}
      </button>

      <div className="mt-4 text-center">
         <span className="text-[10px] text-neutral-600 uppercase font-bold tracking-widest">
           Credits remaining: <span className="text-[#CCFF00]">Unlimited (Pro)</span>
         </span>
      </div>
    </div>
  );
}
