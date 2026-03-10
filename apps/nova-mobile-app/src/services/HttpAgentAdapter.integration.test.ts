/**
 * Integration test for HttpAgentAdapter
 * Run with Nova Agent desktop server active: pnpm test:integration
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { HttpAgentAdapter } from './HttpAgentAdapter';

// Skip in CI - only run locally with server
const describeIntegration = process.env.CI ? describe.skip : describe;

describeIntegration('HttpAgentAdapter Integration', () => {
  let adapter: HttpAgentAdapter;

  beforeAll(() => {
    adapter = new HttpAgentAdapter('http://localhost:3000');
  });

  it('should connect to /health endpoint', async () => {
    const health = await adapter.getHealth();
    expect(health).toBeDefined();
    expect(health.ok).toBe(true);
    expect(typeof health.uptime).toBe('number');
  });

  it('should connect to desktop server status endpoint', async () => {
    const status = await adapter.getStatus();
    expect(status).toBeDefined();
  });

  it('should send chat message and receive response', async () => {
    const response = await adapter.chat('Hello from integration test');
    expect(response).toBeDefined();
    expect(typeof response).toBe('string');
    expect(response.length).toBeGreaterThan(0);
  });

  it('should handle chat with projectId', async () => {
    const response = await adapter.chat('Test with project', 'test-project-123');
    expect(response).toBeDefined();
  });

  it('should search memories', async () => {
    const results = await adapter.searchMemories('test');
    expect(Array.isArray(results)).toBe(true);
  });

  it('should list projects', async () => {
    const projects = await adapter.getProjects();
    expect(Array.isArray(projects)).toBe(true);
    expect(projects.length).toBeGreaterThan(0);
    expect(projects[0]).toHaveProperty('id');
    expect(projects[0]).toHaveProperty('name');
  });
});
