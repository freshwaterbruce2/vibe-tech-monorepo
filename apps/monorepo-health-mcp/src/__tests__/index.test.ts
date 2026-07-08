/**
 * index — MCP tool wiring.
 *
 * The MCP SDK's McpServer/StdioServerTransport are replaced with lightweight
 * fakes (no real stdio/network transport), and commands.ts's builders are
 * mocked so each tool handler can be invoked directly and asserted to call
 * the correct builder + defer to runCommand for execution.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

const registered = new Map<string, ToolHandler>();
const connect = vi.fn().mockResolvedValue(undefined);

vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => {
  class FakeMcpServer {
    connect = connect;
    tool(_name: string, _description: string, _schema: unknown, handler: ToolHandler): void {
      registered.set(_name, handler);
    }
  }
  return { McpServer: FakeMcpServer };
});

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => {
  class FakeStdioServerTransport {}
  return { StdioServerTransport: FakeStdioServerTransport };
});

const buildPwshCommand = vi.fn().mockReturnValue('PWSH_CMD');
const buildPowershellCommand = vi.fn().mockReturnValue('LEGACY_CMD');
const buildMaintenanceCommand = vi.fn().mockReturnValue('MAINT_CMD');
const runCommand = vi.fn().mockResolvedValue({ content: [{ type: 'text', text: '{}' }] });

vi.mock('../commands.js', () => ({
  buildPwshCommand,
  buildPowershellCommand,
  buildMaintenanceCommand,
  runCommand,
}));

vi.spyOn(console, 'error').mockImplementation(() => undefined);

await import('../index.js');

describe('index.ts tool wiring', () => {
  beforeEach(() => {
    buildPwshCommand.mockClear();
    buildPowershellCommand.mockClear();
    buildMaintenanceCommand.mockClear();
    runCommand.mockClear();
  });

  it('registers all 5 tools and connects the stdio transport', () => {
    expect([...registered.keys()]).toEqual([
      'run_workspace_maintenance',
      'get_database_health',
      'get_workspace_health',
      'get_d_drive_health',
      'run_workspace_cleanup',
    ]);
    expect(connect).toHaveBeenCalledTimes(1);
  });

  it('get_database_health builds via buildPwshCommand and delegates to runCommand', async () => {
    await registered.get('get_database_health')?.({});
    expect(buildPwshCommand).toHaveBeenCalledWith(expect.stringContaining('database-health.ps1'));
    expect(runCommand).toHaveBeenCalledWith('PWSH_CMD', expect.any(String));
  });

  it('get_workspace_health builds via buildPwshCommand', async () => {
    await registered.get('get_workspace_health')?.({});
    expect(buildPwshCommand).toHaveBeenCalledWith(expect.stringContaining('workspace-health.ps1'));
  });

  it('get_d_drive_health builds via buildPwshCommand', async () => {
    await registered.get('get_d_drive_health')?.({});
    expect(buildPwshCommand).toHaveBeenCalledWith(expect.stringContaining('d-drive-health.ps1'));
  });

  it('run_workspace_cleanup resolves dryRun and builds via buildPowershellCommand', async () => {
    await registered.get('run_workspace_cleanup')?.({ dryRun: true });
    expect(buildPowershellCommand).toHaveBeenCalledWith(
      expect.stringContaining('cleanup-stale-artifacts.ps1'),
      true,
    );

    await registered.get('run_workspace_cleanup')?.({});
    expect(buildPowershellCommand).toHaveBeenLastCalledWith(
      expect.stringContaining('cleanup-stale-artifacts.ps1'),
      false,
    );
  });

  it('run_workspace_maintenance forwards flags to buildMaintenanceCommand', async () => {
    await registered.get('run_workspace_maintenance')?.({
      retention: true,
      vacuum: false,
      backup: true,
    });
    expect(buildMaintenanceCommand).toHaveBeenCalledWith(expect.any(String), {
      retention: true,
      vacuum: false,
      backup: true,
    });
    expect(runCommand).toHaveBeenCalledWith('MAINT_CMD', expect.any(String));
  });
});
