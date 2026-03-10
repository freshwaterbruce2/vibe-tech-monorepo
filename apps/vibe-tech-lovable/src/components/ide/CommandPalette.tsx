import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { Search, FileCode2, Settings, Cloud, PanelRight, TerminalSquare } from 'lucide-react';
import { useIDEStore, FileNode } from '@/lib/store';
import { useTheme } from './ThemeProvider';
import { toast } from 'sonner';

export const CommandPalette: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { files, setActiveFile, toggleTerminal, setViewMode } = useIDEStore();
  const { setProjectName } = useTheme();

  // Toggle with Ctrl+K or Ctrl+P
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
      if (e.key === 'p' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Flatten file tree for search
  const getAllFiles = (nodes: FileNode[]): FileNode[] => {
    let all: FileNode[] = [];
    nodes.forEach(node => {
      if (node.type === 'file') {
        all.push(node);
      } else if (node.children) {
        all = [...all, ...getAllFiles(node.children)];
      }
    });
    return all;
  };

  const flatFiles = getAllFiles(files);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Global Command Menu"
      className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] max-w-[90vw] bg-zinc-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[60]"
      onClick={(_e) => {
         // Close if clicking the backdrop (simulated by the fixed container if needed, 
         // but cmdk handles backdrop usually via overlay class)
      }}
    >
      <div className="flex items-center border-b border-white/5 px-4" cmdk-input-wrapper="">
        <Search className="w-5 h-5 text-zinc-500 mr-2" />
        <Command.Input 
          className="w-full bg-transparent p-4 text-sm outline-none placeholder:text-zinc-500 text-white font-mono"
          placeholder="Type a command or search files..."
        />
        <div className="flex items-center gap-1">
             <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-white/10 bg-zinc-800 px-1.5 font-mono text-[10px] font-medium text-zinc-400">
                <span className="text-xs">CTRL</span>K
              </kbd>
        </div>
      </div>
      
      <Command.List className="max-h-[300px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        <Command.Empty className="py-6 text-center text-sm text-zinc-500">
          No results found.
        </Command.Empty>

        <Command.Group heading="Files" className="text-xs font-semibold text-zinc-500 mb-2 px-2">
          {flatFiles.map((file) => (
            <Command.Item
              key={file.name}
              value={file.name}
              onSelect={() => {
                setActiveFile(file);
                setOpen(false);
              }}
              className="flex items-center gap-2 px-2 py-2 rounded-md text-sm text-zinc-300 hover:bg-electric-violet/20 hover:text-white cursor-pointer aria-selected:bg-electric-violet/20 aria-selected:text-white transition-colors"
            >
              <FileCode2 className="w-4 h-4 text-zinc-400" />
              <span>{file.name}</span>
            </Command.Item>
          ))}
        </Command.Group>

        <Command.Separator className="h-px bg-white/5 my-2" />

        <Command.Group heading="System" className="text-xs font-semibold text-zinc-500 mb-2 px-2">
          <Command.Item
            onSelect={() => {
                toggleTerminal();
                setOpen(false);
            }}
            className="flex items-center gap-2 px-2 py-2 rounded-md text-sm text-zinc-300 hover:bg-electric-violet/20 hover:text-white cursor-pointer aria-selected:bg-electric-violet/20 aria-selected:text-white transition-colors"
          >
            <TerminalSquare className="w-4 h-4" />
            <span>Toggle Terminal</span>
          </Command.Item>

          <Command.Item
            onSelect={() => {
                setViewMode('split');
                setOpen(false);
            }}
            className="flex items-center gap-2 px-2 py-2 rounded-md text-sm text-zinc-300 hover:bg-electric-violet/20 hover:text-white cursor-pointer aria-selected:bg-electric-violet/20 aria-selected:text-white transition-colors"
          >
            <PanelRight className="w-4 h-4" />
            <span>Split View</span>
          </Command.Item>

          <Command.Item
            onSelect={() => {
                toast.success("Deployment triggered...");
                setOpen(false);
            }}
            className="flex items-center gap-2 px-2 py-2 rounded-md text-sm text-zinc-300 hover:bg-electric-violet/20 hover:text-white cursor-pointer aria-selected:bg-electric-violet/20 aria-selected:text-white transition-colors"
          >
            <Cloud className="w-4 h-4" />
            <span>Deploy Application</span>
          </Command.Item>

          <Command.Item
            onSelect={() => {
                setProjectName("New Project");
                setOpen(false);
            }}
            className="flex items-center gap-2 px-2 py-2 rounded-md text-sm text-zinc-300 hover:bg-electric-violet/20 hover:text-white cursor-pointer aria-selected:bg-electric-violet/20 aria-selected:text-white transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>Project Settings</span>
          </Command.Item>
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
};
