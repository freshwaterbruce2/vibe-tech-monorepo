import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

import { EnhancedAgentMode } from '../../components/EnhancedAgentMode';
import { useAgentModeStore } from '../../components/EnhancedAgentMode/stores/agentModeStore';
import type { LogEntry } from '../../components/EnhancedAgentMode/types';

/**
 * Behavioral tests for the mounted EnhancedAgentMode directory component.
 *
 * The component reads all of its dynamic state from the real Zustand
 * `agentModeStore`. We drive that real store directly (seed logs, reset
 * between tests) and pass in lightweight mocks for the two collaborators it
 * never exercises in jsdom (the orchestrator's `processRequest` and the
 * performance optimizer's profiling). DOM/window/Monaco are mocked globally
 * by src/__tests__/setup.ts.
 */

// Minimal AgentInfo shape consumed by the store via getAvailableAgents().
const availableAgents = [
  {
    name: 'Frontend Engineer',
    role: 'UI specialist',
    capabilities: ['react'],
    specialization: 'Frontend',
    performance: { avgResponseTime: 120, successRate: 0.9, confidence: 0.9 },
    workload: 0.1,
  },
  {
    name: 'Backend Engineer',
    role: 'API specialist',
    capabilities: ['node'],
    specialization: 'Backend',
    performance: { avgResponseTime: 200, successRate: 0.8, confidence: 0.8 },
    workload: 0.2,
  },
];

function createOrchestrator() {
  return {
    getAvailableAgents: vi.fn(() => availableAgents),
    processRequest: vi.fn(async () => ({
      response: 'ok',
      agentResponses: {},
    })),
  } as any;
}

function createPerformanceOptimizer() {
  return {
    getAgentProfile: vi.fn((name: string) => ({
      agentId: name,
      avgResponseTime: 100,
      successRate: 0.95,
      memoryUsage: 1024,
      cacheHitRate: 0.5,
      tokenEfficiency: 0.7,
      workloadScore: 0.3,
    })),
    getPerformanceReport: vi.fn(() => ({
      avgResponseTime: 100,
      cacheEfficiency: 0.5,
      activeAlerts: 0,
      memoryUsage: 1024,
    })),
  } as any;
}

function renderComponent(overrides: Partial<Parameters<typeof EnhancedAgentMode>[0]> = {}) {
  const onClose = vi.fn();
  const onComplete = vi.fn();
  const props = {
    isOpen: true,
    onClose,
    onComplete,
    orchestrator: createOrchestrator(),
    performanceOptimizer: createPerformanceOptimizer(),
    ...overrides,
  };
  const utils = render(<EnhancedAgentMode {...props} />);
  return { ...utils, onClose, onComplete, props };
}

