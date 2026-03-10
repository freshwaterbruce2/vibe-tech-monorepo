import React, { useCallback, useRef, useState } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import { useIDEStore } from '@/lib/store';
import { Sparkles, MessageSquare, Wrench } from 'lucide-react';
import { toast } from 'sonner';

// Debounce helper
function useDebounce<T extends (...args: any[]) => any>(callback: T, delay: number) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
}

export const CodeEditor: React.FC = () => {
  const { activeFile, updateFileContent, addLog } = useIDEStore();
  const monaco = useMonaco();
  const [, setShowAiActions] = useState(false);

  React.useEffect(() => {
    if (monaco) {
      monaco.editor.defineTheme('vibe-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': '#09090b', // Zinc-950
          'editor.lineHighlightBackground': '#18181b',
        },
      });
      monaco.editor.setTheme('vibe-dark');
    }
  }, [monaco]);

  // Debounced update to store
  const debouncedUpdate = useDebounce((name: string, value: string) => {
    updateFileContent(name, value);
  }, 500);

  const handleAiAction = (action: 'explain' | 'refactor') => {
    addLog('info', `AI Action: ${action}ing ${activeFile?.name}...`);
    toast.info(`AI is analyzing ${activeFile?.name} for ${action}...`);
    // In a real app, this would trigger the AI Service
    setTimeout(() => {
        addLog('success', 'Analysis complete. (Simulation)');
        toast.success("AI Analysis Complete");
    }, 1000);
    setShowAiActions(false);
  };

  if (!activeFile) {
    return (
      <div className="flex h-full items-center justify-center text-zinc-500 bg-zinc-950">
        <div className="text-center">
           <p className="mb-2">No file selected</p>
           <p className="text-xs opacity-50">Select a file from the explorer</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-zinc-950 relative group">
      {/* AI Smart Actions Toolbar */}
      <div className="absolute top-2 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
         <div className="flex items-center gap-1 bg-zinc-900 border border-white/10 rounded-lg p-1 shadow-lg">
            <button 
                onClick={() => handleAiAction('explain')}
                className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-400 hover:text-white hover:bg-white/5 rounded-md transition-colors"
                title="Explain Code"
            >
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Explain</span>
            </button>
            <div className="w-px h-3 bg-white/10" />
            <button 
                onClick={() => handleAiAction('refactor')}
                className="flex items-center gap-1 px-2 py-1 text-xs text-zinc-400 hover:text-white hover:bg-white/5 rounded-md transition-colors"
                title="Refactor Code"
            >
                <Wrench className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Refactor</span>
            </button>
            <div className="w-px h-3 bg-white/10" />
            <div className="px-1 text-electric-violet">
                <Sparkles className="w-3.5 h-3.5" />
            </div>
         </div>
      </div>

      <Editor
        height="100%"
        defaultLanguage="typescript"
        language={activeFile.language || 'typescript'}
        value={activeFile.content}
        theme="vibe-dark"
        onChange={(value) => {
          if (value !== undefined) {
             debouncedUpdate(activeFile.name, value);
          }
        }}
        options={{
          minimap: { enabled: false }, // Can enable for "MiniMap" feature if desired
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          lineHeight: 1.5,
          padding: { top: 16 },
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
        }}
      />
    </div>
  );
};