/**
 * Recursive file-tree rows for the explorer sidebar.
 */

import { ChevronDown, ChevronRight, File, Folder } from 'lucide-react';
import React from 'react';

import type { FileSystemItem } from '../types';

import { FileIcon, FileItem, FileName } from './Sidebar.styles';

export type SidebarFileTreeProps = {
  items: FileSystemItem[];
  level?: number;
  searchTerm: string;
  selectedFile: string | null;
  expandedFolders: Set<string>;
  folderChildren: Map<string, FileSystemItem[]>;
  onFileClick: (item: FileSystemItem) => void;
  onFileContextMenu: (e: React.MouseEvent, item: FileSystemItem) => void;
};

export function SidebarFileTree({
  items,
  level = 0,
  searchTerm,
  selectedFile,
  expandedFolders,
  folderChildren,
  onFileClick,
  onFileContextMenu,
}: SidebarFileTreeProps) {
  return (
    <>
      {items
        .filter(
          item => searchTerm === '' || item.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .map(item => (
          <div key={item.path}>
            <FileItem
              level={level}
              selected={selectedFile === item.path}
              aria-selected={selectedFile === item.path}
              onClick={() => onFileClick(item)}
              onContextMenu={(e: React.MouseEvent) => onFileContextMenu(e, item)}
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onFileClick(item);
                }
              }}
              role="button"
              tabIndex={0}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <FileIcon type={item.type} $expanded={expandedFolders.has(item.path)}>
                {item.type === 'directory' ? (
                  <>
                    {expandedFolders.has(item.path) ? (
                      <ChevronDown size={12} />
                    ) : (
                      <ChevronRight size={12} />
                    )}
                    <Folder size={16} />
                  </>
                ) : (
                  <File size={16} />
                )}
              </FileIcon>
              <FileName>{item.name}</FileName>
            </FileItem>

            {item.type === 'directory' && expandedFolders.has(item.path) && (
              <div>
                <SidebarFileTree
                  items={folderChildren.get(item.path) ?? []}
                  level={level + 1}
                  searchTerm={searchTerm}
                  selectedFile={selectedFile}
                  expandedFolders={expandedFolders}
                  folderChildren={folderChildren}
                  onFileClick={onFileClick}
                  onFileContextMenu={onFileContextMenu}
                />
              </div>
            )}
          </div>
        ))}
    </>
  );
}
