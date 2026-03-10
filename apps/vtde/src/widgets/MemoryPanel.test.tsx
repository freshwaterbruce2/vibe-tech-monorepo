import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryPanel } from './MemoryPanel';

const invokeMock = vi.fn();

const memoryBridgeMock = vi.hoisted(() => ({
  isMemoryAvailable: vi.fn(),
  getDecayStats: vi.fn(),
  searchMemory: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

vi.mock('../lib/memory-bridge', () => memoryBridgeMock);

afterEach(() => {
  vi.clearAllMocks();
});

describe('MemoryPanel', () => {
  it('searches and renders results when memory service is online', async () => {
    memoryBridgeMock.isMemoryAvailable.mockResolvedValue(true);
    memoryBridgeMock.getDecayStats.mockResolvedValue({
      total_memories: 10,
      decayed_count: 3,
      active_count: 7,
      avg_score: 0.72,
      oldest_memory: null,
    });
    memoryBridgeMock.searchMemory.mockResolvedValue([
      {
        id: 'm1',
        content: 'Opened Vibe Code Studio',
        category: 'app_launch',
        score: 0.92,
        created_at: new Date().toISOString(),
      },
    ]);

    render(<MemoryPanel onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText(/Memory MCP Online/i)).toBeTruthy();
    });

    const input = screen.getByPlaceholderText(/Search memories/i);
    fireEvent.change(input, { target: { value: 'code studio' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(memoryBridgeMock.searchMemory).toHaveBeenCalledWith('code studio');
      expect(screen.getByText(/Opened Vibe Code Studio/i)).toBeTruthy();
    });
  });

  it('starts memory server from offline state', async () => {
    memoryBridgeMock.isMemoryAvailable.mockResolvedValue(false);
    memoryBridgeMock.getDecayStats.mockResolvedValue({
      total_memories: 0,
      decayed_count: 0,
      active_count: 0,
      avg_score: 0,
      oldest_memory: null,
    });

    invokeMock.mockResolvedValue(1234);

    render(<MemoryPanel onClose={() => {}} />);

    const startButton = await screen.findByRole('button', { name: /Start Server/i });
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith('start_memory_mcp');
    });
  });
});

