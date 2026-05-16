import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { AgentOrchestrator } from './AgentOrchestrator';
import type { McpServerStatus, AgentTaskSpec, ProcessHandle, ProcessChunk } from '@shared/types';

function renderWithQuery(ui: ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

function setupBridge(options?: {
  mcpStatus?: McpServerStatus[];
  taskList?: AgentTaskSpec[];
  taskRun?: ProcessHandle;
  logSearch?: ProcessChunk[];
}) {
  const {
    mcpStatus = [],
    taskList = [],
    taskRun = { id: 'run-1', command: 'pnpm', args: [], cwd: 'C:\\dev', pid: 1, status: 'running', startedAt: Date.now(), exitCode: null },
    logSearch = []
  } = options ?? {};

  const mocks = {
    agent: {
      mcpStatus: vi.fn().mockResolvedValue({ ok: true, data: mcpStatus, timestamp: Date.now() }),
      taskRun: vi.fn().mockResolvedValue({ ok: true, data: taskRun, timestamp: Date.now() }),
      taskList: vi.fn().mockResolvedValue({ ok: true, data: taskList, timestamp: Date.now() }),
      logSearch: vi.fn().mockResolvedValue({ ok: true, data: logSearch, timestamp: Date.now() })
    },
    process: {
      kill: vi.fn().mockResolvedValue({ ok: true, data: true, timestamp: Date.now() })
    },
    nx: {
      get: vi.fn().mockResolvedValue({
        ok: true,
        data: {
          projects: {
            'nova-agent': { name: 'nova-agent', type: 'app', root: 'apps/nova-agent', tags: [], implicitDependencies: [] },
            'shared-ui': { name: 'shared-ui', type: 'lib', root: 'packages/shared-ui', tags: [], implicitDependencies: [] }
          },
          dependencies: {},
          generatedAt: Date.now()
        },
        timestamp: Date.now()
      })
    }
  };

  Object.defineProperty(window, 'commandCenter', {
    value: mocks,
    writable: true,
    configurable: true
  });

  return mocks;
}

describe('AgentOrchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading text while MCP status loads', async () => {
    setupBridge({ mcpStatus: [] });
    renderWithQuery(<AgentOrchestrator />);
    expect(screen.getByText(/loading mcp status/i)).toBeTruthy();
    await waitFor(() => expect(screen.queryByText(/loading mcp status/i)).toBeNull());
  });

  describe('MCP health strip', () => {
    it('renders pills for each MCP server', async () => {
      const mcpStatus: McpServerStatus[] = [
        { name: 'memory-mcp', transport: 'stdio', healthy: true, lastProbeAt: Date.now() },
        { name: 'mcp-gateway', transport: 'stdio', healthy: false, lastProbeAt: Date.now(), error: 'down' }
      ];
      setupBridge({ mcpStatus });
      renderWithQuery(<AgentOrchestrator />);
      await waitFor(() => expect(screen.getByRole('button', { name: /memory-mcp/i })).toBeTruthy());
      expect(screen.getByRole('button', { name: /mcp-gateway/i })).toBeTruthy();
    });

    it('shows green pill for healthy and red for unhealthy', async () => {
      const mcpStatus: McpServerStatus[] = [
        { name: 'memory-mcp', transport: 'stdio', healthy: true, lastProbeAt: Date.now() },
        { name: 'mcp-gateway', transport: 'stdio', healthy: false, lastProbeAt: Date.now() }
      ];
      setupBridge({ mcpStatus });
      renderWithQuery(<AgentOrchestrator />);
      await waitFor(() => expect(screen.getByRole('button', { name: /memory-mcp/i })).toBeTruthy());
      const healthyPill = screen.getByRole('button', { name: /memory-mcp/i });
      const unhealthyPill = screen.getByRole('button', { name: /mcp-gateway/i });
      expect(healthyPill.className).toContain('emerald');
      expect(unhealthyPill.className).toContain('rose');
    });

    it('clicking pill shows detail tooltip', async () => {
      const user = userEvent.setup();
      const mcpStatus: McpServerStatus[] = [
        { name: 'memory-mcp', transport: 'stdio', healthy: true, lastProbeAt: Date.now() }
      ];
      setupBridge({ mcpStatus });
      renderWithQuery(<AgentOrchestrator />);
      await waitFor(() => expect(screen.getByRole('button', { name: /memory-mcp/i })).toBeTruthy());
      await user.click(screen.getByRole('button', { name: /memory-mcp/i }));
      expect(screen.getByText(/probed:/i)).toBeTruthy();
    });

    it('shows amber pill and runtime status for installed but stopped stdio servers', async () => {
      const user = userEvent.setup();
      const mcpStatus: McpServerStatus[] = [
        {
          name: 'memory-mcp',
          transport: 'stdio',
          healthy: false,
          runtimeStatus: 'installed-not-running',
          lastProbeAt: Date.now(),
          error: 'installed, not running',
        },
      ];
      setupBridge({ mcpStatus });
      renderWithQuery(<AgentOrchestrator />);
      await waitFor(() => expect(screen.getByRole('button', { name: /memory-mcp/i })).toBeTruthy());
      const pill = screen.getByRole('button', { name: /memory-mcp/i });
      expect(pill.className).toContain('amber');
      await user.click(pill);
      expect(screen.getByText('installed-not-running')).toBeTruthy();
    });
  });

  describe('Task launcher', () => {
    it('project dropdown populated from nx.get', async () => {
      setupBridge();
      renderWithQuery(<AgentOrchestrator />);
      await waitFor(() => expect(screen.getByRole('option', { name: 'nova-agent' })).toBeTruthy());
      expect(screen.getByRole('option', { name: 'shared-ui' })).toBeTruthy();
    });

    it('target dropdown has correct options', async () => {
      setupBridge();
      renderWithQuery(<AgentOrchestrator />);
      await waitFor(() => expect(screen.getByRole('option', { name: 'build' })).toBeTruthy());
      const targets = ['build', 'test', 'lint', 'typecheck', 'dev', 'e2e'];
      for (const t of targets) {
        expect(screen.getByRole('option', { name: t })).toBeTruthy();
      }
    });

    it('clicking Run calls agent.taskRun with correct spec', async () => {
      const user = userEvent.setup();
      const mocks = setupBridge();
      renderWithQuery(<AgentOrchestrator />);
      await waitFor(() => expect(screen.getByRole('option', { name: 'nova-agent' })).toBeTruthy());
      const selects = screen.getAllByRole('combobox');
      await user.selectOptions(selects[0]!, 'nova-agent');
      await user.selectOptions(selects[1]!, 'test');
      const runBtn = screen.getByRole('button', { name: /run/i });
      await user.click(runBtn);
      await waitFor(() => expect(mocks.agent.taskRun).toHaveBeenCalledWith({
        project: 'nova-agent',
        target: 'test',
        args: undefined
      }));
    });

    it('shows spawned process ID after run', async () => {
      const user = userEvent.setup();
      const taskRun: ProcessHandle = { id: 'spawn-123', command: 'pnpm', args: [], cwd: 'C:\\dev', pid: 1, status: 'running', startedAt: Date.now(), exitCode: null };
      setupBridge({ taskRun });
      renderWithQuery(<AgentOrchestrator />);
      await waitFor(() => expect(screen.getByRole('option', { name: 'nova-agent' })).toBeTruthy());
      const selects = screen.getAllByRole('combobox');
      await user.selectOptions(selects[0]!, 'nova-agent');
      const runBtn = screen.getByRole('button', { name: /run/i });
      await user.click(runBtn);
      await waitFor(() => expect(screen.getByText('spawn-123')).toBeTruthy());
    });
  });

  describe('Task list', () => {
    it('renders tasks with project, target, and status', async () => {
      const taskList: AgentTaskSpec[] = [
        { id: 't1', project: 'nova-agent', target: 'build', args: [], status: 'running', startedAt: Date.now(), exitCode: null }
      ];
      setupBridge({ taskList });
      renderWithQuery(<AgentOrchestrator />);
      await waitFor(() => expect(screen.getByText('nova-agent')).toBeTruthy());
      expect(screen.getAllByText('build').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Running')).toBeTruthy();
    });

    it('running tasks show pulsing green dot', async () => {
      const taskList: AgentTaskSpec[] = [
        { id: 't1', project: 'app', target: 'build', args: [], status: 'running', startedAt: Date.now(), exitCode: null }
      ];
      setupBridge({ taskList });
      renderWithQuery(<AgentOrchestrator />);
      await waitFor(() => expect(screen.getByText('Running')).toBeTruthy());
      const row = screen.getByText('Running').closest('tr')!;
      expect(row.querySelector('.animate-pulse')).toBeTruthy();
    });

    it('exited tasks show success badge when exitCode is 0', async () => {
      const taskList: AgentTaskSpec[] = [
        { id: 't1', project: 'app', target: 'build', args: [], status: 'exited', startedAt: Date.now(), exitedAt: Date.now(), exitCode: 0 }
      ];
      setupBridge({ taskList });
      renderWithQuery(<AgentOrchestrator />);
      await waitFor(() => expect(screen.getByText('Success')).toBeTruthy());
    });

    it('exited tasks show failed badge when exitCode is non-zero', async () => {
      const taskList: AgentTaskSpec[] = [
        { id: 't1', project: 'app', target: 'build', args: [], status: 'exited', startedAt: Date.now(), exitedAt: Date.now(), exitCode: 1 }
      ];
      setupBridge({ taskList });
      renderWithQuery(<AgentOrchestrator />);
      await waitFor(() => expect(screen.getByText('Failed')).toBeTruthy());
    });

    it('kill button calls process.kill for running tasks', async () => {
      const user = userEvent.setup();
      const taskList: AgentTaskSpec[] = [
        { id: 't1', project: 'app', target: 'build', args: [], status: 'running', startedAt: Date.now(), exitCode: null }
      ];
      const mocks = setupBridge({ taskList });
      renderWithQuery(<AgentOrchestrator />);
      await waitFor(() => expect(screen.getByTitle('kill')).toBeTruthy());
      await user.click(screen.getByTitle('kill'));
      await waitFor(() => expect(mocks.process.kill).toHaveBeenCalledWith('t1'));
    });

    it('restart button re-runs task for exited tasks', async () => {
      const user = userEvent.setup();
      const taskList: AgentTaskSpec[] = [
        { id: 't1', project: 'app', target: 'build', args: ['--skip-cache'], status: 'exited', startedAt: Date.now(), exitedAt: Date.now(), exitCode: 0 }
      ];
      const mocks = setupBridge({ taskList });
      renderWithQuery(<AgentOrchestrator />);
      await waitFor(() => expect(screen.getByTitle('restart')).toBeTruthy());
      await user.click(screen.getByTitle('restart'));
      await waitFor(() => expect(mocks.agent.taskRun).toHaveBeenCalledWith({
        project: 'app',
        target: 'build',
        args: ['--skip-cache']
      }));
    });
  });

  describe('Log search', () => {
    it('has process ID filter dropdown', async () => {
      const taskList: AgentTaskSpec[] = [
        { id: 'abc-123', project: 'nova-agent', target: 'build', args: [], status: 'running', startedAt: Date.now(), exitCode: null }
      ];
      setupBridge({ taskList });
      renderWithQuery(<AgentOrchestrator />);
      await waitFor(() => expect(screen.getByText('nova-agent')).toBeTruthy());
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThanOrEqual(3);
      const logSelect = selects[selects.length - 1];
      expect(within(logSelect as HTMLElement).getByText(/nova-agent/i)).toBeTruthy();
    });

    it('stream toggle filters stdout/stderr', async () => {
      const user = userEvent.setup();
      setupBridge();
      renderWithQuery(<AgentOrchestrator />);
      await waitFor(() => expect(screen.getByRole('button', { name: 'stdout' })).toBeTruthy());
      await user.click(screen.getByRole('button', { name: 'stdout' }));
      expect(screen.getByRole('button', { name: 'stdout' }).className).toContain('bg-pulse-cyan');
    });

    it('search button calls agent.logSearch', async () => {
      const user = userEvent.setup();
      const mocks = setupBridge();
      renderWithQuery(<AgentOrchestrator />);
      await waitFor(() => expect(screen.getByRole('button', { name: /search/i })).toBeTruthy());
      await user.click(screen.getByRole('button', { name: /search/i }));
      await waitFor(() => expect(mocks.agent.logSearch).toHaveBeenCalled());
    });

    it('results render in terminal-styled pane', async () => {
      const user = userEvent.setup();
      const logSearch: ProcessChunk[] = [
        { processId: 'p1', stream: 'stdout', data: 'hello world', timestamp: Date.now() }
      ];
      setupBridge({ logSearch });
      renderWithQuery(<AgentOrchestrator />);
      await waitFor(() => expect(screen.getByRole('button', { name: /search/i })).toBeTruthy());
      await user.click(screen.getByRole('button', { name: /search/i }));
      await waitFor(() => expect(screen.getByText('hello world')).toBeTruthy());
    });
  });
});
