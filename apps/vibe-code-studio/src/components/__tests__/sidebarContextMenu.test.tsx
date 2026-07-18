import { describe, expect, it, vi } from 'vitest';

import type { FileSystemItem } from '../../types';
import { buildSidebarContextMenuItems } from '../sidebarContextMenu';

const fileItem: FileSystemItem = {
  name: 'a.ts',
  path: '/ws/a.ts',
  type: 'file',
};

describe('buildSidebarContextMenuItems', () => {
  it('builds menu items and wires actions', () => {
    const actions = {
      fileSystemServiceAvailable: true,
      onCopyPath: vi.fn(),
      onNewFile: vi.fn(),
      onNewFolder: vi.fn(),
      onRename: vi.fn(),
      onRefresh: vi.fn(),
      onDelete: vi.fn(),
    };

    const items = buildSidebarContextMenuItems(fileItem, actions);
    expect(items.map(i => i.id)).toEqual([
      'copy-path',
      'divider-1',
      'new-file',
      'new-folder',
      'rename',
      'refresh',
      'divider-2',
      'delete',
    ]);

    items.find(i => i.id === 'copy-path')?.onClick?.();
    items.find(i => i.id === 'new-file')?.onClick?.();
    items.find(i => i.id === 'new-folder')?.onClick?.();
    items.find(i => i.id === 'rename')?.onClick?.();
    items.find(i => i.id === 'refresh')?.onClick?.();
    items.find(i => i.id === 'delete')?.onClick?.();

    expect(actions.onCopyPath).toHaveBeenCalledWith('/ws/a.ts');
    expect(actions.onNewFile).toHaveBeenCalledWith(fileItem);
    expect(actions.onNewFolder).toHaveBeenCalledWith(fileItem);
    expect(actions.onRename).toHaveBeenCalledWith(fileItem);
    expect(actions.onRefresh).toHaveBeenCalled();
    expect(actions.onDelete).toHaveBeenCalledWith(fileItem);
  });

  it('disables mutation actions when the FS service is unavailable', () => {
    const items = buildSidebarContextMenuItems(fileItem, {
      fileSystemServiceAvailable: false,
      onCopyPath: vi.fn(),
      onNewFile: vi.fn(),
      onNewFolder: vi.fn(),
      onRename: vi.fn(),
      onRefresh: vi.fn(),
      onDelete: vi.fn(),
    });

    expect(items.find(i => i.id === 'new-file')?.disabled).toBe(true);
    expect(items.find(i => i.id === 'rename')?.disabled).toBe(true);
  });
});
