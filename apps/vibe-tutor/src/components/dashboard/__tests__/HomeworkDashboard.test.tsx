import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import HomeworkDashboard from '../HomeworkDashboard';
import type { HomeworkItem } from '../../../types';

// Mock child components
vi.mock('../AddHomeworkModal', () => ({
  default: ({ onClose, onAdd }: any) => (
    <div data-testid="add-modal">
      <button onClick={() => onAdd({ subject: 'Math', title: 'Test', dueDate: '2026-01-25' })}>
        Add Item
      </button>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock('../BreakdownModal', () => ({
  default: ({ onClose }: any) => (
    <div data-testid="breakdown-modal">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

vi.mock('../NotificationPanel', () => ({
  default: ({ onClose }: any) => (
    <div data-testid="notification-panel">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

describe('HomeworkDashboard', () => {
  const mockHomeworkItems: HomeworkItem[] = [
    {
      id: '1',
      subject: 'Math',
      title: 'Algebra homework',
      dueDate: '2026-01-25',
      completed: false,
    },
    {
      id: '2',
      subject: 'Science',
      title: 'Lab report',
      dueDate: '2026-01-26',
      completed: false,
    },
    {
      id: '3',
      subject: 'History',
      title: 'Essay',
      dueDate: '2026-01-20',
      completed: true,
    },
  ];

  const mockProps = {
    items: mockHomeworkItems,
    onAdd: vi.fn(),
    onToggleComplete: vi.fn(),
    points: 150,
    tokens: 100,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders dashboard header correctly', () => {
      render(<HomeworkDashboard {...mockProps} />);

      expect(screen.getByText('Homework Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Stay on top of your tasks')).toBeInTheDocument();
    });

    it('displays active and completed items count', () => {
      render(<HomeworkDashboard {...mockProps} />);

      // 2 active items (not completed)
      const activeSection = screen.getByText('To Do').closest('section');
      expect(activeSection).not.toBeNull();
      if (activeSection) expect(within(activeSection).getByText('2')).toBeInTheDocument();

      // 1 completed item
      const completedSection = screen.getByText('Completed').closest('section');
      expect(completedSection).not.toBeNull();
      if (completedSection) expect(within(completedSection).getByText('1')).toBeInTheDocument();
    });

    it('shows empty state when no active assignments', () => {
      const completedOnlyItems = mockHomeworkItems.map(item => ({ ...item, completed: true }));

      render(<HomeworkDashboard {...{ ...mockProps, items: completedOnlyItems }} />);

      expect(screen.getByText('No active assignments!')).toBeInTheDocument();
      expect(screen.getByText("You're all caught up. Great job!")).toBeInTheDocument();
    });
  });

  describe('Add Homework Modal', () => {
    it('opens add modal when Add button is clicked', async () => {
      render(<HomeworkDashboard {...mockProps} />);

      const addButton = screen.getByRole('button', { name: /add/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByTestId('add-modal')).toBeInTheDocument();
      });
    });

    it('closes modal and adds homework when item is added', async () => {
      render(<HomeworkDashboard {...mockProps} />);

      const addButton = screen.getByRole('button', { name: /add/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByTestId('add-modal')).toBeInTheDocument();
      });

      const addItemButton = screen.getByText('Add Item');
      fireEvent.click(addItemButton);

      await waitFor(() => {
        expect(mockProps.onAdd).toHaveBeenCalledWith({
          subject: 'Math',
          title: 'Test',
          dueDate: '2026-01-25',
        });
        expect(screen.queryByTestId('add-modal')).not.toBeInTheDocument();
      });
    });

    it('opens add modal from onboarding action and clears the action once handled', async () => {
      const onOnboardingActionHandled = vi.fn();

      render(
        <HomeworkDashboard
          {...mockProps}
          onboardingAction="open-add-homework"
          onOnboardingActionHandled={onOnboardingActionHandled}
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId('add-modal')).toBeInTheDocument();
      });

      expect(onOnboardingActionHandled).toHaveBeenCalled();
    });

    it('opens task context from onboarding task-list action and clears it', async () => {
      const onOnboardingActionHandled = vi.fn();

      render(
        <HomeworkDashboard
          {...mockProps}
          onboardingAction="open-task-list"
          onOnboardingActionHandled={onOnboardingActionHandled}
        />,
      );

      await waitFor(() => {
        expect(screen.getByTestId('breakdown-modal')).toBeInTheDocument();
      });

      expect(onOnboardingActionHandled).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty items array', () => {
      render(<HomeworkDashboard {...{ ...mockProps, items: [] }} />);

      expect(screen.getByText('No active assignments!')).toBeInTheDocument();
      expect(screen.queryByText('Completed')).not.toBeInTheDocument();
    });

    it('handles all completed items', () => {
      const allCompleted = mockHomeworkItems.map(item => ({ ...item, completed: true }));

      render(<HomeworkDashboard {...{ ...mockProps, items: allCompleted }} />);

      expect(screen.getByText('No active assignments!')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });
  });
});
