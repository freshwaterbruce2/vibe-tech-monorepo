import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getLspClient,
  initLspOpenLocation,
  initLspSocketFactory,
  resetLspForTests,
} from '../../../services/lsp/lspIntegration';
import {
  MAX_SYMBOL_RESULTS,
  queryWorkspaceSymbolCommands,
  symbolToCommand,
} from '../../../services/lsp/workspaceSymbolCommands';
import { MockWebSocket } from '../../utils/MockWebSocket';

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

/** Boot a connected typescript client on a MockWebSocket. */
async function connectClient(): Promise<MockWebSocket> {
  initLspSocketFactory(url => new MockWebSocket(url));
  getLspClient('typescript', 'C:\\ws');
  const ws = MockWebSocket.last();
  ws.open();
  ws.receive({ jsonrpc: '2.0', id: 1, result: { capabilities: {} } });
  await flush();
  return ws;
}

function respondToWorkspaceSymbol(ws: MockWebSocket, result: unknown): void {
  const request = ws.sentMessages().find(message => message.method === 'workspace/symbol');
  expect(request).toBeDefined();
  ws.receive({ jsonrpc: '2.0', id: request?.id, result });
}

const symbol = (name: string, line = 0) => ({
  name,
  kind: 12,
  containerName: '',
  location: {
    uri: 'file:///C:/ws/b.ts',
    range: { start: { line, character: 0 }, end: { line, character: 3 } },
  },
});

beforeEach(() => {
  resetLspForTests();
  MockWebSocket.reset();
});

describe('queryWorkspaceSymbolCommands', () => {
  it('returns [] for an empty query without hitting the server', async () => {
    const ws = await connectClient();
    expect(await queryWorkspaceSymbolCommands('')).toEqual([]);
    expect(ws.sentMethods()).not.toContain('workspace/symbol');
  });

  it('maps workspace/symbol hits to palette commands whose action opens the location', async () => {
    const ws = await connectClient();
    const opener = vi.fn();
    initLspOpenLocation(opener);

    const pending = queryWorkspaceSymbolCommands('foo');
    await flush();
    respondToWorkspaceSymbol(ws, [
      { ...symbol('fooBar', 4), containerName: 'utils' },
      symbol('foothing', 9),
    ]);
    const commands = await pending;

    expect(commands).toHaveLength(2);
    expect(commands[0]).toMatchObject({
      title: 'fooBar — utils',
      description: 'Function · C:\\ws\\b.ts:5',
      category: 'Workspace Symbols',
    });
    expect(commands[1]?.title).toBe('foothing'); // no container → bare name

    commands[1]?.action();
    expect(opener).toHaveBeenCalledWith('C:\\ws\\b.ts', {
      startLineNumber: 10,
      startColumn: 1,
      endLineNumber: 10,
      endColumn: 4,
    });
  });

  it('caps the result list at MAX_SYMBOL_RESULTS', async () => {
    const ws = await connectClient();
    const pending = queryWorkspaceSymbolCommands('a');
    await flush();
    respondToWorkspaceSymbol(
      ws,
      Array.from({ length: MAX_SYMBOL_RESULTS + 10 }, (_, i) => symbol(`sym${i}`, i))
    );
    expect(await pending).toHaveLength(MAX_SYMBOL_RESULTS);
  });

  it('returns [] when no language client is live', async () => {
    expect(await queryWorkspaceSymbolCommands('foo')).toEqual([]);
  });
});

describe('symbolToCommand', () => {
  it('builds a stable-ish id from index + name', () => {
    const command = symbolToCommand(
      {
        name: 'x',
        kindLabel: 'Variable',
        containerName: '',
        path: 'C:\\ws\\b.ts',
        range: { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 2 },
      },
      3
    );
    expect(command.id).toBe('lsp-symbol-3-x');
  });
});
