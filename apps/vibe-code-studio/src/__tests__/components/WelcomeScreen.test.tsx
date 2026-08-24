import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WelcomeScreen } from '../../components/WelcomeScreen';

vi.mock('../../services/Logger', () => ({
  logger: { error: vi.fn() },
}));

describe('WelcomeScreen', () => {
  beforeEach(() => {
    window.electron = undefined;
  });

  it('uses the native shim folder picker without Electron-only options', async () => {
    const openFolder = vi.fn().mockResolvedValue({
      success: true,
      canceled: false,
      filePaths: ['D:\\data\\workspace'],
    });
    window.electron = {
      dialog: { openFolder },
    } as Window['electron'];
    const onOpenFolder = vi.fn();

    render(
      <WelcomeScreen
        onOpenFolder={onOpenFolder}
        onCreateFile={vi.fn()}
        onOpenAIChat={vi.fn()}
        onShowSettings={vi.fn()}
        isIndexing={false}
        indexingProgress={0}
      />
    );

    fireEvent.click(screen.getByText('Open Project'));

    await waitFor(() => expect(openFolder).toHaveBeenCalledWith({}));
    expect(onOpenFolder).toHaveBeenCalledWith('D:/data/workspace');
  });

  it('uses the native picker under the Tauri shim, not manual path entry', async () => {
    const openFolder = vi.fn().mockResolvedValue({
      success: true,
      canceled: false,
      filePaths: ['C:\\Users\\bruce\\Desktop\\my-app'],
    });
    window.electron = {
      isTauri: true,
      dialog: { openFolder },
    } as Window['electron'];
    const onOpenFolder = vi.fn();

    render(
      <WelcomeScreen
        onOpenFolder={onOpenFolder}
        onCreateFile={vi.fn()}
        onOpenAIChat={vi.fn()}
        onShowSettings={vi.fn()}
        isIndexing={false}
        indexingProgress={0}
      />
    );

    fireEvent.click(screen.getByText('Open Project'));

    await waitFor(() => expect(openFolder).toHaveBeenCalledWith({}));
    expect(onOpenFolder).toHaveBeenCalledWith('C:/Users/bruce/Desktop/my-app');
    expect(screen.queryByText('Enter Folder Path')).not.toBeInTheDocument();
  });

  it('falls back to manual path entry only when the native picker fails', async () => {
    const openFolder = vi.fn().mockRejectedValue(new Error('dialog crashed'));
    window.electron = {
      isTauri: true,
      dialog: { openFolder },
    } as Window['electron'];

    render(
      <WelcomeScreen
        onOpenFolder={vi.fn()}
        onCreateFile={vi.fn()}
        onOpenAIChat={vi.fn()}
        onShowSettings={vi.fn()}
        isIndexing={false}
        indexingProgress={0}
      />
    );

    fireEvent.click(screen.getByText('Open Project'));

    await waitFor(() => expect(screen.getByText('Enter Folder Path')).toBeInTheDocument());
  });
});
