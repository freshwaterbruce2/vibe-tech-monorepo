import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LoadingSpinner from '../src/components/ui/LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders without crashing', () => {
    const { container } = render(<LoadingSpinner />);
    expect(container.firstChild).toBeTruthy();
  });

  it('contains the spinner element with correct classes', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeTruthy();
    expect(spinner?.className).toContain('w-16');
    expect(spinner?.className).toContain('h-16');
    expect(spinner?.className).toContain('border-4');
  });
});
