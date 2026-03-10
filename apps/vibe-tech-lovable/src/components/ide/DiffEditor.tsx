import React from 'react';
import { DiffEditor as MonacoDiffEditor } from '@monaco-editor/react';
import { useIDEStore } from '@/lib/store';
import { Check, X } from 'lucide-react';

export const DiffEditor: React.FC = () => {
  const { pendingDiff, applyDiff, discardDiff } = useIDEStore();

  if (!pendingDiff) {
    return (
        <div className="h-full flex items-center justify-center text-zinc-500">
            No changes to review.
        </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-zinc-950">
        <div className="h-10 border-b border-white/5 bg-zinc-900 flex items-center justify-between px-4">
            <span className="text-sm font-medium text-white">Reviewing Changes: {pendingDiff.fileName}</span>
            <div className="flex items-center gap-2">
                <button 
                    onClick={discardDiff}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-semibold transition-colors"
                >
                    <X className="w-3.5 h-3.5" />
                    Discard
                </button>
                <button 
                    onClick={applyDiff}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-green-500/10 text-green-400 hover:bg-green-500/20 text-xs font-semibold transition-colors"
                >
                    <Check className="w-3.5 h-3.5" />
                    Apply Changes
                </button>
            </div>
        </div>
        <div className="flex-1 relative">
            <MonacoDiffEditor
                height="100%"
                theme="vibe-dark"
                original={pendingDiff.originalContent}
                modified={pendingDiff.modifiedContent}
                language="typescript" // Simplified: Should detect language
                options={{
                    renderSideBySide: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    readOnly: true,
                    originalEditable: false,
                    fontSize: 14,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                }}
            />
        </div>
    </div>
  );
};
