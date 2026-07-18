import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { VisualPanelShell } from '../../app/VisualPanelShell';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...rest }: { children?: React.ReactNode; style?: React.CSSProperties }) => (
      <div data-testid="motion" style={rest.style}>
        {children}
      </div>
    ),
  },
}));

describe('VisualPanelShell', () => {
  it('renders children in side variant', () => {
    render(
      <VisualPanelShell componentName="Side" onClose={() => undefined} motionVariant="side">
        <div data-testid="child">side</div>
      </VisualPanelShell>
    );
    expect(screen.getByTestId('child')).toHaveTextContent('side');
    expect(screen.getByTestId('motion').style.width).toBe('450px');
  });

  it('renders children in fullscreen variant', () => {
    render(
      <VisualPanelShell componentName="Full" onClose={() => undefined} motionVariant="fullscreen">
        <div data-testid="child">full</div>
      </VisualPanelShell>
    );
    expect(screen.getByTestId('child')).toHaveTextContent('full');
    expect(screen.getByTestId('motion').style.zIndex).toBe('200');
  });
});
