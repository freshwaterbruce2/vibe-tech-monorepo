import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
vi.mock('../../../hooks/useGameAudio', () => ({
  useGameAudio: () => ({ playSound: vi.fn() }),
}));

import WordBuilderGame from '../WordBuilderGame';

describe('WordBuilderGame', () => {
  const defaultProps = {
    onEarnTokens: vi.fn(),
    onClose: vi.fn(),
  };

  it('renders without crashing', () => {
    const { container } = render(<WordBuilderGame {...defaultProps} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders with no props (all optional)', () => {
    const { container } = render(<WordBuilderGame />);
    expect(container.firstChild).toBeTruthy();
  });

  it('has interactive elements', () => {
    const { container } = render(<WordBuilderGame {...defaultProps} />);
    expect(container.querySelectorAll('button').length).toBeGreaterThan(0);
  });
});
