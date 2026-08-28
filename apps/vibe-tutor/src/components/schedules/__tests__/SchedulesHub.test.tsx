import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Hook mocks ─────────────────────────────────────────────────────────────────
const mockAddScheduleItem = vi.fn();
const mockRemoveScheduleItem = vi.fn();
const mockAddChore = vi.fn();
const mockRemoveChore = vi.fn();
const mockToggleChore = vi.fn().mockReturnValue(0);
const mockAddGoal = vi.fn();
const mockToggleGoal = vi.fn();
const mockRemoveGoal = vi.fn();

const mockSchedulesReturn = {
  items: [],
  chores: [],
  goals: [],
  addScheduleItem: mockAddScheduleItem,
  removeScheduleItem: mockRemoveScheduleItem,
  addChore: mockAddChore,
  removeChore: mockRemoveChore,
  toggleChore: mockToggleChore,
  addGoal: mockAddGoal,
  toggleGoal: mockToggleGoal,
  removeGoal: mockRemoveGoal,
};

// NOTE: vi.mock paths are resolved relative to this test file, not the source
// file. From __tests__/ we need 3 levels up to reach src/.
vi.mock('../../../hooks/useSchedules', () => ({
  useSchedules: () => mockSchedulesReturn,
}));

const mockGenerateSchedule = vi.fn().mockResolvedValue([]);

vi.mock('../../../hooks/useScheduleIntelligence', () => ({
  useScheduleIntelligence: () => ({
    hasEnoughData: false,
    isGenerating: false,
    peakHours: [16, 17, 18],
    weeklyStats: { completed: 0, total: 0 },
    streak: 0,
    generateSchedule: mockGenerateSchedule,
  }),
}));

// ScheduleInsightsCard is only shown when hasEnoughData is true; mock to avoid
// rendering its internals in unrelated tests.
vi.mock('../ScheduleInsightsCard', () => ({
  ScheduleInsightsCard: () => <div data-testid="schedule-insights-card" />,
}));

import SchedulesHub from '../SchedulesHub';

// ── Props ──────────────────────────────────────────────────────────────────────
const onEarnTokens = vi.fn();
const onClose = vi.fn();

