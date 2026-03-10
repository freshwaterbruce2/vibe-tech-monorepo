import React, { useState } from 'react';
import { FileCode2, Search, GitGraph, Settings, ChevronRight, ChevronDown, Folder, FileJson, FileType, FileImage } from 'lucide-react';
import { useIDEStore, FileNode } from '@/lib/store';
import { SettingsModal } from './SettingsModal'; // Import SettingsModal

const FileIcon = ({ name }: { name: string }) => {
  if (name.endsWith('.tsx') || name.endsWith('.ts')) return <FileCode2 className="w-4 h-4 text-blue-400" />;
  if (name.endsWith('.css')) return <FileType className="w-4 h-4 text-cyan-400" />;
  if (name.endsWith('.json')) return <FileJson className="w-4 h-4 text-yellow-400" />;
  if (name.endsWith('.ico') || name.endsWith('.png')) return <FileImage className="w-4 h-4 text-purple-400" />;
  return <FileCode2 className="w-4 h-4 text-gray-400" />;
};

const FileTreeNode = ({ node, depth = 0 }: { node: FileNode, depth?: number }) => {
  const [isOpen, setIsOpen] = useState(true);
  const { openFile, activeFile } = useIDEStore();

  const isActive = activeFile?.name === node.name;

  const handleClick = () => {
    if (node.type === 'folder') {
      setIsOpen(!isOpen);
    } else {
      openFile(node); // Use openFile instead of setActiveFile
    }
  };

  return (
    <div>
      <div 
        className={`flex items-center gap-1.5 py-1 px-2 cursor-pointer transition-colors select-none text-xs ${isActive ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'}`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
      >
        {node.type === 'folder' && (
           isOpen ? <ChevronDown className="w-3 h-3 text-zinc-500" /> : <ChevronRight className="w-3 h-3 text-zinc-500" />
        )}
        {node.type === 'folder' ? <Folder className="w-4 h-4 text-zinc-500" /> : <FileIcon name={node.name} />}
        <span>{node.name}</span>
      </div>
      {node.type === 'folder' && isOpen && node.children && (
        <div>
          {node.children.map((child: FileNode, i: number) => (
            <FileTreeNode key={i} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export const Sidebar: React.FC = () => {
  const [activeTab, setActiveTab] = useState('files');
  const [showSettings, setShowSettings] = useState(false);
  const { files } = useIDEStore();

  return (
    <>
      <aside className="w-[280px] h-full bg-zinc-900 border-r border-white/10 flex flex-col pt-14 fixed left-0 top-0 bottom-0 z-40">
        <div className="flex h-full">
          {/* Activity Bar */}
          <div className="w-12 h-full border-r border-white/5 flex flex-col items-center py-4 gap-4 bg-zinc-950/50">
            <button 
              onClick={() => setActiveTab('files')}
              className={`p-2 rounded-lg transition-all ${activeTab === 'files' ? 'bg-white/10 text-electric-violet' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <FileCode2 className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setActiveTab('search')}
              className={`p-2 rounded-lg transition-all ${activeTab === 'search' ? 'bg-white/10 text-electric-violet' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Search className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setActiveTab('git')}
              className={`p-2 rounded-lg transition-all ${activeTab === 'git' ? 'bg-white/10 text-electric-violet' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <GitGraph className="w-5 h-5" />
            </button>
            <div className="flex-1" />
            <button 
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg transition-all text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

          {/* Side Panel Content */}
          <div className="flex-1 flex flex-col bg-zinc-900">
            <div className="h-10 flex items-center px-4 border-b border-white/5">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Explorer</span>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {files.map((node, i) => (
                <FileTreeNode key={i} node={node} />
              ))}
            </div>
          </div>
        </div>
      </aside>

      <SettingsModal open={showSettings} onOpenChange={setShowSettings} />
    </>
  );
};
