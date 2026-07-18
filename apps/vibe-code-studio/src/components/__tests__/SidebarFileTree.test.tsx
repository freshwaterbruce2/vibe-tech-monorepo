import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { FileSystemItem } from '../../types';
import { SidebarFileTree } from '../SidebarFileTree';

const items: FileSystemItem[] = [
  { name: 'src', path: '/ws/src', type: 'directory' },
  { name: 'readme.md', path: '/ws/readme.md', type: 'file' },
];

describe('SidebarFileTree', () => {
  it('renders files and folders and handles click/keyboard', () => {
    const onFileClick = vi.fn();
    const onFileContextMenu = vi.fn();

    render(
      <SidebarFileTree
        items={items}
        searchTerm=""
        selectedFile={null}
        expandedFolders={new Set(['/ws/src'])}
        folderChildren={
          new Map([['/ws/src', [{ name: 'a.ts', path: '/ws/src/a.ts', type: 'file' }]]])
        }
        onFileClick={onFileClick}
        onFileContextMenu={onFileContextMenu}
      />
    );

    expect(screen.getByText('readme.md')).toBeInTheDocument();
    expect(screen.getByText('src')).toBeInTheDocument();
    expect(screen.getByText('a.ts')).toBeInTheDocument();

    fireEvent.click(screen.getByText('readme.md'));
    expect(onFileClick).toHaveBeenCalledWith(items[1]);

    const fileRow = screen.getByText('readme.md').closest('[role="button"]');
    expect(fileRow).toBeTruthy();
    fireEvent.keyDown(fileRow!, { key: 'Enter' });
    expect(onFileClick).toHaveBeenCalledTimes(2);

    fireEvent.contextMenu(fileRow!);
    expect(onFileContextMenu).toHaveBeenCalled();
  });

  it('filters by search term', () => {
    render(
      <SidebarFileTree
        items={items}
        searchTerm="readme"
        selectedFile={null}
        expandedFolders={new Set()}
        folderChildren={new Map()}
        onFileClick={vi.fn()}
        onFileContextMenu={vi.fn()}
      />
    );

    expect(screen.getByText('readme.md')).toBeInTheDocument();
    expect(screen.queryByText('src')).not.toBeInTheDocument();
  });
});
