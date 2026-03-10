import React from 'react';
import { useIDEStore } from '@/lib/store';
import { FileCode2, X, FileJson, FileType, FileImage } from 'lucide-react';

const FileIcon = ({ name }: { name: string }) => {
  if (name.endsWith('.tsx') || name.endsWith('.ts')) return <FileCode2 className="w-3.5 h-3.5 text-blue-400" />;
  if (name.endsWith('.css')) return <FileType className="w-3.5 h-3.5 text-cyan-400" />;
  if (name.endsWith('.json')) return <FileJson className="w-3.5 h-3.5 text-yellow-400" />;
  if (name.endsWith('.ico') || name.endsWith('.png')) return <FileImage className="w-3.5 h-3.5 text-purple-400" />;
  return <FileCode2 className="w-3.5 h-3.5 text-gray-400" />;
};

export const TabBar: React.FC = () => {
  const { openFiles, activeFile, setActiveFile, closeFile } = useIDEStore();

  if (openFiles.length === 0) return null;

  return (
    <div className="flex items-center h-9 bg-zinc-950 border-b border-white/5 overflow-x-auto scrollbar-hide">
      {openFiles.map((file) => {
        const isActive = activeFile?.name === file.name;
        return (
          <div
            key={file.name}
            className={`
              group flex items-center gap-2 px-3 h-full border-r border-white/5 cursor-pointer select-none min-w-[120px] max-w-[200px]
              transition-colors text-xs
              ${isActive ? 'bg-zinc-900 text-white border-t-2 border-t-electric-violet' : 'text-zinc-500 hover:bg-zinc-900/50 hover:text-zinc-300 border-t-2 border-t-transparent'}
            `}
            onClick={() => setActiveFile(file)}
          >
            <FileIcon name={file.name} />
            <span className="truncate flex-1">{file.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                closeFile(file.name);
              }}
              className={`p-0.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-white/10 ${isActive ? 'opacity-100' : ''}`}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
