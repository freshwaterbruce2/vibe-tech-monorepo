import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VibeExplorer } from './VibeExplorer';

const invokeMock = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

interface Entry {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  last_modified: number;
}

function readCallsFor(path: string): number {
  return invokeMock.mock.calls.filter(
    (call) => call[0] === 'read_directory' && (call[1] as { path?: string })?.path === path,
  ).length;
}

describe('VibeExplorer', () => {
  it('fetches a target directory only once when navigating', async () => {
    const byPath: Record<string, Entry[]> = {
      'c:\\dev': [
        {
          name: 'apps',
          path: 'c:\\dev\\apps',
          is_dir: true,
          size: 0,
          last_modified: 1_700_000_000,
        },
      ],
      'c:\\dev\\apps': [],
    };

    invokeMock.mockImplementation(async (command: string, args?: { path?: string }) => {
      if (command === 'read_directory') {
        return byPath[args?.path ?? ''] ?? [];
      }
      if (command === 'execute_monorepo_action') {
        return 1;
      }
      throw new Error(`Unexpected command: ${command}`);
    });

    render(<VibeExplorer />);

    await waitFor(() => {
      expect(readCallsFor('c:\\dev')).toBe(1);
    });

    fireEvent.click(screen.getByText('apps'));

    await waitFor(() => {
      expect(readCallsFor('c:\\dev\\apps')).toBe(1);
    });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(readCallsFor('c:\\dev\\apps')).toBe(1);
  });
});
