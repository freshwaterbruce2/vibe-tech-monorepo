import { Database, FileCode, Plus, RefreshCw } from 'lucide-react';
import React from 'react';
import { CollapsibleSection } from './CollapsibleSection';

interface ContextItem {
  id: string;
  type: 'file' | 'memory' | 'docs';
  name: string;
  isActive: boolean;
}

interface ContextPanelProps {
  items: ContextItem[];
  onToggleItem: (id: string) => void;
  onRefresh: () => void;
}

export const ContextPanel = ({
  items,
  onToggleItem,
  onRefresh
}: ContextPanelProps) => {
  return (
    <CollapsibleSection title="Active Context" icon={<Database size={16} />}>
      <div className="flex flex-col gap-1">
        {items.map(item => (
          <div
            key={item.id}
            className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
              item.isActive ? 'bg-blue-500/20 text-blue-200' : 'hover:bg-white/5 text-gray-400'
            }`}
            onClick={() => onToggleItem(item.id)}
          >
            <FileCode size={14} />
            <span className="truncate text-sm">{item.name}</span>
            <div className={`ml-auto w-2 h-2 rounded-full ${
              item.isActive ? 'bg-blue-400' : 'bg-gray-600'
            }`} />
          </div>
        ))}

        <div className="flex gap-2 mt-3 pt-2 border-t border-white/10">
          <button
            onClick={onRefresh}
            className="flex-1 py-1.5 px-3 bg-white/5 hover:bg-white/10 rounded text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <RefreshCw size={12} /> Sync
          </button>
          <button className="flex-1 py-1.5 px-3 bg-white/5 hover:bg-white/10 rounded text-xs flex items-center justify-center gap-2 transition-colors">
            <Plus size={12} /> Add
          </button>
        </div>
      </div>
    </CollapsibleSection>
  );
};
