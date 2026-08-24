import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import PerformanceMonitor from '../../components/PerformanceMonitor';

describe('PerformanceMonitor', () => {
  it('dismisses completely instead of leaving a floating hitbox over editor controls', () => {
    render(<PerformanceMonitor />);

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss performance monitor' }));

    expect(screen.queryByText('Performance Monitor')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Dismiss performance monitor' })
    ).not.toBeInTheDocument();
  });
});
