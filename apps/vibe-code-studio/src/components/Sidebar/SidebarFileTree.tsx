import {
  ChevronDown,
  ChevronRight,
  File,
  Folder,
} from 'lucide-react';
import type { MouseEvent, KeyboardEvent } from 'react';

import type { FileSystemItem } from '../../types';
import { FileIcon, FileItem, FileName } from './Sidebar.styles';

export interface SidebarFileTreeProps {
  items: FileSystemItem[];
  level?: number;
  searchTerm: string;
  selectedFile: string | null;
  expandedFolders: Set<string>;
  folderChildren: Map<string, FileSystemItem[]>;
  onFileClick: (item: FileSystemItem) => void;
  onContextMenu: (e: MouseEvent<HTMLDivElement>, item: FileSystemItem) => void;
}

function FileTreeNode({
  item,
  level,
  searchTerm,
  selectedFile,
  expandedFolders,
  folderChildren,
  onFileClick,
  onContextMenu,
}: {
  item: FileSystemItem;
  level: number;
  searchTerm: string;
  selectedFile: string | null;
  expandedFolders: Set<string>;
  folderChildren: Map<string, FileSystemItem[]>;
  onFileClick: (item: FileSystemItem) => void;
  onContextMenu: (e: MouseEvent<HTMLDivElement>, item: FileSystemItem) => void;
}) {
  const isExpanded = expandedFolders.has(item.path);
  const isSelected = selectedFile === item.path;

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onFileClick(item);
    }
  };

  return (
    <div key={item.path}>
      <FileItem
        level={level}
        selected={isSelected}
        aria-selected={isSelected}
        onClick={() => onFileClick(item)}
        onContextMenu={(e) => onContextMenu(e, item)}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <FileIcon type={item.type} $expanded={isExpanded}>
          {item.type === 'directory' ? (
            <>
              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <Folder size={16} />
            </>
          ) : (
            <File size={16} />
          )}
        </FileIcon>
        <FileName>{item.name}</FileName>
      </FileItem>

      {item.type === 'directory' && isExpanded && (
        <div>
          <SidebarFileTree
            items={folderChildren.get(item.path) ?? []}
            level={level + 1}
            searchTerm={searchTerm}
            selectedFile={selectedFile}
            expandedFolders={expandedFolders}
            folderChildren={folderChildren}
            onFileClick={onFileClick}
            onContextMenu={onContextMenu}
          />
        </div>
      )}
    </div>
  );
}

export const SidebarFileTree = ({
  items,
  level = 0,
  searchTerm,
  selectedFile,
  expandedFolders,
  folderChildren,
  onFileClick,
  onContextMenu,
}: SidebarFileTreeProps) => {
  const filtered = searchTerm === ''
    ? items
    : items.filter((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <>
      {filtered.map((item) => (
        <FileTreeNode
          key={item.path}
          item={item}
          level={level}
          searchTerm={searchTerm}
          selectedFile={selectedFile}
          expandedFolders={expandedFolders}
          folderChildren={folderChildren}
          onFileClick={onFileClick}
          onContextMenu={onContextMenu}
        />
      ))}
    </>
  );
};
