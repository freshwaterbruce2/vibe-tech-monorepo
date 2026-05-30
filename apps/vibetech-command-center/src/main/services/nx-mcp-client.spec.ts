import { describe, it, expect } from 'vitest';
import { NxMcpClient } from './nx-mcp-client';

describe('NxMcpClient', () => {
  it('returns false/error when connection fails', async () => {
    const client = new NxMcpClient({
      command: process.execPath,
      args: ['-e', 'process.exit(1);'],
      connectTimeoutMs: 500
    });
    
    const ok = await client.connect();
    expect(ok).toBe(false);

    await expect(client.callTool('ci_information')).rejects.toThrow();
    await client.disconnect();
  });

  it('times out connection attempts within budget', async () => {
    const client = new NxMcpClient({
      command: process.execPath,
      args: ['-e', 'setInterval(()=>{},1000);'],
      connectTimeoutMs: 500
    });
    
    const start = Date.now();
    const ok = await client.connect();
    const elapsed = Date.now() - start;

    expect(ok).toBe(false);
    expect(elapsed).toBeLessThan(3_000);
    await client.disconnect();
  });
});
