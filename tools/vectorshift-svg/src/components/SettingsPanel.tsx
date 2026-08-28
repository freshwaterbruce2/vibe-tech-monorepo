import { X, Save, Cpu, HardDrive, LayoutTemplate, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from '../lib/toast';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [vram, setVram] = useState(12);
  const [model, setModel] = useState('svg-wrapper');
  const [outputDir, setOutputDir] = useState('D:/VectorShift_Outputs');
  const [isPurging, setIsPurging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let ignore = false;

    fetch('/api/settings')
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (ignore) return;
        setOutputDir(data.outputDir ?? 'D:/VectorShift_Outputs');
        setModel(data.model ?? 'svg-wrapper');
        setVram(data.vramGb ?? 12);
      })
      .catch(() => {
        toast.error('Vector engine settings are not available yet.');
      });

    return () => {
      ignore = true;
    };
  }, [isOpen]);

  const handlePurge = async () => {
    setIsPurging(true);
    try {
      const res = await fetch('/api/purge-cache', { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.status === 'success') {
         toast.success('VRAM & Cache Purged!');
      } else {
         toast.error(`Purge failed: ${data.message}`);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      toast.error(`Purge failed: ${message}`);
    } finally {
      setIsPurging(false);
    }
  };

  const handleApply = async () => {
    setIsSaving(true);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outputDir, model, vramGb: vram }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setOutputDir(data.outputDir ?? outputDir);
      setModel(data.model ?? model);
      setVram(data.vramGb ?? vram);
      toast.success('Settings applied!');
      onClose();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      toast.error(`Settings failed: ${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-md h-full bg-[#0A0A0A] border-l border-[#333] flex flex-col animate-in slide-in-from-right duration-300">
        <header className="flex justify-between items-center p-6 border-b border-[#333]">
          <h2 className="text-[#CCFF00] font-black uppercase italic tracking-widest flex items-center gap-2 text-xl">
            <Cpu className="w-5 h-5" />
            Engine Settings
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-[#CCFF00] transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </header>

        <div className="flex-1 p-6 space-y-8 overflow-y-auto font-mono">

          {/* Active Model */}
          <div className="space-y-4">
            <label className="block text-xs font-bold uppercase tracking-widest text-neutral-400">
              Active Neural Model
            </label>
            <div className="relative">
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-neutral-900 border border-[#333] text-[#F0F0F0] p-3 appearance-none focus:outline-none focus:border-[#CCFF00] transition-colors cursor-pointer"
              >
                <option value="svg-wrapper">Exact Visual SVG</option>
                <option value="vtracer-detailed">VTracer High Detail Paths</option>
                <option value="vtracer-balanced">VTracer Balanced Color</option>
                <option value="vtracer-lineart">VTracer Line Art</option>
                <option value="opencv-color">Legacy OpenCV Fallback</option>
              </select>
              <LayoutTemplate className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#CCFF00] pointer-events-none" />
            </div>
            <p className="text-[10px] text-neutral-500 uppercase flex gap-1 items-start">
               <span className="text-[#CCFF00]">*</span> Exact Visual preserves the original image inside SVG; VTracer creates editable vector paths.
            </p>
          </div>

          {/* VRAM Ceiling */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-bold uppercase tracking-widest text-neutral-400">
                VRAM Ceiling limit
              </label>
              <span className="text-[#CCFF00] font-black">{vram} GB</span>
            </div>
            <input
              type="range"
              min="4"
              max="12"
              step="2"
              value={vram}
              onChange={(e) => setVram(Number(e.target.value))}
              className="w-full accent-[#CCFF00] h-1 bg-[#333] appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-neutral-600 uppercase font-bold">
              <span>4GB</span>
              <span>12GB</span>
            </div>
          </div>

          {/* Output Directory */}
          <div className="space-y-4">
            <label className="block text-xs font-bold uppercase tracking-widest text-neutral-400">
              Local Output Directory
            </label>
            <div className="relative flex items-center">
              <HardDrive className="absolute left-3 w-4 h-4 text-[#CCFF00]" />
              <input
                type="text"
                value={outputDir}
                onChange={(e) => setOutputDir(e.target.value)}
                className="w-full bg-neutral-900 border border-[#333] text-[#F0F0F0] p-3 pl-10 focus:outline-none focus:border-[#CCFF00] transition-colors"
                placeholder="e.g. D:/VectorShift_Outputs"
              />
            </div>
          </div>

        </div>

        <footer className="p-6 border-t border-[#333] bg-[#0A0A0A] flex gap-4">
          <button
            onClick={handlePurge}
            disabled={isPurging}
            className="flex items-center justify-center gap-2 border border-red-500/30 bg-red-500/10 text-red-500 py-4 px-6 font-black uppercase text-sm tracking-widest hover:bg-red-500 hover:text-[#0A0A0A] transition-colors disabled:opacity-50"
            title="Clear VRAM and Temporary Files"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleApply}
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 bg-[#CCFF00] text-[#0A0A0A] py-4 font-black uppercase text-sm tracking-widest hover:bg-[#AACC00] transition-colors"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Applying...' : 'Apply Settings'}
          </button>
        </footer>
      </div>
    </div>
  );
}
