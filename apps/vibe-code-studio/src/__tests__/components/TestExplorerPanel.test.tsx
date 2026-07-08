/**
 * TestExplorerPanel / TestTreeNode / TestExplorerPanelHost tests — spec 08.
 * Panel + node render against the REAL testExplorer store; the host routes
 * actions through a mocked TestController (runnerFactory included, since the
 * seam object lives in that module).
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestExplorerPanel } from '../../components/TestExplorerPanel/TestExplorerPanel';
import { TestExplorerPanelHost } from '../../components/TestExplorerPanel/TestExplorerPanelHost';
import type * as TestControllerModule from '../../services/testing/TestController';
import { TestTreeNode } from '../../components/TestExplorerPanel/TestTreeNode';
import { STATUS_ICONS } from '../../services/testing/TestController';
import type {
  TestFileNode,
  TestNodeStatus,
  TestRunnerLike,
} from '../../services/testing/TestController';
import { useEditorStore } from '../../stores/useEditorStore';
import { useTestExplorerStore } from '../../stores/testExplorerStore';

vi.mock('../../services/testing/TestController', async importActual => ({
  ...(await importActual<typeof TestControllerModule>()),
  runnerFactory: { create: vi.fn() },
  discoverTests: vi.fn().mockResolvedValue(undefined),
  runAllTests: vi.fn().mockResolvedValue(undefined),
  runTestFile: vi.fn().mockResolvedValue(undefined),
}));

import {
  discoverTests,
  runAllTests,
  runnerFactory,
  runTestFile,
} from '../../services/testing/TestController';

const makeNode = (overrides: Partial<TestFileNode> = {}): TestFileNode => ({
  file: 'a.test.ts',
  status: 'idle',
  tests: [],
  passed: 0,
  failed: 0,
  skipped: 0,
  duration: 0,
  ...overrides,
});

const panelProps = () => ({
  onDiscover: vi.fn(),
  onRunAll: vi.fn(),
  onRunFile: vi.fn(),
  onRerunFailed: vi.fn(),
  onClose: vi.fn(),
});

beforeEach(() => {
  vi.clearAllMocks();
  useTestExplorerStore.setState({
    framework: null,
    files: [],
    discovering: false,
    runningAll: false,
    panelOpen: false,
    error: null,
  });
  useEditorStore.setState({ workspaceFolder: null });
});

describe('TestExplorerPanel', () => {
  it('shows the empty state when no files exist and hides it while discovering', () => {
    const props = panelProps();
    const { rerender } = render(<TestExplorerPanel {...props} />);
    expect(screen.getByTestId('test-explorer-empty')).toBeTruthy();

    useTestExplorerStore.setState({ discovering: true });
    rerender(<TestExplorerPanel {...props} />);
    expect(screen.queryByTestId('test-explorer-empty')).toBeNull();
  });

  it('renders the framework name and the error note', () => {
    useTestExplorerStore.setState({ framework: 'vitest', error: 'discovery blew up' });
    render(<TestExplorerPanel {...panelProps()} />);
    expect(screen.getByText('Test Explorer — vitest')).toBeTruthy();
    expect(screen.getByTestId('test-explorer-error').textContent).toBe('discovery blew up');
  });

  it('disables discover/run-all/re-run-failed while busy and shows progress labels', () => {
    useTestExplorerStore.setState({
      discovering: true,
      files: [makeNode({ status: 'failed' })],
    });
    render(<TestExplorerPanel {...panelProps()} />);
    const discover = screen.getByTestId<HTMLButtonElement>('test-discover');
    expect(discover.disabled).toBe(true);
    expect(discover.textContent).toBe('Discovering…');
    expect(screen.getByTestId<HTMLButtonElement>('test-run-all').disabled).toBe(true);
    expect(screen.getByTestId<HTMLButtonElement>('test-rerun-failed').disabled).toBe(true);
  });

  it('shows the running label while a run-all is in flight', () => {
    useTestExplorerStore.setState({ runningAll: true });
    render(<TestExplorerPanel {...panelProps()} />);
    expect(screen.getByTestId('test-run-all').textContent).toBe('Running…');
  });

  it('wires discover, run-all, and close to the callbacks', () => {
    const props = panelProps();
    render(<TestExplorerPanel {...props} />);
    fireEvent.click(screen.getByTestId('test-discover'));
    expect(props.onDiscover).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('test-run-all'));
    expect(props.onRunAll).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('Close'));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps re-run-failed disabled without failed files, enables it with them', () => {
    useTestExplorerStore.setState({
      files: [makeNode({ status: 'passed' }), makeNode({ file: 'b.test.ts', status: 'failed' })],
    });
    const props = panelProps();
    render(<TestExplorerPanel {...props} />);
    fireEvent.click(screen.getByTestId('test-rerun-failed'));
    expect(props.onRerunFailed).toHaveBeenCalledWith(['b.test.ts']);
  });

  it('re-run-failed stays disabled when every file passed', () => {
    useTestExplorerStore.setState({ files: [makeNode({ status: 'passed' })] });
    render(<TestExplorerPanel {...panelProps()} />);
    expect(screen.getByTestId<HTMLButtonElement>('test-rerun-failed').disabled).toBe(true);
  });

  it('renders one tree node per file', () => {
    useTestExplorerStore.setState({
      files: [makeNode(), makeNode({ file: 'b.test.ts' })],
    });
    render(<TestExplorerPanel {...panelProps()} />);
    expect(screen.getByTestId('test-file-a.test.ts')).toBeTruthy();
    expect(screen.getByTestId('test-file-b.test.ts')).toBeTruthy();
  });
});

describe('TestTreeNode', () => {
  const statuses: TestNodeStatus[] = ['idle', 'running', 'passed', 'failed', 'skipped'];

  it.each(statuses)('renders the %s status icon', status => {
    render(<TestTreeNode node={makeNode({ status })} busy={false} onRunFile={vi.fn()} />);
    expect(screen.getByTestId(`status-${status}`).textContent).toBe(STATUS_ICONS[status]);
  });

  it('hides the expand affordance when the node has no test cases', () => {
    render(<TestTreeNode node={makeNode()} busy={false} onRunFile={vi.fn()} />);
    expect(screen.queryByTestId('test-expand')).toBeNull();
  });

  it('expands to show cases with failure details, then collapses via Hide', () => {
    const node = makeNode({
      status: 'failed',
      passed: 1,
      failed: 1,
      tests: [
        { id: 'a::ok::0', name: 'ok', status: 'passed', duration: 3 },
        { id: 'a::broken::1', name: 'broken', status: 'failed', duration: 8, error: 'boom' },
      ],
    });
    render(<TestTreeNode node={node} busy={false} onRunFile={vi.fn()} />);
    const expand = screen.getByTestId('test-expand');
    expect(expand.textContent).toBe('1✓ 1✗');

    fireEvent.click(expand);
    expect(screen.getByTestId('test-cases')).toBeTruthy();
    expect(screen.getByText(/\(3ms\)/)).toBeTruthy();
    expect(screen.getByText('boom').tagName).toBe('PRE');
    expect(expand.textContent).toBe('Hide');

    fireEvent.click(expand);
    expect(screen.queryByTestId('test-cases')).toBeNull();
  });

  it('omits the failure block for failed cases without an error message', () => {
    const node = makeNode({
      failed: 1,
      tests: [{ id: 'a::silent::0', name: 'silent', status: 'failed', duration: 1 }],
    });
    render(<TestTreeNode node={node} busy={false} onRunFile={vi.fn()} />);
    fireEvent.click(screen.getByTestId('test-expand'));
    expect(screen.getByTestId('test-cases').querySelector('pre')).toBeNull();
  });

  it('disables Run while busy and forwards the file when clicked', () => {
    const onRunFile = vi.fn();
    const { rerender } = render(
      <TestTreeNode node={makeNode()} busy={true} onRunFile={onRunFile} />
    );
    expect(screen.getByTestId<HTMLButtonElement>('test-run-file').disabled).toBe(true);

    rerender(<TestTreeNode node={makeNode()} busy={false} onRunFile={onRunFile} />);
    fireEvent.click(screen.getByTestId('test-run-file'));
    expect(onRunFile).toHaveBeenCalledWith('a.test.ts');
  });
});

describe('TestExplorerPanelHost', () => {
  const fakeRunner = {} as TestRunnerLike;

  beforeEach(() => {
    vi.mocked(runnerFactory.create).mockReturnValue(fakeRunner);
  });

  it('renders nothing while the panel is closed', () => {
    useEditorStore.setState({ workspaceFolder: 'V:\\ws' });
    render(<TestExplorerPanelHost />);
    expect(screen.queryByTestId('test-explorer-panel')).toBeNull();
    expect(runnerFactory.create).toHaveBeenCalledWith('V:\\ws');
  });

  it('renders nothing without a workspace folder even when open', () => {
    useTestExplorerStore.setState({ panelOpen: true });
    render(<TestExplorerPanelHost />);
    expect(screen.queryByTestId('test-explorer-panel')).toBeNull();
    expect(runnerFactory.create).not.toHaveBeenCalled();
  });

  it('routes panel actions to the controller with the created runner', () => {
    useEditorStore.setState({ workspaceFolder: 'V:\\ws' });
    useTestExplorerStore.setState({
      panelOpen: true,
      files: [makeNode({ status: 'failed' }), makeNode({ file: 'b.test.ts', status: 'failed' })],
    });
    render(<TestExplorerPanelHost />);
    expect(screen.getByTestId('test-explorer-panel')).toBeTruthy();

    fireEvent.click(screen.getByTestId('test-discover'));
    expect(discoverTests).toHaveBeenCalledWith(fakeRunner);

    fireEvent.click(screen.getByTestId('test-run-all'));
    expect(runAllTests).toHaveBeenCalledWith(fakeRunner);

    fireEvent.click(screen.getAllByTestId('test-run-file')[0]!);
    expect(runTestFile).toHaveBeenCalledWith(fakeRunner, 'a.test.ts');

    fireEvent.click(screen.getByTestId('test-rerun-failed'));
    expect(runTestFile).toHaveBeenCalledWith(fakeRunner, 'b.test.ts');
    expect(vi.mocked(runTestFile).mock.calls).toHaveLength(3);
  });

  it('closes through the store', () => {
    useEditorStore.setState({ workspaceFolder: 'V:\\ws' });
    useTestExplorerStore.setState({ panelOpen: true });
    render(<TestExplorerPanelHost />);
    fireEvent.click(screen.getByText('Close'));
    expect(useTestExplorerStore.getState().panelOpen).toBe(false);
  });
});
