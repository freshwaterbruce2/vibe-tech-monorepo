import React from 'react';
import { X, ChevronUp, ChevronDown, Terminal as TerminalIcon, Play, Trash2 } from 'lucide-react';
import { useIDEStore } from '@/lib/store';

export const Terminal: React.FC = () => {
  const { logs, isTerminalOpen, toggleTerminal, clearLogs } = useIDEStore();

  if (!isTerminalOpen) {
    return (
      <div 
        onClick={() => toggleTerminal(true)}
        className="h-8 bg-zinc-900 border-t border-white/10 flex items-center px-4 gap-2 cursor-pointer hover:bg-zinc-800 transition-colors"
      >
        <TerminalIcon className="w-3.5 h-3.5 text-electric-violet" />
        <span className="text-xs font-mono text-zinc-400">Terminal</span>
        <div className="flex-1" />
        <ChevronUp className="w-3.5 h-3.5 text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="h-40 bg-zinc-950 border-t border-white/10 flex flex-col">
      <div className="h-8 min-h-[32px] bg-zinc-900 border-b border-white/5 flex items-center px-4 justify-between select-none">
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 cursor-pointer text-zinc-100">
              <TerminalIcon className="w-3.5 h-3.5 text-electric-violet" />
              <span className="text-xs font-semibold">Terminal</span>
           </div>
           <div className="flex items-center gap-2 cursor-pointer text-zinc-500 hover:text-zinc-300">
              <span className="text-xs">Output</span>
           </div>
           <div className="flex items-center gap-2 cursor-pointer text-zinc-500 hover:text-zinc-300">
              <span className="text-xs">Problems</span>
           </div>
        </div>
        <div className="flex items-center gap-2">
           <button className="p-1 hover:bg-white/5 rounded text-zinc-400 hover:text-zinc-100">
             <Play className="w-3 h-3" />
           </button>
           <button 
             onClick={clearLogs}
             className="p-1 hover:bg-white/5 rounded text-zinc-400 hover:text-zinc-100"
           >
             <Trash2 className="w-3 h-3" />
           </button>
           <button 
             onClick={() => toggleTerminal(false)}
             className="p-1 hover:bg-white/5 rounded text-zinc-400 hover:text-zinc-100"
           >
             <ChevronDown className="w-3.5 h-3.5" />
           </button>
           <button 
             onClick={() => toggleTerminal(false)}
             className="p-1 hover:bg-white/5 rounded text-zinc-400 hover:text-zinc-100"
           >
             <X className="w-3.5 h-3.5" />
           </button>
        </div>
      </div>
      <div className="flex-1 p-3 font-mono text-xs overflow-y-auto">
        {logs.map((log, i) => (
          <div key={i} className={`mb-1 ${
             log.type === 'success' ? 'text-green-400' : 
             log.type === 'info' ? 'text-blue-400' :
             log.type === 'warning' ? 'text-yellow-400' :
             log.type === 'error' ? 'text-red-400' :
             log.type === 'dim' ? 'text-zinc-500' : 'text-zinc-300'
          }`}>
             <span className="opacity-50 mr-2">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
             {log.text}
          </div>
        ))}
        <div className="flex items-center gap-2 mt-2">
           <span className="text-electric-violet">➜</span>
           <span className="text-cyan-400">~/project</span>
           <span className="text-zinc-500 animate-pulse">_</span>
        </div>
      </div>
    </div>
  );
};