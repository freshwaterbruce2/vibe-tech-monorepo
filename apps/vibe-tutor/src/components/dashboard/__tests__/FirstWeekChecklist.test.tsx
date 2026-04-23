import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FirstWeekChecklist from '../FirstWeekChecklist';

describe('FirstWeekChecklist', () => {
  it('opens the add-homework flow directly from the checklist', () => {
    const onNavigate = vi.fn();

    render(
      <FirstWeekChecklist
        hasAvatar={true}
        welcomeTokensEarned={true}
        hasHomework={false}
        hasCompletedTask={false}
        hasVisitedShop={false}
        onNavigate={onNavigate}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /add homework/i }));

    expect(onNavigate).toHaveBeenCalledWith('dashboard', 'open-add-homework');
  });

  it('sends users to their task list when homework exists but none is complete yet', () => {
    const onNavigate = vi.fn();

    render(
      <FirstWeekChecklist
        hasAvatar={true}
        welcomeTokensEarned={true}
        hasHomework={true}
        hasCompletedTask={false}
        hasVisitedShop={false}
        onNavigate={onNavigate}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /open tasks/i }));

    expect(onNavigate).toHaveBeenCalledWith('dashboard');
  });
});
