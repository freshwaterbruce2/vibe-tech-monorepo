import { describe, it, expect, vi } from 'vitest';
import { handleToolCall } from '../handlers.js';
import type { CallToolRequest } from '@modelcontextprotocol/sdk/types.js';
import type { MemoryManager } from '@vibetech/memory';

describe('MCP Input Validation and Sanitization', () => {
  // Mock MemoryManager
  const mockMemoryManager = {
    semantic: {
      search: vi.fn().mockResolvedValue([]),
      add: vi.fn().mockResolvedValue({ status: 'inserted', id: 1 }),
    },
    episodic: {
      search: vi.fn().mockReturnValue([]),
      getRecent: vi.fn().mockReturnValue([]),
    },
    latency: {
      record: vi.fn(),
    },
  } as unknown as MemoryManager;

  it('should reject memory_search_semantic with negative or huge limit', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'memory_search_semantic',
        arguments: {
          query: 'test query',
          limit: -5,
        },
      },
    };

    const result = await handleToolCall(request, mockMemoryManager);
    expect(result.isError).toBe(true);
    expect((result.content[0] as any).text).toContain('Validation error');
  });

  it('should reject memory_search_semantic with too long query', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'memory_search_semantic',
        arguments: {
          query: 'a'.repeat(1001),
        },
      },
    };

    const result = await handleToolCall(request, mockMemoryManager);
    expect(result.isError).toBe(true);
    expect((result.content[0] as any).text).toContain('Validation error');
  });

  it('should sanitize query string (remove control characters)', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'memory_search_semantic',
        arguments: {
          query: 'clean\u0000text\u001fhere',
          limit: 5,
        },
      },
    };

    await handleToolCall(request, mockMemoryManager);
    expect(mockMemoryManager.semantic.search).toHaveBeenCalledWith('cleantexthere', 5);
  });

  it('should coerce limit parameters to integers', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'memory_search_semantic',
        arguments: {
          query: 'valid query',
          limit: '15',
        },
      },
    };

    await handleToolCall(request, mockMemoryManager);
    expect(mockMemoryManager.semantic.search).toHaveBeenCalledWith('valid query', 15);
  });

  it('should reject memory_get_session with too long sessionId', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'memory_get_session',
        arguments: {
          sessionId: 'x'.repeat(201),
        },
      },
    };

    const result = await handleToolCall(request, mockMemoryManager);
    expect(result.isError).toBe(true);
    expect((result.content[0] as any).text).toContain('Validation error');
  });

  it('should reject memory_decay_stats with invalid threshold', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'memory_decay_stats',
        arguments: {
          decay_threshold: 1.5,
        },
      },
    };

    const result = await handleToolCall(request, mockMemoryManager);
    expect(result.isError).toBe(true);
    expect((result.content[0] as any).text).toContain('Validation error');
  });

  it('should reject memory_summarize_session with empty session_id', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'memory_summarize_session',
        arguments: {
          session_id: '',
        },
      },
    };

    const result = await handleToolCall(request, mockMemoryManager);
    expect(result.isError).toBe(true);
    expect((result.content[0] as any).text).toContain('Validation error');
  });

  it('should reject memory_summarize_session with invalid session_id characters', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'memory_summarize_session',
        arguments: {
          session_id: 'session@id',
        },
      },
    };

    const result = await handleToolCall(request, mockMemoryManager);
    expect(result.isError).toBe(true);
    expect((result.content[0] as any).text).toContain('Validation error');
  });

  it('should reject memory_search_unified with query too long', async () => {
    const request: CallToolRequest = {
      method: 'tools/call',
      params: {
        name: 'memory_search_unified',
        arguments: {
          query: 'a'.repeat(501),
        },
      },
    };

    const result = await handleToolCall(request, mockMemoryManager);
    expect(result.isError).toBe(true);
    expect((result.content[0] as any).text).toContain('Validation error');
  });
});
