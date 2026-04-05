import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
vi.mock('../../../hooks/useGameAudio', () => ({
  useGameAudio: () => ({ playSound: vi.fn() }),
}));
vi.mock('../../../utils/electronStore', () => ({
  appStore: { get: vi.fn(), set: vi.fn() },
}));
vi.mock('../useMathAdventureGame', () => ({
  useMathAdventureGame: (props: { onClose?: () => void }) => ({
    onClose: props.onClose ?? vi.fn(),
    tokensCollected: 0,
    encounters: [],
    activeAction: null,
    animationSpeed: 'normal',
    impactFlash: false,
    accuracy: 100,
    motionIntensity: 1,
    speedMph: 10,
    playerLift: 0,
    hasBoostCharge: true,
    upcomingMathGate: null,
    upcomingObstacle: null,
    moveLane: vi.fn(),
    selectLane: vi.fn(),
    triggerAction: vi.fn(),
    resetRun: vi.fn(),
    handlePlayfieldPointerDown: vi.fn(),
    handlePlayfieldPointerUp: vi.fn(),
    clearPlayfieldGesture: vi.fn(),
    playerLane: 1,
    runnerState: {
      remainingMs: 120000,
      hearts: 3,
      boostCharges: 2,
      score: 0,
      lastEvent: 'Get ready!',
      lane: 1,
      runDistance: 0,
      obstacles: [],
      gates: [],
      distance: 0,
      phase: 'playing',
      difficulty: 'easy',
      speed: 1,
    },
  }),
}));
vi.mock('../MathAdventureMobileControls', () => ({
  default: () => <div data-testid="mobile-controls" />,
}));
vi.mock('../MathAdventureSidebar', () => ({
  default: () => <div data-testid="sidebar" />,
}));
vi.mock('../mathAdventureUtils', () => ({
  formatTime: (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  },
  laneTop: () => '50%',
  LANE_LABELS: ['Top', 'Middle', 'Bottom'],
  WORLD_WIDTH: 800,
  PLAYER_X: 50,
}));

import MathAdventureGame from '../MathAdventureGame';

describe('MathAdventureGame', () => {
  const defaultProps = {
    onClose: vi.fn(),
    onEarnTokens: vi.fn(),
  };

  it('renders without crashing', () => {
    const { container } = render(<MathAdventureGame {...defaultProps} />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders with no props (all optional)', () => {
    const { container } = render(<MathAdventureGame />);
    expect(container.firstChild).toBeTruthy();
  });

  it('displays math runner heading', () => {
    const { container } = render(<MathAdventureGame {...defaultProps} />);
    expect(container.textContent).toContain('Math Runner');
  });
});
