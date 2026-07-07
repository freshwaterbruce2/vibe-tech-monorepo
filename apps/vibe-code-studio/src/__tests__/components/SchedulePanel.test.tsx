/**
 * SchedulePanel tests — list rendering, status badges, pause/resume/delete
 * callbacks, run history, and the create → preview → confirm flow (AC #12).
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SchedulePanel } from '../../components/SchedulePanel';
import { cadenceFromFields } from '../../components/SchedulePanel/cadenceFields';
import type { ScheduleDefinition } from '../../services/scheduling/types';
import { useSchedulesStore } from '../../stores/schedulesStore';

const WORKSPACE = 'V:\\monorepo';

const baseSchedule: ScheduleDefinition = {
  id: 's-1',
  agentId: 'frontend',
  userRequest: 'run the audit',
  workspaceRoot: WORKSPACE,
  parameters: {},
  options: {},
  cadence: { type: 'daily', hour: 9, minute: 0 },
  status: 'active',
  missedRunPolicy: 'run-on-launch',
  createdAt: new Date(2026, 6, 4).toISOString(),
  nextRunAtMs: new Date(2026, 6, 5, 9, 0).getTime(),
  runs: [],
};

const handlers = {
  onClose: vi.fn(),
  onCreate: vi.fn(),
  onPause: vi.fn(),
  onResume: vi.fn(),
  onDelete: vi.fn(),
};

const renderPanel = (props: Partial<Parameters<typeof SchedulePanel>[0]> = {}) =>
  render(<SchedulePanel isOpen workspaceRoot={WORKSPACE} {...handlers} {...props} />);

beforeEach(() => {
  vi.clearAllMocks();
  useSchedulesStore.setState({ schedules: [], panelOpen: true });
});

describe('SchedulePanel rendering', () => {
  it('renders nothing when closed', () => {
    renderPanel({ isOpen: false });
    expect(screen.queryByTestId('schedule-panel')).toBeNull();
  });

  it('shows the empty state with no schedules', () => {
    renderPanel();
    expect(screen.getByText(/No schedules yet/)).toBeTruthy();
  });

  it('renders schedule cards with cadence, agent, and next run', () => {
    useSchedulesStore.setState({ schedules: [baseSchedule] });
    renderPanel();
    expect(screen.getByText('run the audit')).toBeTruthy();
    expect(screen.getByText('Daily at 09:00')).toBeTruthy();
    expect(screen.getByText('Agent: frontend')).toBeTruthy();
    expect(screen.getByText('active')).toBeTruthy();
  });

  it('shows "paused" as next run for paused schedules and — for exhausted ones', () => {
    useSchedulesStore.setState({
      schedules: [
        { ...baseSchedule, id: 'p', status: 'paused' },
        { ...baseSchedule, id: 'c', status: 'completed', nextRunAtMs: null },
      ],
    });
    renderPanel();
    expect(screen.getByText('Next: paused')).toBeTruthy();
    expect(screen.getByText('Next: —')).toBeTruthy();
  });

  it('renders run history with status and duration', () => {
    useSchedulesStore.setState({
      schedules: [
        {
          ...baseSchedule,
          runs: [
            {
              id: 'r-1',
              startedAt: new Date(2026, 6, 4, 9, 0).toISOString(),
              status: 'failed',
              error: 'boom',
              durationMs: 4000,
            },
          ],
        },
      ],
    });
    renderPanel();
    expect(screen.getByText('failed')).toBeTruthy();
    expect(screen.getByText('4s')).toBeTruthy();
    expect(screen.getByText(/boom/)).toBeTruthy();
  });
});

describe('SchedulePanel actions', () => {
  it('pause, resume, delete, close call their handlers', () => {
    useSchedulesStore.setState({
      schedules: [baseSchedule, { ...baseSchedule, id: 's-2', status: 'paused' }],
    });
    renderPanel();
    fireEvent.click(screen.getByLabelText('Pause run the audit'));
    expect(handlers.onPause).toHaveBeenCalledWith('s-1');
    fireEvent.click(screen.getByLabelText('Resume run the audit'));
    expect(handlers.onResume).toHaveBeenCalledWith('s-2');
    fireEvent.click(screen.getAllByLabelText('Delete run the audit')[0]!);
    expect(handlers.onDelete).toHaveBeenCalledWith('s-1');
    fireEvent.click(screen.getByLabelText('Close schedule panel'));
    expect(handlers.onClose).toHaveBeenCalled();
  });

  it('disables the new-schedule button without a workspace', () => {
    renderPanel({ workspaceRoot: null });
    expect((screen.getByLabelText('New schedule') as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('create → preview → confirm flow', () => {
  it('validates, previews the exact submit call, and creates on confirm', () => {
    renderPanel();
    fireEvent.click(screen.getByLabelText('New schedule'));

    // Preview without a description → validation error
    fireEvent.click(screen.getByTestId('schedule-preview-button'));
    expect(screen.getByTestId('schedule-error').textContent).toMatch(/required/);

    fireEvent.change(screen.getByTestId('schedule-request'), {
      target: { value: 'nightly dependency audit' },
    });
    fireEvent.change(screen.getByTestId('schedule-cadence-type'), {
      target: { value: 'interval' },
    });
    fireEvent.change(screen.getByTestId('schedule-interval'), { target: { value: '90' } });
    fireEvent.click(screen.getByTestId('schedule-preview-button'));

    const preview = screen.getByTestId('schedule-preview');
    expect(preview.textContent).toContain('BackgroundAgentSystem.submit(');
    expect(preview.textContent).toContain('nightly dependency audit');

    fireEvent.click(screen.getByText('Create schedule'));
    expect(handlers.onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        userRequest: 'nightly dependency audit',
        workspaceRoot: WORKSPACE,
        cadence: { type: 'interval', everyMinutes: 90 },
      })
    );
    // form closes after confirm
    expect(screen.queryByTestId('schedule-preview')).toBeNull();
  });

  it('preview Back returns to the editable form (weekly, all fields edited)', () => {
    renderPanel();
    fireEvent.click(screen.getByLabelText('New schedule'));
    fireEvent.change(screen.getByTestId('schedule-request'), {
      target: { value: 'weekly summary' },
    });
    fireEvent.change(screen.getByTestId('schedule-agent'), { target: { value: 'backend' } });
    fireEvent.change(screen.getByTestId('schedule-policy'), { target: { value: 'skip' } });
    fireEvent.change(screen.getByTestId('schedule-cadence-type'), {
      target: { value: 'weekly' },
    });
    fireEvent.change(screen.getByTestId('schedule-time'), { target: { value: '18:30' } });
    fireEvent.change(screen.getByTestId('schedule-day'), { target: { value: '5' } });
    fireEvent.click(screen.getByTestId('schedule-preview-button'));
    expect(screen.getByTestId('schedule-preview')).toBeTruthy();
    expect(screen.getByText(/Friday at 18:30/)).toBeTruthy();
    fireEvent.click(screen.getByText('Back'));
    expect(screen.getByTestId('schedule-form')).toBeTruthy();
    // edited fields survived the round-trip
    expect((screen.getByTestId('schedule-agent') as HTMLInputElement).value).toBe('backend');
    expect((screen.getByTestId('schedule-policy') as HTMLSelectElement).value).toBe('skip');
    // cancel closes the form
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByTestId('schedule-form')).toBeNull();
  });

  it('surfaces cadence validation errors from the preview step', () => {
    renderPanel();
    fireEvent.click(screen.getByLabelText('New schedule'));
    fireEvent.change(screen.getByTestId('schedule-request'), {
      target: { value: 'bad interval' },
    });
    fireEvent.change(screen.getByTestId('schedule-cadence-type'), {
      target: { value: 'interval' },
    });
    fireEvent.change(screen.getByTestId('schedule-interval'), { target: { value: '0' } });
    fireEvent.click(screen.getByTestId('schedule-preview-button'));
    expect(screen.getByTestId('schedule-error').textContent).toMatch(/at least 1 minute/);
    expect(screen.queryByTestId('schedule-preview')).toBeNull();
  });

  it('rejects a once cadence without a time, accepts one with it', () => {
    renderPanel();
    fireEvent.click(screen.getByLabelText('New schedule'));
    fireEvent.change(screen.getByTestId('schedule-request'), {
      target: { value: 'one-off task' },
    });
    fireEvent.click(screen.getByTestId('schedule-preview-button'));
    expect(screen.getByTestId('schedule-error').textContent).toMatch(/run time/i);

    const future = new Date(Date.now() + 60 * 60_000);
    const pad = (n: number): string => String(n).padStart(2, '0');
    const local = `${future.getFullYear()}-${pad(future.getMonth() + 1)}-${pad(
      future.getDate()
    )}T${pad(future.getHours())}:${pad(future.getMinutes())}`;
    fireEvent.change(screen.getByTestId('schedule-runat'), { target: { value: local } });
    fireEvent.click(screen.getByTestId('schedule-preview-button'));
    expect(screen.getByTestId('schedule-preview')).toBeTruthy();
  });
});

describe('cadenceFromFields', () => {
  const fields = {
    type: 'daily' as const,
    runAt: '2026-07-10T09:00',
    everyMinutes: '15',
    time: '08:30',
    dayOfWeek: '3',
  };

  it('builds each cadence variant from raw form fields', () => {
    expect(cadenceFromFields({ ...fields, type: 'once' })).toEqual({
      type: 'once',
      runAt: new Date('2026-07-10T09:00').toISOString(),
    });
    expect(cadenceFromFields({ ...fields, type: 'interval' })).toEqual({
      type: 'interval',
      everyMinutes: 15,
    });
    expect(cadenceFromFields(fields)).toEqual({ type: 'daily', hour: 8, minute: 30 });
    expect(cadenceFromFields({ ...fields, type: 'weekly' })).toEqual({
      type: 'weekly',
      dayOfWeek: 3,
      hour: 8,
      minute: 30,
    });
  });
});