function renderHub() {
  return render(<SchedulesHub onEarnTokens={onEarnTokens} onClose={onClose} />);
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function getActivityInput() {
  return document.querySelector('#schedule-activity') as HTMLInputElement;
}
function getTimeInput() {
  return document.querySelector('#schedule-time') as HTMLInputElement;
}
function getMeridianSelect() {
  return document.querySelector('#schedule-meridian') as HTMLSelectElement;
}
function getChoreNameInput() {
  return document.querySelector('#chore-name') as HTMLInputElement;
}
function getChoreRewardInput() {
  return document.querySelector('#chore-reward') as HTMLInputElement;
}
function getGoalTextInput() {
  return document.querySelector('#goal-text') as HTMLInputElement;
}
function getGoalTypeSelect() {
  return document.querySelector('#goal-type') as HTMLSelectElement;
}

describe('SchedulesHub', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to empty lists for each test
    mockSchedulesReturn.items = [];
    mockSchedulesReturn.chores = [];
    mockSchedulesReturn.goals = [];
  });

  // ── Basic rendering ──────────────────────────────────────────────────────────
  describe('Rendering', () => {
    it('renders without crashing', () => {
      renderHub();
      expect(screen.getByText('Schedules & Goals')).toBeInTheDocument();
    });

    it('renders the three navigation tabs', () => {
      renderHub();
      expect(screen.getByRole('button', { name: /routines & schedules/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /chores list/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /goals tracker/i })).toBeInTheDocument();
    });

    it('renders the Back to Dashboard button', () => {
      renderHub();
      expect(screen.getByRole('button', { name: /back to dashboard/i })).toBeInTheDocument();
    });

    it('calls onClose when the back button is clicked', () => {
      renderHub();
      fireEvent.click(screen.getByRole('button', { name: /back to dashboard/i }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('defaults to the Routines & Schedules tab', () => {
      renderHub();
      // Activity input is only present in the schedules tab
      expect(getActivityInput()).toBeInTheDocument();
    });
  });

  // ── Schedules tab — form field accessibility ──────────────────────────────────
  describe('Schedules tab — form field id/name attributes', () => {
    it('schedule-activity input has id="schedule-activity"', () => {
      renderHub();
      const input = getActivityInput();
      expect(input).not.toBeNull();
      expect(input.id).toBe('schedule-activity');
    });

    it('schedule-activity input has name="schedule-activity"', () => {
      renderHub();
      expect(getActivityInput().name).toBe('schedule-activity');
    });

    it('schedule-time input has id="schedule-time"', () => {
      renderHub();
      const input = getTimeInput();
      expect(input).not.toBeNull();
      expect(input.id).toBe('schedule-time');
    });

    it('schedule-time input has name="schedule-time"', () => {
      renderHub();
      expect(getTimeInput().name).toBe('schedule-time');
    });

    it('schedule-meridian select has id="schedule-meridian"', () => {
      renderHub();
      const select = getMeridianSelect();
      expect(select).not.toBeNull();
      expect(select.id).toBe('schedule-meridian');
    });

    it('schedule-meridian select has name="schedule-meridian"', () => {
      renderHub();
      expect(getMeridianSelect().name).toBe('schedule-meridian');
    });

    it('Activity label is rendered for the schedule-activity input', () => {
      renderHub();
      expect(screen.getByText('Activity')).toBeInTheDocument();
    });
  });

  // ── Schedules tab — interaction ───────────────────────────────────────────────
  describe('Schedules tab — interaction', () => {
    it('updates the activity input when the user types', () => {
      renderHub();
      fireEvent.change(getActivityInput(), { target: { value: 'Morning reading' } });
      expect(getActivityInput().value).toBe('Morning reading');
    });

    it('calls addScheduleItem when Add Schedule button is clicked with a non-empty activity', () => {
      renderHub();
      fireEvent.change(getActivityInput(), { target: { value: 'Breakfast' } });
      fireEvent.click(screen.getByRole('button', { name: /add schedule/i }));
      expect(mockAddScheduleItem).toHaveBeenCalledWith(
        expect.objectContaining({ activity: 'Breakfast' }),
      );
    });

    it('does not call addScheduleItem when activity is empty', () => {
      renderHub();
      fireEvent.click(screen.getByRole('button', { name: /add schedule/i }));
      expect(mockAddScheduleItem).not.toHaveBeenCalled();
    });

    it('clears the activity input after a successful add', () => {
      renderHub();
      fireEvent.change(getActivityInput(), { target: { value: 'Exercise' } });
      fireEvent.click(screen.getByRole('button', { name: /add schedule/i }));
      expect(getActivityInput().value).toBe('');
    });

    it('shows "No items in this schedule yet" when the list is empty', () => {
      renderHub();
      expect(screen.getByText(/no items in this schedule yet/i)).toBeInTheDocument();
    });

    it('schedule-time input has type="time"', () => {
      renderHub();
      expect(getTimeInput().type).toBe('time');
    });

    it('schedule-meridian select defaults to AM', () => {
      renderHub();
      expect(getMeridianSelect().value).toBe('AM');
    });

    it('schedule-meridian select can be changed to PM', () => {
      renderHub();
      fireEvent.change(getMeridianSelect(), { target: { value: 'PM' } });
      expect(getMeridianSelect().value).toBe('PM');
    });
  });

  // ── Chores tab — form field accessibility ─────────────────────────────────────
  describe('Chores tab — form field id/name attributes', () => {
    beforeEach(() => {
      renderHub();
      fireEvent.click(screen.getByRole('button', { name: /chores list/i }));
    });

    it('chore-name input has id="chore-name"', () => {
      expect(getChoreNameInput()).not.toBeNull();
      expect(getChoreNameInput().id).toBe('chore-name');
    });

    it('chore-name input has name="chore-name"', () => {
      expect(getChoreNameInput().name).toBe('chore-name');
    });

    it('chore-reward input has id="chore-reward"', () => {
      expect(getChoreRewardInput()).not.toBeNull();
      expect(getChoreRewardInput().id).toBe('chore-reward');
    });

    it('chore-reward input has name="chore-reward"', () => {
      expect(getChoreRewardInput().name).toBe('chore-reward');
    });

    it('New Chore label is present', () => {
      expect(screen.getByText('New Chore')).toBeInTheDocument();
    });

    it('Tokens Reward label is present', () => {
      expect(screen.getByText('Tokens Reward')).toBeInTheDocument();
    });

    it('chore-reward input has type="number"', () => {
      expect(getChoreRewardInput().type).toBe('number');
    });
  });

  // ── Chores tab — interaction ──────────────────────────────────────────────────
  describe('Chores tab — interaction', () => {
    beforeEach(() => {
      renderHub();
      fireEvent.click(screen.getByRole('button', { name: /chores list/i }));
    });

    it('calls addChore when Add Chore button is clicked with non-empty chore name', () => {
      fireEvent.change(getChoreNameInput(), { target: { value: 'Clean room' } });
      fireEvent.click(screen.getByRole('button', { name: /add chore/i }));
      expect(mockAddChore).toHaveBeenCalledWith(
        expect.objectContaining({ task: 'Clean room' }),
      );
    });

    it('does not call addChore when chore name is empty', () => {
      fireEvent.click(screen.getByRole('button', { name: /add chore/i }));
      expect(mockAddChore).not.toHaveBeenCalled();
    });

    it('clears the chore name input after successful add', () => {
      fireEvent.change(getChoreNameInput(), { target: { value: 'Walk the dog' } });
      fireEvent.click(screen.getByRole('button', { name: /add chore/i }));
      expect(getChoreNameInput().value).toBe('');
    });

    it('shows "No chores on the list!" when list is empty', () => {
      expect(screen.getByText(/no chores on the list/i)).toBeInTheDocument();
    });
  });

  // ── Goals tab — form field accessibility ──────────────────────────────────────
  describe('Goals tab — form field id/name attributes', () => {
    beforeEach(() => {
      renderHub();
      fireEvent.click(screen.getByRole('button', { name: /goals tracker/i }));
    });

    it('goal-text input has id="goal-text"', () => {
      expect(getGoalTextInput()).not.toBeNull();
      expect(getGoalTextInput().id).toBe('goal-text');
    });

    it('goal-text input has name="goal-text"', () => {
      expect(getGoalTextInput().name).toBe('goal-text');
    });

    it('goal-type select has id="goal-type"', () => {
      expect(getGoalTypeSelect()).not.toBeNull();
      expect(getGoalTypeSelect().id).toBe('goal-type');
    });

    it('goal-type select has name="goal-type"', () => {
      expect(getGoalTypeSelect().name).toBe('goal-type');
    });

    it('New Goal label is present', () => {
      expect(screen.getByText('New Goal')).toBeInTheDocument();
    });

    it('Type label is present', () => {
      expect(screen.getByText('Type')).toBeInTheDocument();
    });
  });

  // ── Goals tab — interaction ───────────────────────────────────────────────────
  describe('Goals tab — interaction', () => {
    beforeEach(() => {
      renderHub();
      fireEvent.click(screen.getByRole('button', { name: /goals tracker/i }));
    });

    it('calls addGoal when Set Goal button is clicked with non-empty goal text', () => {
      fireEvent.change(getGoalTextInput(), { target: { value: 'Read 10 books' } });
      fireEvent.click(screen.getByRole('button', { name: /set goal/i }));
      expect(mockAddGoal).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Read 10 books' }),
      );
    });

    it('does not call addGoal when goal text is empty', () => {
      fireEvent.click(screen.getByRole('button', { name: /set goal/i }));
      expect(mockAddGoal).not.toHaveBeenCalled();
    });

    it('clears the goal text input after successful add', () => {
      fireEvent.change(getGoalTextInput(), { target: { value: 'Learn piano' } });
      fireEvent.click(screen.getByRole('button', { name: /set goal/i }));
      expect(getGoalTextInput().value).toBe('');
    });

    it('goal-type select defaults to short-term', () => {
      expect(getGoalTypeSelect().value).toBe('short-term');
    });

    it('goal-type select can be changed to long-term', () => {
      fireEvent.change(getGoalTypeSelect(), { target: { value: 'long-term' } });
      expect(getGoalTypeSelect().value).toBe('long-term');
    });

    it('renders Short-term Goals and Long-term Goals headings', () => {
      expect(screen.getByText('Short-term Goals')).toBeInTheDocument();
      expect(screen.getByText('Long-term Goals')).toBeInTheDocument();
    });
  });

  // ── Tab navigation ────────────────────────────────────────────────────────────
  describe('Tab navigation', () => {
    it('switches to Chores tab and hides schedule activity input', () => {
      renderHub();
      fireEvent.click(screen.getByRole('button', { name: /chores list/i }));
      expect(getActivityInput()).toBeNull();
      expect(getChoreNameInput()).toBeInTheDocument();
    });

    it('switches to Goals tab and hides chore name input', () => {
      renderHub();
      fireEvent.click(screen.getByRole('button', { name: /goals tracker/i }));
      expect(getChoreNameInput()).toBeNull();
      expect(getGoalTextInput()).toBeInTheDocument();
    });

    it('returns to Schedules tab after switching away', () => {
      renderHub();
      fireEvent.click(screen.getByRole('button', { name: /chores list/i }));
      fireEvent.click(screen.getByRole('button', { name: /routines & schedules/i }));
      expect(getActivityInput()).toBeInTheDocument();
    });
  });
});
