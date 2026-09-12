import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const breakdown = vi.hoisted(() => ({ breakDownTask: vi.fn() }));
vi.mock('../../../services/breakdownService', () => breakdown);
vi.mock('../../features/StudyTextTools', () => ({ default: () => <div data-testid="study-tools" /> }));

import TaskBreakdown from '../TaskBreakdown';

describe('TaskBreakdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows generated steps only for a successful breakdown result', async () => {
    breakdown.breakDownTask.mockResolvedValue({ status: 'success', steps: ['Read the prompt'] });

    render(<TaskBreakdown taskTitle="Essay" subject="English" />);

    expect(await screen.findByText('Read the prompt')).toBeInTheDocument();
    expect(screen.getByTestId('study-tools')).toBeInTheDocument();
  });

  it('shows the existing error state instead of fabricated steps when generation is unavailable', async () => {
    breakdown.breakDownTask.mockResolvedValue({
      status: 'unavailable',
      message: 'AI-generated steps are unavailable right now. Please try again.',
    });

    render(<TaskBreakdown taskTitle="Essay" subject="English" />);

    expect(await screen.findByText('AI-generated steps are unavailable right now. Please try again.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByTestId('study-tools')).not.toBeInTheDocument());
  });
});
