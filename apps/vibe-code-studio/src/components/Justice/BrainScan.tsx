import { Activity, Brain, Plus, Save, ShieldAlert, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { logger } from '../../services/Logger';

interface Pattern {
  id: string | number;
  pattern_data: string; // The text content
  pattern_hash?: string;
  usage_count: number;
  success_rate: number;
  updated_at: number;
  confidence?: number; // legacy support
  frequency?: number; // legacy support
}

export const BrainScan: React.FC = () => {
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPattern, setNewPattern] = useState('');

  const fetchMemory = async () => {
    try {
      if (window.electron?.db) {
          const data = await window.electron.db.getPatterns();
          setPatterns(((data as Record<string, unknown>)?.patterns as Pattern[] | undefined ?? []));
      }
    } catch (err) {
      logger.error("Failed to sync with Brain:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemory();
  }, []);

  const handleSave = async () => {
    if (!newPattern.trim()) return;
    try {
      // @ts-expect-error - legacy database API
      await window.electron.ipcRenderer.invoke('db:savePattern', { pattern: newPattern, tags: 'user-override' });
      setNewPattern('');
      setShowAddForm(false);
      fetchMemory(); // Refresh list immediately
    } catch (err) {
      logger.error("Failed to save pattern:", err);
    }
  };

  return (
    <div className="p-6 bg-slate-900/95 min-h-screen text-slate-100 font-sans backdrop-blur-sm">
      {/* Header */}
      <header className="flex items-center justify-between mb-8 border-b border-slate-700 pb-4">
        <div className="flex items-center gap-3">
          <Brain className="w-8 h-8 text-cyan-400" />
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Vibe-Justice: Brain Scan
            </h1>
            <p className="text-xs text-slate-500">Live Neural Interface • D:\databases\database.db</p>
          </div>
        </div>

        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg transition-all shadow-lg shadow-cyan-900/20"
        >
          <Plus className="w-4 h-4" /> Add Logic Rule
        </button>
      </header>

      {/* Input Modal / Form Area */}
      {showAddForm && (
        <div className="mb-8 bg-slate-800/50 border border-cyan-500/30 rounded-xl p-4 animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold text-cyan-400">Teach the AI a new rule</h3>
            <button onClick={() => setShowAddForm(false)}><X className="w-4 h-4 text-slate-400 hover:text-white"/></button>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newPattern}
              onChange={(e) => setNewPattern(e.target.value)}
              placeholder="E.g., 'Always use styled-components for new UI elements'..."
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-cyan-500"
              onKeyDown={async (e) => e.key === 'Enter' && handleSave()}
            />
            <button onClick={handleSave} className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg">
              <Save className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {patterns.map((p, idx) => {
            const confidence = p.success_rate ?? p.confidence ?? 0;
            const content = p.pattern_data ?? (p as unknown as Record<string, unknown>).pattern as string | undefined ?? 'Unknown Pattern';

            return (
              <div key={p.id || idx} className="group relative bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-cyan-500/50 transition-all duration-300">
                <div className="flex justify-between items-start mb-3">
                  <span className={`text-xs px-2 py-1 rounded border ${confidence >= 1 ? 'bg-green-900/30 text-green-400 border-green-500/20' : 'bg-cyan-900/30 text-cyan-400 border-cyan-500/20'}`}>
                    {confidence >= 1 ? 'Hard Rule' : `Confidence: ${(confidence * 100).toFixed(0)}%`}
                  </span>
                  <span className="text-slate-500 text-xs">
                    {p.updated_at ? new Date(p.updated_at).toLocaleTimeString() : 'Unknown'}
                  </span>
                </div>
                <h3 className="font-medium text-slate-200 mb-2 leading-snug line-clamp-3">{content}</h3>
                <div className="flex items-center gap-4 mt-4 text-sm text-slate-400">
                  <div className="flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    <span>Freq: {p.usage_count ?? p.frequency ?? 0}</span>
                  </div>
                </div>
                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            );
        })}
      </div>

      {patterns.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
          <ShieldAlert className="w-12 h-12 mb-4 opacity-50" />
          <p>No learning patterns detected yet.</p>
        </div>
      )}
    </div>
  );
};
