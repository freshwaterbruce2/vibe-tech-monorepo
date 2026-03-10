import React from 'react';
import { Monitor, Smartphone, Tablet, RotateCw, Globe } from 'lucide-react';

export const DeviceToolbar: React.FC = () => {
  return (
    <div className="h-10 bg-zinc-900 border-b border-white/5 flex items-center justify-between px-4">
      <div className="flex items-center gap-1">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50" />
      </div>

      <div className="flex items-center bg-zinc-950 rounded-md border border-white/5 px-2 py-1 gap-2 min-w-[300px]">
        <Globe className="w-3.5 h-3.5 text-zinc-500" />
        <span className="text-xs text-zinc-400 font-mono">localhost:3000</span>
      </div>

      <div className="flex items-center gap-2">
         <button className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">
            <RotateCw className="w-3.5 h-3.5" />
         </button>
         <div className="w-[1px] h-4 bg-white/10 mx-1" />
         <button className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">
            <Monitor className="w-3.5 h-3.5" />
         </button>
         <button className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">
            <Tablet className="w-3.5 h-3.5" />
         </button>
         <button className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">
            <Smartphone className="w-3.5 h-3.5" />
         </button>
      </div>
    </div>
  );
};
