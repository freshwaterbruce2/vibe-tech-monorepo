import { describe, expect, it } from 'vitest';
import { resolveServerCommand } from '../src/config.js';

describe('resolveServerCommand', () => {
  it('rewrites bare node commands to the current node executable', () => {
    const resolved = resolveServerCommand(
      {
        command: 'node',
        args: ['C:/dev/apps/desktop-commander-v3/dist/mcp.js'],
        env: {},
      },
      {
        platform: 'win32',
        nodeExecutable: 'C:/Users/test/AppData/Local/Volta/tools/image/node/22.21.1/node.exe',
        pathExists: () => true,
      }
    );

    expect(resolved.command).toBe(
      'C:/Users/test/AppData/Local/Volta/tools/image/node/22.21.1/node.exe'
    );
    expect(resolved.args).toEqual(['C:/dev/apps/desktop-commander-v3/dist/mcp.js']);
  });

  it('rewrites bare python commands to py.exe on Windows when available', () => {
    const resolved = resolveServerCommand(
      {
        command: 'python',
        args: ['-m', 'notebooklm_mcp_server'],
        env: {},
      },
      {
        platform: 'win32',
        nodeExecutable: 'C:/Users/test/AppData/Local/Volta/tools/image/node/22.21.1/node.exe',
        pythonLauncherPath: 'C:/Windows/py.exe',
        pathExists: (candidate) => candidate === 'C:/Windows/py.exe',
      }
    );

    expect(resolved.command).toBe('C:/Windows/py.exe');
    expect(resolved.args).toEqual(['-3', '-m', 'notebooklm_mcp_server']);
  });

  it('does not duplicate an existing py.exe version selector', () => {
    const resolved = resolveServerCommand(
      {
        command: 'python',
        args: ['-3', '-m', 'notebooklm_mcp_server'],
        env: {},
      },
      {
        platform: 'win32',
        pythonLauncherPath: 'C:/Windows/py.exe',
        pathExists: (candidate) => candidate === 'C:/Windows/py.exe',
      }
    );

    expect(resolved.command).toBe('C:/Windows/py.exe');
    expect(resolved.args).toEqual(['-3', '-m', 'notebooklm_mcp_server']);
  });
});
