import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { models } from '@/config/models';
import type { HistoryItem } from '@/types';
import { Archive, Brain, Clock, History, Search, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';

interface HistoryPanelProps {
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
}

export function HistoryPanel({ history, onSelect }: HistoryPanelProps) {
  const [search, setSearch] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filteredHistory = useMemo(() => {
    if (!search.trim()) return history;
    const lower = search.toLowerCase();
    return history.filter(
      (item) =>
        item.inputPrompt.toLowerCase().includes(lower) ||
        item.outputPrompt.toLowerCase().includes(lower),
    );
  }, [history, search]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className="h-fit max-h-[calc(100vh-200px)] overflow-hidden flex flex-col glass-card">
      <CardHeader className="pb-3 bg-gradient-to-r from-purple-500/10 via-pink-500/5 to-transparent border-b border-purple-100/50">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-md">
            <History className="h-4 w-4" />
          </span>
          <span className="font-semibold">History</span>
          {history.length > 0 && (
            <span className="ml-auto text-xs font-medium px-2 py-1 rounded-full bg-purple-100 text-purple-600">
              {history.length}
            </span>
          )}
        </CardTitle>
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-purple-400" />
          <Input
            placeholder="Search prompts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white/80 border-purple-200/50 focus:border-purple-400 focus:ring-purple-300 rounded-xl transition-all"
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto space-y-2 p-3 pt-3">
        {filteredHistory.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-100 via-pink-100 to-rose-100 flex items-center justify-center mb-4 shadow-inner">
              {search ? (
                <Search className="h-7 w-7 text-purple-300" />
              ) : (
                <Archive className="h-7 w-7 text-purple-300" />
              )}
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {search ? 'No matching prompts' : 'No history yet'}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1.5">
              {search ? 'Try a different search term' : 'Your optimized prompts will appear here'}
            </p>
          </div>
        ) : (
          filteredHistory.map((item, index) => (
            <button
              key={item.id}
              onClick={() => onSelect(item)}
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`w-full text-left p-3.5 rounded-xl border transition-all duration-300 group relative overflow-hidden ${
                hoveredId === item.id
                  ? 'bg-gradient-to-r from-purple-50 via-pink-50 to-rose-50 border-purple-300 shadow-md -translate-y-0.5'
                  : 'bg-white/60 border-purple-100/50 hover:border-purple-200'
              }`}
              style={{
                animationDelay: `${index * 50}ms`,
              }}
            >
              {hoveredId === item.id && (
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 pointer-events-none" />
              )}
              <div className="relative">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gradient-to-r from-violet-100 to-purple-100 text-violet-700 shadow-sm">
                    {models[item.model]?.name || item.model}
                  </span>
                  <span className="text-xs font-medium capitalize px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-600 flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    {item.mode}
                  </span>
                  {item.extendedThinking && (
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
                      <Brain className="h-3 w-3" />
                      thinking
                    </span>
                  )}
                </div>
                <p className="text-sm line-clamp-2 text-foreground/80 group-hover:text-foreground transition-colors leading-relaxed">
                  {item.inputPrompt}
                </p>
                <div className="flex items-center gap-1.5 mt-2.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{formatTime(item.timestamp)}</span>
                </div>
              </div>
            </button>
          ))
        )}
      </CardContent>
    </Card>
  );
}
