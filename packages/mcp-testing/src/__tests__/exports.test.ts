import { describe, expect, it } from 'vitest';

describe('mcp-testing exports', () => {
  it('exports mock utilities', async () => {
    const mocks = await import('../mocks/index.js');
    expect(mocks.MockMcpClient).toBeDefined();
    expect(mocks.MockTransport).toBeDefined();
    expect(mocks.createTransportPair).toBeDefined();
  });

  it('exports helper utilities', async () => {
    const helpers = await import('../helpers/index.js');
    expect(helpers.ToolTester).toBeDefined();
    expect(helpers.createToolTester).toBeDefined();
    expect(helpers.ResourceTester).toBeDefined();
    expect(helpers.createResourceTester).toBeDefined();
  });
});