// Reset the real store to a clean slate before each test so prior logs /
// persisted state never leak across cases.
//
// The hook (useAgentTask) installs a 2s setInterval that calls
// updateAgentProfiles()/updatePerformanceReport(), and its effect depends on
// the whole unselected store object. Each profile refresh allocates a fresh
// Map, which changes the store snapshot and re-fires the effect -- a periodic
// native-timer churn that storms in jsdom. We neutralize that background
// refresh here (test-side collaborator stub) so the component's real render
// and log-detail behavior can be asserted deterministically. None of the
// behaviors under test depend on the periodic refresh.
function resetStore() {
  useAgentModeStore.setState({
    task: '',
    status: 'idle',
    logs: [],
    activeAgents: [],
    expandedSections: ['agents', 'performance'],
    currentProgress: '',
    lastError: null,
    retryCount: 0,
    workspaceContext: undefined,
    orchestrator: undefined,
    performanceOptimizer: undefined,
    availableAgents: [],
    updateAgentProfiles: () => {},
    updatePerformanceReport: () => {},
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  resetStore();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('EnhancedAgentMode', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = renderComponent({ isOpen: false });
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText('Enhanced Multi-Agent Mode')).toBeNull();
  });

  it('renders the header and task textarea when open', () => {
    renderComponent();
    expect(screen.getByText('Enhanced Multi-Agent Mode')).toBeInTheDocument();

    const textarea = screen.getByLabelText('Task input');
    expect(textarea).toBeInTheDocument();
    expect(textarea.tagName).toBe('TEXTAREA');
    expect(textarea).toHaveAttribute(
      'placeholder',
      expect.stringContaining('multi-agent system'),
    );
  });

  it('shows the available agents count sourced from the orchestrator', () => {
    renderComponent();
    // Store pulls availableAgents from orchestrator.getAvailableAgents().
    expect(screen.getByText(`${availableAgents.length} agents available`)).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const { onClose } = renderComponent();
    fireEvent.click(screen.getByLabelText('Close agent mode'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('reflects typed text into the task textarea', () => {
    renderComponent();
    const textarea = screen.getByLabelText('Task input') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Refactor the auth module' } });
    expect(textarea.value).toBe('Refactor the auth module');
    expect(useAgentModeStore.getState().task).toBe('Refactor the auth module');
  });

  it('disables the Execute button while the task is empty', () => {
    renderComponent();
    const executeButton = screen.getByLabelText('Execute multi-agent task');
    expect(executeButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Task input'), {
      target: { value: 'do work' },
    });
    expect(executeButton).not.toBeDisabled();
  });

  describe('log detail view', () => {
    function seedLogs(entries: LogEntry[]) {
      // Drive the real store: render reads logs straight from it.
      useAgentModeStore.setState({ logs: entries });
    }

    const baseLog: LogEntry = {
      id: 'log-1',
      type: 'agent',
      timestamp: new Date('2026-06-19T10:00:00Z'),
      content: 'Frontend agent analyzed the component tree',
      agentName: 'Frontend Engineer',
      metrics: { confidence: 0.82, processingTime: 240, suggestions: 3 },
    };

    // Find the clickable log row inside the execution log list. Scoped to the
    // list so the detail view's <pre> (which echoes the same content) does not
    // create an ambiguous match.
    function getLogRow(): HTMLElement {
      const list = screen.getByRole('list', { name: 'Execution logs' });
      const row = within(list)
        .getByText(/analyzed the component tree/)
        .closest('[role="listitem"]');
      expect(row).not.toBeNull();
      return row as HTMLElement;
    }

    it('does not render the detail region until a log row is clicked', () => {
      seedLogs([baseLog]);
      renderComponent();
      expect(screen.queryByRole('region', { name: 'Selected log detail' })).toBeNull();
      // The seeded log content is visible in the execution log list.
      expect(getLogRow()).toBeInTheDocument();
    });

    it('opens the Selected log detail region with the clicked log when a row is clicked', () => {
      seedLogs([baseLog]);
      renderComponent();

      fireEvent.click(getLogRow());

      const detail = screen.getByRole('region', { name: 'Selected log detail' });
      expect(detail).toBeInTheDocument();
      // Detail header shows the log type (rendered lowercase, uppercased via CSS)
      // and the agent name.
      const header = within(detail).getByText(/Frontend Engineer/);
      expect(header.textContent).toContain('agent');
      // The full log content is echoed in the detail body.
      expect(within(detail).getByText(baseLog.content)).toBeInTheDocument();
      // Metrics are surfaced in the detail (82% confidence, 240ms, 3 suggestions).
      expect(within(detail).getByText(/82% confidence/)).toBeInTheDocument();
      expect(within(detail).getByText(/240ms/)).toBeInTheDocument();
      expect(within(detail).getByText(/3 suggestions/)).toBeInTheDocument();
    });

    it('closes the detail region when its close button is clicked', () => {
      seedLogs([baseLog]);
      renderComponent();

      fireEvent.click(getLogRow());

      const detail = screen.getByRole('region', { name: 'Selected log detail' });
      fireEvent.click(within(detail).getByLabelText('Close log detail'));

      expect(screen.queryByRole('region', { name: 'Selected log detail' })).toBeNull();
    });

    it('copies the log content to the clipboard from the detail view', () => {
      seedLogs([baseLog]);
      renderComponent();

      fireEvent.click(getLogRow());

      const detail = screen.getByRole('region', { name: 'Selected log detail' });
      fireEvent.click(within(detail).getByLabelText('Copy log message'));

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(baseLog.content);
    });

    it('toggles the detail off when the same already-selected row is clicked again', () => {
      seedLogs([baseLog]);
      renderComponent();

      fireEvent.click(getLogRow());
      expect(screen.getByRole('region', { name: 'Selected log detail' })).toBeInTheDocument();

      fireEvent.click(getLogRow());
      expect(screen.queryByRole('region', { name: 'Selected log detail' })).toBeNull();
    });
  });
});
