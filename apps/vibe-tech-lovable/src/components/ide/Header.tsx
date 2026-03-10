import React from 'react';
import { Cloud, Code2, Eye, Layout, Share2, Download, Play } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { useIDEStore } from '@/lib/store';

export const Header: React.FC = () => {
  const { projectName } = useTheme();
  const { viewMode, setViewMode } = useIDEStore();

  return (
    <header className="h-14 border-b border-white/10 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between px-4 fixed top-0 left-0 right-0 z-50">
      {/* Left */}
      <div className="flex items-center gap-3">
        <span className="font-semibold text-sm text-gray-200">{projectName}</span>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-zinc-900 border border-white/5">
          <Cloud className="w-3 h-3 text-electric-violet" />
          <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400">Synced</span>
        </div>
      </div>

      {/* Center */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center bg-zinc-900/50 rounded-lg p-1 border border-white/5 backdrop-blur-sm">
        <button
          onClick={() => setViewMode('code')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-all ${viewMode === 'code' ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-white/10' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <Code2 className="w-3.5 h-3.5" />
          Code
        </button>
        <button
          onClick={() => setViewMode('preview')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-all ${viewMode === 'preview' ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-white/10' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <Eye className="w-3.5 h-3.5" />
          Preview
        </button>
        <button
          onClick={() => setViewMode('split')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-all ${viewMode === 'split' ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-white/10' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <Layout className="w-3.5 h-3.5" />
          Split
        </button>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors hover:bg-white/5 rounded-md">
          <Share2 className="w-3.5 h-3.5" />
          Share
        </button>
        <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors hover:bg-white/5 rounded-md">
          <Download className="w-3.5 h-3.5" />
          Export
        </button>
        <button className="flex items-center gap-2 px-4 py-1.5 bg-electric-violet hover:bg-electric-violet/90 text-white rounded-md text-xs font-bold transition-all shadow-[0_0_20px_rgba(124,58,237,0.3)] border border-white/10">
          <Play className="w-3.5 h-3.5 fill-current" />
          Deploy
        </button>
      </div>
    </header>
  );
};