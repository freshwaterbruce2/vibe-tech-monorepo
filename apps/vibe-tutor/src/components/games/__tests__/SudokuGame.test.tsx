import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
vi.mock('../../../hooks/useGameAudio', () => ({
  useGameAudio: () => ({ playSound: vi.fn() }),
}));
vi.mock('sudoku-umd', () => ({
  default: {
    generate: () => '530070000600195000098000060800060003400803001700020006060000280000419005000080079',
    solve: () => '534678912672195348198342567859761423426853791713924856961537284287419635345286179',
  },
  generate: () => '530070000600195000098000060800060003400803001700020006060000280000419005000080079',
  solve: () => '534678912672195348198342567859761423426853791713924856961537284287419635345286179',
}));
vi.mock('../GameCompletionModal', () => ({
  default: () => null,
}));

import SudokuGame from '../SudokuGame';

describe('SudokuGame', () => {
  const defaultProps = {
    onComplete: vi.fn(),
    onBack: vi.fn(),
  };

  it('renders without crashing', () => {
    const { container } = render(<SudokuGame {...defaultProps} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders the game container', () => {
    const { container } = render(<SudokuGame {...defaultProps} />);
    // Sudoku renders either a grid or loading state
    expect(container.querySelector('div')).toBeTruthy();
  });
});
