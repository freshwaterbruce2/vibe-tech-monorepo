/**
 * PlanModeDialogHost tests — spec 05 store-gated modal: visibility, input
 * gating, running the real PlanModeRunner against stub planner/writer
 * services, phase/error/done status rendering, and Close semantics.
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { ServicesContext } from '../../app/contexts';
import type { ServicesContextValue } from '../../app/contexts';
import { PlanModeDialogHost } from '../../components/PlanMode/PlanModeDialogHost';
import { usePlanModeStore } from '../../stores/planModeStore';
import { useEditorStore } from '../../stores/useEditorStore';
import type { PlanningInsights, TaskPlanResponse } from '../../types';

const insights: PlanningInsights = {
  overallConfidence: 0.9,
  highRiskSteps: 0,
  memoryBackedSteps: 0,
  fallbacksGenerated: 0,
  estimatedSuccessRate: 0.8,
};

const response: TaskPlanResponse & { insights: PlanningInsights } = {
  task: {
    id: 'task-1',
    title: 'Refactor Login',
    description: 'desc',
    userRequest: 'req',
    steps: [],
    status: 'planning',
    createdAt: new Date(2026, 0, 5),
  },
  reasoning: 'Because.',
  insights,
};

const taskPlanner = { planTaskEnhanced: vi.fn() };
const fileSystemService = {
  createDirectory: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
};

const services = { taskPlanner, fileSystemService } as unknown as ServicesContextValue;

const wrapper = ({ children }: { children: ReactNode }) => (
  <ServicesContext.Provider value={services}>{children}</ServicesContext.Provider>
);

const openDialog = () => usePlanModeStore.setState({ dialogOpen: true });

beforeEach(() => {
  vi.clearAllMocks();
  taskPlanner.planTaskEnhanced.mockResolvedValue(response);
  fileSystemService.createDirectory.mockResolvedValue(undefined);
  fileSystemService.writeFile.mockResolvedValue(undefined);
  usePlanModeStore.setState({
    phase: 'idle',
    dialogOpen: false,
    latestPlanPath: null,
    history: [],
    error: null,
  });
  useEditorStore.setState({ workspaceFolder: 'V:\\ws' });
});

describe('PlanModeDialogHost', () => {
  it('renders nothing while the dialog is closed', () => {
    render(<PlanModeDialogHost />, { wrapper });
    expect(screen.queryByTestId('plan-mode-dialog')).toBeNull();
  });

  it('shows the prompt textarea when opened', () => {
    openDialog();
    render(<PlanModeDialogHost />, { wrapper });
    expect(screen.getByTestId('plan-mode-dialog')).toBeTruthy();
    expect(screen.getByTestId('plan-mode-input')).toBeTruthy();
  });

  it('disables Create for empty input and for a missing workspace', () => {
    openDialog();
    render(<PlanModeDialogHost />, { wrapper });
    const create = screen.getByTestId('plan-mode-create') as HTMLButtonElement;
    expect(create.disabled).toBe(true);

    fireEvent.change(screen.getByTestId('plan-mode-input'), {
      target: { value: '   ' },
    });
    expect(create.disabled).toBe(true);

    fireEvent.change(screen.getByTestId('plan-mode-input'), {
      target: { value: 'refactor login' },
    });
    expect(create.disabled).toBe(false);

    act(() => useEditorStore.setState({ workspaceFolder: null }));
    fireEvent.change(screen.getByTestId('plan-mode-input'), {
      target: { value: 'refactor login again' },
    });
    expect((screen.getByTestId('plan-mode-create') as HTMLButtonElement).disabled).toBe(true);
  });

  it('runs plan mode through the app services and reports the written path', async () => {
    openDialog();
    render(<PlanModeDialogHost />, { wrapper });
    fireEvent.change(screen.getByTestId('plan-mode-input'), {
      target: { value: 'refactor the login flow' },
    });
    fireEvent.click(screen.getByTestId('plan-mode-create'));

    const done = await screen.findByTestId('plan-mode-done');
    expect(taskPlanner.planTaskEnhanced).toHaveBeenCalledWith(
      expect.objectContaining({
        userRequest: 'refactor the login flow',
        context: expect.objectContaining({ workspaceRoot: 'V:\\ws' }),
      })
    );
    expect(fileSystemService.writeFile).toHaveBeenCalledTimes(1);
    expect(done.textContent).toContain('Plan written: V:\\ws/.vcs/plans/refactor-login-');
    expect(usePlanModeStore.getState().phase).toBe('done');
  });

  it('renders busy phase labels and disables the inputs', () => {
    usePlanModeStore.setState({ dialogOpen: true, phase: 'researching' });
    render(<PlanModeDialogHost />, { wrapper });
    expect(screen.getByText('Researching workspace…')).toBeTruthy();
    expect((screen.getByTestId('plan-mode-input') as HTMLTextAreaElement).disabled).toBe(true);
    const create = screen.getByTestId('plan-mode-create') as HTMLButtonElement;
    expect(create.disabled).toBe(true);
    expect(create.textContent).toBe('Planning…');

    act(() => usePlanModeStore.setState({ phase: 'writing' }));
    expect(screen.getByText('Writing plan file…')).toBeTruthy();
  });

  it('shows the store error when a run fails', async () => {
    taskPlanner.planTaskEnhanced.mockRejectedValue(new Error('planner exploded'));
    openDialog();
    render(<PlanModeDialogHost />, { wrapper });
    fireEvent.change(screen.getByTestId('plan-mode-input'), {
      target: { value: 'doomed request' },
    });
    fireEvent.click(screen.getByTestId('plan-mode-create'));

    await waitFor(() => expect(screen.getByText('planner exploded')).toBeTruthy());
    expect(usePlanModeStore.getState().phase).toBe('error');
  });

  it('Close hides the dialog through the store', () => {
    openDialog();
    render(<PlanModeDialogHost />, { wrapper });
    fireEvent.click(screen.getByText('Close'));
    expect(usePlanModeStore.getState().dialogOpen).toBe(false);
    expect(screen.queryByTestId('plan-mode-dialog')).toBeNull();
  });
});
