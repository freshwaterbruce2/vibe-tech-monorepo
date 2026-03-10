import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface FileNode {
  name: string;
  type: 'file' | 'folder';
  children?: FileNode[];
  content?: string;
  language?: string;
  path?: string; // Derived path for uniqueness
}

interface LogMessage {
  type: 'info' | 'success' | 'warning' | 'error' | 'dim';
  text: string;
  timestamp: number;
}

interface PendingDiff {
  fileName: string;
  originalContent: string;
  modifiedContent: string;
}

interface IDEState {
  // File System
  files: FileNode[];
  activeFile: FileNode | null;
  openFiles: FileNode[]; // List of currently open files (Tabs) 
  
  setActiveFile: (file: FileNode | null) => void;
  openFile: (file: FileNode) => void; // Open a file (add to tabs + set active) 
  closeFile: (fileName: string) => void; // Close a tab
  updateFileContent: (fileName: string, content: string) => void;

  // AI Diff Flow
  pendingDiff: PendingDiff | null;
  setPendingDiff: (diff: PendingDiff | null) => void;
  applyDiff: () => void;
  discardDiff: () => void;

  // Terminal
  logs: LogMessage[];
  addLog: (type: LogMessage['type'], text: string) => void;
  clearLogs: () => void;
  isTerminalOpen: boolean;
  toggleTerminal: (isOpen?: boolean) => void;

  // Editor
  viewMode: 'code' | 'preview' | 'split' | 'diff';
  setViewMode: (mode: 'code' | 'preview' | 'split' | 'diff') => void;

  // Settings
  apiKey: string | null;
  setApiKey: (key: string | null) => void;
}

const INITIAL_FILES: FileNode[] = [
  {
    name: 'src',
    type: 'folder',
    children: [
      {
        name: 'App.tsx',
        type: 'file',
        language: 'typescript',
        content: `import React from 'react';\nimport { Button } from './components/ui/button';\n\nexport default function App() {\n  return (\n    <div className="p-4">\n      <h1 className="text-2xl font-bold mb-4">Hello World</h1>\n      <Button>Click me</Button>\n    </div>\n  );\n}`
      },
      {
        name: 'index.css',
        type: 'file',
        language: 'css',
        content: `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\nbody {\n  background: #000;\n  color: #fff;\n}`
      },
      {
        name: 'utils.ts',
        type: 'file',
        language: 'typescript',
        content: `export const cn = (...classes: string[]) => classes.filter(Boolean).join(' ');`
      }
    ]
  },
  {
    name: 'package.json',
    type: 'file',
    language: 'json',
    content: `{\n  "name": "my-app",\n  "version": "0.0.0"\n}`
  }
];

export const useIDEStore = create<IDEState>()(
  persist(
    (set, get) => ({
      files: INITIAL_FILES,
      activeFile: INITIAL_FILES[0].children![0],
      openFiles: [INITIAL_FILES[0].children![0]], // Start with App.tsx open

      setActiveFile: (file) => set({ activeFile: file }),
      
      openFile: (file) => {
        const { openFiles } = get();
        // Prevent duplicates
        if (!openFiles.find(f => f.name === file.name)) {
            set({ openFiles: [...openFiles, file], activeFile: file });
        } else {
            set({ activeFile: file });
        }
      },

      closeFile: (fileName) => {
        const { openFiles, activeFile } = get();
        const newOpenFiles = openFiles.filter(f => f.name !== fileName);
        
        // If we closed the active file, switch to the last opened one
        let newActive = activeFile;
        if (activeFile?.name === fileName) {
            newActive = newOpenFiles.length > 0 ? newOpenFiles[newOpenFiles.length - 1] : null;
        }

        set({ openFiles: newOpenFiles, activeFile: newActive });
      },

      updateFileContent: (fileName, content) =>
        set((state) => {
          const updateNode = (nodes: FileNode[]): FileNode[] => {
            return nodes.map((node) => {
              if (node.name === fileName) {
                return { ...node, content };
              }
              if (node.children) {
                return { ...node, children: updateNode(node.children) };
              }
              return node;
            });
          };
          return { files: updateNode(state.files) };
        }),

      // Diff Logic
      pendingDiff: null,
      setPendingDiff: (diff) => set({ pendingDiff: diff, viewMode: diff ? 'diff' : 'code' }),
      applyDiff: () => {
        const { pendingDiff, updateFileContent } = get();
        if (pendingDiff) {
            updateFileContent(pendingDiff.fileName, pendingDiff.modifiedContent);
            set({ pendingDiff: null, viewMode: 'code' });
        }
      },
      discardDiff: () => set({ pendingDiff: null, viewMode: 'code' }),

      logs: [
        { type: 'info', text: '> Initializing development environment...', timestamp: Date.now() },
        { type: 'success', text: '✔ Ready in 450ms', timestamp: Date.now() + 500 },
      ],
      addLog: (type, text) =>
        set((state) => ({
          logs: [...state.logs, { type, text, timestamp: Date.now() }],
        })),
      clearLogs: () => set({ logs: [] }),
      isTerminalOpen: true,
      toggleTerminal: (isOpen) =>
        set((state) => ({ isTerminalOpen: isOpen ?? !state.isTerminalOpen })),

      viewMode: 'preview',
      setViewMode: (mode) => set({ viewMode: mode }),

      // Settings
      apiKey: null,
      setApiKey: (key) => set({ apiKey: key }),
    }),
    {
      name: 'vibe-ide-storage', // unique name
      partialize: (state) => ({ apiKey: state.apiKey }), // Only persist critical settings
    }
  )
);
