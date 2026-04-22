import { X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  showArchived: boolean;
  onToggleArchived: (value: boolean) => void;
}

export function SettingsModal({ isOpen, onClose, showArchived, onToggleArchived }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState(localStorage.getItem('vibe_api_key') || '');
  const [ollamaUrl, setOllamaUrl] = useState(localStorage.getItem('vibe_ollama_url') || 'http://localhost:11434');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-vibe-dark border border-white/10 rounded-lg shadow-2xl p-6 animate-in zoom-in-95 duration-200">

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
            <span className="w-2 h-6 bg-neon-purple rounded-full"/>
            System Configuration
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6 overflow-y-auto max-h-[70vh] pr-2">
          {/* API Key Section */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">
              DeepSeek API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-neon-purple focus:outline-none focus:ring-1 focus:ring-neon-purple transition-all"
            />
            <p className="text-[10px] text-gray-500">
              Required for Cloud inference. Stored locally. Get key at <a href="https://openrouter.ai/" target="_blank" rel="noopener noreferrer" className="text-neon-purple hover:underline">openrouter.ai</a>.
            </p>
          </div>

          {/* Ollama URL Section */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">
              Local Inference URL (Ollama)
            </label>
            <input
              type="text"
              value={ollamaUrl}
              onChange={(e) => setOllamaUrl(e.target.value)}
              placeholder="http://localhost:11434"
              className="w-full bg-black/30 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-neon-purple focus:outline-none focus:ring-1 focus:ring-neon-purple transition-all"
            />
            <p className="text-[10px] text-gray-500">
              Default: http://localhost:11434
            </p>
          </div>

          {/* Interface Mode */}
           <div className="space-y-2">
            <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">
              Interface Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button className="px-3 py-2 bg-neon-purple/20 border border-neon-purple text-neon-purple text-xs font-bold rounded">
                Cyberpunk Pro
              </button>
              <button disabled className="px-3 py-2 bg-white/5 border border-white/5 text-gray-500 text-xs font-bold rounded cursor-not-allowed opacity-50">
                Light (Locked)
              </button>
            </div>
          </div>

          {/* Data Management Section */}
          <div className="pt-4 border-t border-white/10 space-y-4">
            <h3 className="text-sm font-bold text-gray-200">Data Management</h3>

            {/* Show Archived Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm text-gray-300">Show Archived Cases</span>
                <span className="text-[10px] text-gray-500">Include soft-deleted items in lists</span>
              </div>
              <button
                onClick={() => onToggleArchived(!showArchived)}
                className={cn(
                  "w-10 h-5 rounded-full relative transition-colors duration-200",
                  showArchived ? "bg-neon-mint" : "bg-white/10"
                )}
              >
                <div className={cn(
                  "absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform duration-200",
                  showArchived ? "translate-x-5 shadow-sm" : "translate-x-0"
                )} />
              </button>
            </div>

            {/* Clear Local Cache */}
             <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm text-gray-300">Local Cache</span>
                <span className="text-[10px] text-gray-500">Clear temporary data and tokens</span>
              </div>
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="px-3 py-1.5 text-xs text-alert-pink border border-alert-pink/30 hover:bg-alert-pink/10 rounded transition-colors"
              >
                Clear Cache
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              // Save logic here (e.g. localStorage)
              localStorage.setItem('vibe_api_key', apiKey);
              localStorage.setItem('vibe_ollama_url', ollamaUrl);
              onClose();
            }}
            className="px-4 py-2 bg-neon-mint text-black font-bold text-sm rounded hover:bg-neon-mint/90 transition-all shadow-[0_0_10px_rgba(0,255,159,0.3)]"
          >
            Save Configuration
          </button>
        </div>

      </div>
    </div>
  );
}
