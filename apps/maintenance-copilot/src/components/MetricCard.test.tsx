// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricCard } from './MetricCard';

describe('MetricCard', () => {
  it('renders value + label with the default ok tone', () => {
    const { container } = render(<MetricCard label="Packages" value={83} />);
    expect(screen.getByText('83')).toBeInTheDocument();
    expect(screen.getByText('Packages')).toBeInTheDocument();
    expect(container.querySelector('.metric')?.className).toContain('ok');
  });

  it('applies danger and warn tones', () => {
    const { container, rerender } = render(<MetricCard label="x" value={1} tone="danger" />);
    expect(container.querySelector('.metric')?.className).toContain('danger');
    rerender(<MetricCard label="x" value={1} tone="warn" />);
    expect(container.querySelector('.metric')?.className).toContain('warnText');
  });

  it('renders an optional hint only when provided', () => {
    const { rerender } = render(<MetricCard label="x" value={1} hint="extra detail" />);
    expect(screen.getByText('extra detail')).toBeInTheDocument();
    rerender(<MetricCard label="x" value={1} />);
    expect(screen.queryByText('extra detail')).toBeNull();
  });
});
