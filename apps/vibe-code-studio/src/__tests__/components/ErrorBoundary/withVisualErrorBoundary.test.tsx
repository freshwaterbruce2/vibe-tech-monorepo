import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { withVisualErrorBoundary } from '../../../components/ErrorBoundary/withVisualErrorBoundary';

describe('withVisualErrorBoundary', () => {
  it('renders the wrapped component', () => {
    const Inner = ({ label }: { label: string }) => <div data-testid="inner">{label}</div>;
    const Wrapped = withVisualErrorBoundary(Inner, 'TestPanel');
    render(<Wrapped label="hi" />);
    expect(screen.getByTestId('inner')).toHaveTextContent('hi');
  });

  it('forwards onClose to the boundary', () => {
    const onClose = vi.fn();
    const Inner = () => <div data-testid="inner2">ok</div>;
    const Wrapped = withVisualErrorBoundary(Inner, 'Panel2', onClose);
    render(<Wrapped />);
    expect(screen.getByTestId('inner2')).toBeInTheDocument();
  });
});
