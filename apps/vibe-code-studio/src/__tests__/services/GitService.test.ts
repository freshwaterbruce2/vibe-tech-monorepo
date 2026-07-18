import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GitService } from '../../services/GitService';

describe('GitService.getFileAtHead', () => {
  beforeEach(() => {
    vi.mocked(window.electron.shell.execute).mockReset();
  });

  it('runs read-only HEAD queries from the explicitly supplied workspace root', async () => {
    vi.mocked(window.electron.shell.execute)
      .mockResolvedValueOnce({ success: true, stdout: 'apps/example/\n', stderr: '' })
      .mockResolvedValueOnce({
        success: true,
        stdout: 'export const original = true;\n',
        stderr: '',
      });

    const content = await new GitService('/').getFileAtHead(
      'src/index.ts',
      'V:/monorepo/apps/example'
    );

    expect(content).toBe('export const original = true;\n');
    expect(window.electron.shell.execute).toHaveBeenNthCalledWith(
      1,
      'git rev-parse --show-prefix',
      'V:/monorepo/apps/example'
    );
    expect(window.electron.shell.execute).toHaveBeenNthCalledWith(
      2,
      'git show HEAD:apps/example/src/index.ts',
      'V:/monorepo/apps/example'
    );
  });

  it('rejects unsafe paths before invoking Git', async () => {
    expect(await new GitService('/').getFileAtHead('../outside.ts', 'V:/monorepo')).toBeNull();
    expect(window.electron.shell.execute).not.toHaveBeenCalled();
  });
});
