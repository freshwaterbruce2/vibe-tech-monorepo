import { describe, it, expect, beforeAll, vi } from 'vitest';
import { db } from '../../src/db/client.js';
import { initializeSchema } from '../../src/db/schema.js';
import { commandRouter } from '../../src/core/command-router.js';
import { novaClient } from '../../src/client/nova-client.js';
import { ipcClient } from '../../src/core/ipc-client.js';
import { sessionManager } from '../../src/core/session-manager.js';

// Mock the clients
vi.mock('../../src/client/nova-client.js', () => {
  return {
    novaClient: {
      checkHealth: vi.fn(),
      getStatus: vi.fn(),
      chat: vi.fn(),
      searchMemories: vi.fn(),
    }
  };
});

vi.mock('../../src/core/ipc-client.js', () => {
  return {
    ipcClient: {
      connect: vi.fn(),
      disconnect: vi.fn(),
      callTool: vi.fn(),
      dispatchTask: vi.fn(),
      isConnected: false,
    }
  };
});

describe('Command Router', () => {
  const platform = 'telegram';
  const userId = 'user123';
  const channelId = 'channel456';

  beforeAll(() => {
    expect(db.name).toBe(':memory:');
    initializeSchema();
  });

  it('should return help menu text for /help', async () => {
    const result = await commandRouter.routeMessage(platform, userId, channelId, '/help');
    expect(result.text).toContain('Nova Agent Bot Help Menu');
    expect(result.text).toContain('/status');
    expect(result.text).toContain('/screenshot');
    expect(result.text).toContain('/mcp');
    expect(result.text).toContain('/link');
  });

  it('should format status output correctly when Nova Agent is offline', async () => {
    vi.mocked(novaClient.checkHealth).mockResolvedValueOnce({ ok: false, uptime: 0 });

    const result = await commandRouter.routeMessage(platform, userId, channelId, '/status');
    expect(result.text).toContain('OFFLINE');
    expect(result.text).toContain('Please ensure Nova Agent is running');
  });

  it('should format status output correctly when Nova Agent is online', async () => {
    vi.mocked(novaClient.checkHealth).mockResolvedValueOnce({ ok: true, uptime: 3600 });
    vi.mocked(novaClient.getStatus).mockResolvedValueOnce({
      status: 'online',
      version: '1.2.3',
      uptime: 3600,
      activeProject: 'vibe-booking-backend',
      metrics: {
        cpuUsage: 12,
        memoryUsage: 45,
        tasksQueued: 0
      }
    });

    const result = await commandRouter.routeMessage(platform, userId, channelId, '/status');
    expect(result.text).toContain('ONLINE');
    expect(result.text).toContain('v1.2.3');
    expect(result.text).toContain('vibe-booking-backend');
    expect(result.text).toContain('**CPU Usage**: 12%');
    expect(result.text).toContain('**Memory**: 45%');
  });

  it('should handle /screenshot successfully', async () => {
    // Set ipcClient connected
    Object.defineProperty(ipcClient, 'isConnected', { value: true, writable: true });
    vi.mocked(ipcClient.callTool).mockResolvedValueOnce({
      success: true,
      path: 'D:\\screenshots\\screenshot-123.png'
    });

    const result = await commandRouter.routeMessage(platform, userId, channelId, '/screenshot');
    expect(result.text).toContain('Screenshot Captured');
    expect(result.text).toContain('D:\\screenshots\\screenshot-123.png');
    expect(result.imagePath).toBe('D:\\screenshots\\screenshot-123.png');

    expect(ipcClient.callTool).toHaveBeenCalledWith(
      'desktop-commander',
      'dc_take_screenshot',
      expect.objectContaining({ directory: 'D:\\screenshots' }),
      15000
    );
  });

  it('should handle /mcp tool execution', async () => {
    Object.defineProperty(ipcClient, 'isConnected', { value: true, writable: true });
    vi.mocked(ipcClient.callTool).mockResolvedValueOnce({
      success: true,
      data: { files: ['index.ts', 'package.json'] }
    });

    const result = await commandRouter.routeMessage(
      platform,
      userId,
      channelId,
      '/mcp filesystem list_directory {"path":"D:\\\\databases"}'
    );

    expect(result.text).toContain('MCP Tool Call Success');
    expect(result.text).toContain('index.ts');
    expect(ipcClient.callTool).toHaveBeenCalledWith(
      'filesystem',
      'list_directory',
      { path: 'D:\\databases' },
      30000
    );
  });

  it('should generate pairing code and perform linkages via /link', async () => {
    // 1. Generate code from client A
    const clientA = sessionManager.getOrCreateUnifiedClient('telegram', 'tg-user-link');
    const resultGenerate = await commandRouter.routeMessage('telegram', 'tg-user-link', 'ch1', '/link');
    
    expect(resultGenerate.text).toContain('Account Synchronization Code');
    
    // Extract code using regex
    const codeMatch = resultGenerate.text.match(/`([A-Z0-9]+)`/);
    expect(codeMatch).toBeDefined();
    const code = codeMatch![1]!;

    // 2. Pair Client B using code
    const clientB = sessionManager.getOrCreateUnifiedClient('discord', 'discord-user-link');
    expect(clientA).not.toBe(clientB);

    const resultPair = await commandRouter.routeMessage('discord', 'discord-user-link', 'ch2', `/link ${code}`);
    expect(resultPair.text).toContain('Accounts Successfully Linked');

    // Mappings should now resolve to the same client ID (Client B because of merge target)
    expect(sessionManager.getOrCreateUnifiedClient('telegram', 'tg-user-link')).toBe(clientB);
    expect(sessionManager.getOrCreateUnifiedClient('discord', 'discord-user-link')).toBe(clientB);
  });

  it('should route normal conversation chat prompts to Nova Client', async () => {
    vi.mocked(novaClient.chat).mockResolvedValueOnce('I am Nova Agent, how can I help you?');
    
    const client = sessionManager.getOrCreateUnifiedClient(platform, userId);
    const result = await commandRouter.routeMessage(platform, userId, channelId, 'Hello agent');

    expect(result.text).toBe('I am Nova Agent, how can I help you?');
    expect(novaClient.chat).toHaveBeenCalledWith('Hello agent', null);

    // Verify history was saved
    const session = sessionManager.getSession(client);
    expect(session.history.length).toBe(2);
    expect(session.history[0]?.content).toBe('Hello agent');
    expect(session.history[1]?.content).toBe('I am Nova Agent, how can I help you?');
  });
});
