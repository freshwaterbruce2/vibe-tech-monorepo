import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ErrorBoundaryExamples } from '../../../components/ErrorBoundary/ErrorBoundaryExamples';

describe('ErrorBoundaryExamples', () => {
  it('renders examples and reset control', () => {
    render(<ErrorBoundaryExamples />);
    expect(screen.getByText(/Error Boundary Examples/i)).toBeInTheDocument();
    const reset = screen.getByRole('button', { name: /Reset All Error Boundaries/i });
    fireEvent.click(reset);
    expect(reset).toBeInTheDocument();
  });
});
