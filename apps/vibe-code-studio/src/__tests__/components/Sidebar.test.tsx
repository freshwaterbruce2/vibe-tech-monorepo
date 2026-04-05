import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import Sidebar from '../../components/Sidebar';
import type { FileSystemItem } from '../../types';

vi.mock('../../services/Logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

function createFileSystemMock(entries: Record<string, FileSystemItem[]>) {
  return {
    listDirectory: vi.fn(async (path: string) => entries[path] ?? []),
    joinPath: (...paths: string[]) => paths.join('/').replace(/\/\/+/g, '/'),
    dirname: (path: string) => {
      const index = path.lastIndexOf('/');
      return index > 0 ? path.slice(0, index) : '/';
    },
    exists: vi.fn(async (path: string) => {
      return Object.values(entries)
        .flat()
        .some((entry) => entry.path === path);
    }),
    createFile: vi.fn(),
    createDirectory: vi.fn(),
    rename: vi.fn(),
  };
}

const baseRootEntries: FileSystemItem[] = [
  { name: 'src', path: '/workspace/src', type: 'directory' },
  { name: 'notes.txt', path: '/workspace/notes.txt', type: 'file' },
];

function renderSidebar({
  entries,
  refreshKey = 0,
  onCreateFile = vi.fn(),
  onCreateFolder = vi.fn(),
  onRenamePath = vi.fn(),
  onDeleteFile = vi.fn(),
}: {
  entries?: Record<string, FileSystemItem[]>;
  refreshKey?: number;
  onCreateFile?: ReturnType<typeof vi.fn>;
  onCreateFolder?: ReturnType<typeof vi.fn>;
  onRenamePath?: ReturnType<typeof vi.fn>;
  onDeleteFile?: ReturnType<typeof vi.fn>;
} = {}) {
  const directoryEntries = entries ?? {
    '/workspace': [...baseRootEntries],
    '/workspace/src': [{ name: 'index.ts', path: '/workspace/src/index.ts', type: 'file' }],
  };
  const fileSystemService = createFileSystemMock(directoryEntries);

  const utils = render(
    <Sidebar
      workspaceFolder="/workspace"
      onOpenFile={vi.fn()}
      onToggleAIChat={vi.fn()}
      aiChatOpen={false}
      fileSystemService={fileSystemService as any}
      onDeleteFile={onDeleteFile}
      onCreateFile={onCreateFile}
      onCreateFolder={onCreateFolder}
      onRenamePath={onRenamePath}
      onOpenFolder={vi.fn()}
      onShowSettings={vi.fn()}
      refreshKey={refreshKey}
    />
  );

  return { ...utils, fileSystemService, directoryEntries, onCreateFile, onCreateFolder, onRenamePath, onDeleteFile };
}

describe('Sidebar', () => {
  it('creates a file in the current workspace from the header action', async () => {
    const onCreateFile = vi.fn().mockResolvedValue(undefined);
    renderSidebar({ onCreateFile });

    await screen.findByText('notes.txt');
    fireEvent.click(screen.getByLabelText('New File'));
    fireEvent.change(screen.getByPlaceholderText('Enter a file name'), {
      target: { value: 'draft.ts' },
    });
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(onCreateFile).toHaveBeenCalledWith('/workspace/draft.ts');
    });
  });

  it('creates a folder in the current workspace from the header action', async () => {
    const onCreateFolder = vi.fn().mockResolvedValue(undefined);
    renderSidebar({ onCreateFolder });

    await screen.findByText('notes.txt');
    fireEvent.click(screen.getByLabelText('New Folder'));
    fireEvent.change(screen.getByPlaceholderText('Enter a folder name'), {
      target: { value: 'docs' },
    });
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(onCreateFolder).toHaveBeenCalledWith('/workspace/docs');
    });
  });

  it('renames files and folders from the live context menu', async () => {
    const onRenamePath = vi.fn().mockResolvedValue(undefined);
    renderSidebar({ onRenamePath });

    const file = await screen.findByText('notes.txt');
    fireEvent.contextMenu(file);
    fireEvent.click(await screen.findByText('Rename'));
    fireEvent.change(screen.getByDisplayValue('notes.txt'), { target: { value: 'draft.txt' } });
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(onRenamePath).toHaveBeenCalledWith('/workspace/notes.txt', '/workspace/draft.txt');
    });

    const folder = screen.getByText('src');
    fireEvent.contextMenu(folder);
    fireEvent.click(await screen.findByText('Rename'));
    fireEvent.change(screen.getByDisplayValue('src'), { target: { value: 'source' } });
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(onRenamePath).toHaveBeenCalledWith('/workspace/src', '/workspace/source');
    });
  });

  it('keeps expanded folder children visible after renaming a folder', async () => {
    const directoryEntries: Record<string, FileSystemItem[]> = {
      '/workspace': [...baseRootEntries],
      '/workspace/src': [{ name: 'index.ts', path: '/workspace/src/index.ts', type: 'file' }],
    };
    const onRenamePath = vi.fn().mockImplementation(async (oldPath: string, newPath: string) => {
      directoryEntries['/workspace'] = directoryEntries['/workspace'].map((entry) =>
        entry.path === oldPath
          ? { ...entry, name: 'source', path: newPath }
          : entry
      );
      directoryEntries[newPath] = (directoryEntries[oldPath] ?? []).map((entry) => ({
        ...entry,
        path: entry.path.replace(oldPath, newPath),
      }));
      delete directoryEntries[oldPath];
    });

    renderSidebar({ entries: directoryEntries, onRenamePath });

    const folder = await screen.findByText('src');
    fireEvent.click(folder);
    expect(await screen.findByText('index.ts')).toBeInTheDocument();

    fireEvent.contextMenu(folder);
    fireEvent.click(await screen.findByText('Rename'));
    fireEvent.change(screen.getByDisplayValue('src'), { target: { value: 'source' } });
    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(onRenamePath).toHaveBeenCalledWith('/workspace/src', '/workspace/source');
    });
    expect(await screen.findByText('source')).toBeInTheDocument();
    expect(await screen.findByText('index.ts')).toBeInTheDocument();
  });

  it('clears the selected file after deleting it', async () => {
    const directoryEntries = {
      '/workspace': [...baseRootEntries],
      '/workspace/src': [{ name: 'index.ts', path: '/workspace/src/index.ts', type: 'file' }],
    };
    const onDeleteFile = vi.fn().mockImplementation(async (targetPath: string) => {
      directoryEntries['/workspace'] = directoryEntries['/workspace'].filter(
        (entry) => entry.path !== targetPath
      );
    });

    renderSidebar({ entries: directoryEntries, onDeleteFile });

    const file = await screen.findByText('notes.txt');
    fireEvent.click(file);
    expect(file.closest('[aria-selected="true"]')).toBeInTheDocument();

    fireEvent.contextMenu(file);
    fireEvent.click(await screen.findByText('Delete File'));
    fireEvent.click(screen.getByText('Delete'));

    await waitFor(() => {
      expect(onDeleteFile).toHaveBeenCalledWith('/workspace/notes.txt');
    });
    await waitFor(() => {
      expect(screen.queryByText('notes.txt')).not.toBeInTheDocument();
    });
  });

  it('reloads the tree when refresh is clicked', async () => {
    const { fileSystemService } = renderSidebar();

    await screen.findByText('notes.txt');
    expect(fileSystemService.listDirectory).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText('Refresh Explorer'));

    await waitFor(() => {
      expect(fileSystemService.listDirectory).toHaveBeenCalledTimes(2);
    });
  });

  it('preserves expanded folders across a refresh', async () => {
    const { rerender, fileSystemService } = renderSidebar();

    const folder = await screen.findByText('src');
    fireEvent.click(folder);
    expect(await screen.findByText('index.ts')).toBeInTheDocument();

    rerender(
      <Sidebar
        workspaceFolder="/workspace"
        onOpenFile={vi.fn()}
        onToggleAIChat={vi.fn()}
        aiChatOpen={false}
        fileSystemService={fileSystemService as any}
        onDeleteFile={vi.fn()}
        onCreateFile={vi.fn()}
        onCreateFolder={vi.fn()}
        onRenamePath={vi.fn()}
        onOpenFolder={vi.fn()}
        onShowSettings={vi.fn()}
        refreshKey={1}
      />
    );

    expect(await screen.findByText('index.ts')).toBeInTheDocument();
    await waitFor(() => {
      expect(fileSystemService.listDirectory).toHaveBeenCalledWith('/workspace/src');
    });
  });
});
