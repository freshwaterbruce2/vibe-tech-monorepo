/**
 * BrainGymHub — additional coverage
 *
 * GamesHub.test.tsx covers: onClose callback, game lock/unlock, featured drill,
 * and game-completion rewards.  These tests cover the remaining surface:
 *   • Hub render + stats grid
 *   • Sky-blue color token (#38BDF8) presence, no pink/fuchsia hex codes
 *   • Zone filter button interactions
 *   • Avatar profile / shop navigation
 *   • Daily Goal panel (inside featured section)
 *   • "Brain Gym" heading and subtitle render
 */
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/* ---------- Hoisted mocks (must be before any import of the module under test) ---------- */
const mocks = vi.hoisted(() => ({
  storeDelete: vi.fn(),
  storeGet: vi.fn(),
  storeRemove: vi.fn(),
  storeSet: vi.fn(),
}));

vi.mock('../../../services/tokenService', () => ({
  TOKEN_REWARDS: {
    GAME_PERFECT: 25,
    SEVEN_DAY_STREAK: 75,
    THIRTY_DAY_STREAK: 200,
    THREE_DAY_STREAK: 30,
  },
}));

vi.mock('../../../utils/electronStore', () => ({
  appStore: {
    delete: mocks.storeDelete,
    get: mocks.storeGet,
    remove: mocks.storeRemove,
    set: mocks.storeSet,
  },
}));

/* Lazy game / avatar component mocks */
vi.mock('../MemoryMatchGame', () => ({
  default: () => <div data-testid="memory-game" />,
}));
vi.mock('../WordSearchGame', () => ({ default: () => <div data-testid="wordsearch-game" /> }));
vi.mock('../AnagramsGame', () => ({ default: () => <div data-testid="anagrams-game" /> }));
vi.mock('../CrosswordGame', () => ({ default: () => <div data-testid="crossword-game" /> }));
vi.mock('../MathAdventureGame', () => ({ default: () => <div data-testid="math-game" /> }));
vi.mock('../WordBuilderGame', () => ({ default: () => <div data-testid="wordbuilder-game" /> }));
vi.mock('../SudokuGame', () => ({ default: () => <div data-testid="sudoku-game" /> }));
vi.mock('../PatternQuestGame', () => ({ default: () => <div data-testid="pattern-game" /> }));
vi.mock('../MusicNotesGame', () => ({ default: () => <div data-testid="musicnotes-game" /> }));

vi.mock('../../avatar/AvatarProfile', () => ({
  default: ({ onOpenShop }: { onOpenShop?: () => void }) => (
    <div data-testid="avatar-profile">
      <button onClick={() => onOpenShop?.()}>Open Shop</button>
    </div>
  ),
}));
vi.mock('../../avatar/AvatarShopUnified', () => ({
  AvatarShopUnified: () => <div data-testid="avatar-shop" />,
}));

/* Import after all vi.mock() calls */
import BrainGymHub from '../BrainGymHub';
import { ZONE_ORDER, ZONE_CONFIG } from '../brainGymConstants';

/* ---------- Helpers ---------- */
const defaultProps = {
  userTokens: 42,
  onEarnTokens: vi.fn(),
  onClose: vi.fn(),
};

function renderHub(overrides: Partial<typeof defaultProps> = {}) {
  return render(<BrainGymHub {...defaultProps} {...overrides} />);
}

/* ---------- Tests ---------- */
describe('BrainGymHub — hub view', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.storeGet.mockReset();
    mocks.storeGet.mockReturnValue(null);
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  /* ------------------------------------------------------------------ */
  describe('basic render', () => {
    it('renders without crashing', () => {
      expect(() => renderHub()).not.toThrow();
    });

    it('displays the "Brain Gym" heading', () => {
      renderHub();
      expect(screen.getByRole('heading', { name: /brain gym/i })).toBeInTheDocument();
    });

    it('displays the "Synapse Station" subtitle', () => {
      renderHub();
      expect(screen.getByText(/synapse station/i)).toBeInTheDocument();
    });
  });

  /* ------------------------------------------------------------------ */
  describe('stats grid', () => {
    it('renders all four stat boxes', () => {
      renderHub();
      // Labels that always appear in the hub stats grid
      expect(screen.getByText('Synapses')).toBeInTheDocument();
      expect(screen.getByText('Cognitive Fitness')).toBeInTheDocument();
      expect(screen.getByText('Neural Link')).toBeInTheDocument();
      expect(screen.getByText('Data Cache')).toBeInTheDocument();
    });

    it('displays the userTokens value in the Synapses stat', () => {
      renderHub({ userTokens: 77 });
      const synapsesLabel = screen.getByText('Synapses');
      // Value is the sibling element rendered just before the label
      const statBox = synapsesLabel.closest('.gh-stat-box');
      expect(statBox).not.toBeNull();
      expect(within(statBox as HTMLElement).getByText('77')).toBeInTheDocument();
    });

    it('displays chest progress as X/5 in the Data Cache stat', () => {
      renderHub();
      // Default stats have chestProgress = 0
      expect(screen.getByText('0/5')).toBeInTheDocument();
    });

    it('Data Cache stat box carries the sky-blue color (#38BDF8) as a CSS custom property', () => {
      renderHub();
      const dataCacheLabel = screen.getByText('Data Cache');
      const statBox = dataCacheLabel.closest('.gh-stat-box');
      expect(statBox).not.toBeNull();
      // The inline style sets --stat-accent to the sky-blue token
      const style = (statBox as HTMLElement).getAttribute('style') ?? '';
      expect(style.toLowerCase()).toContain('#38bdf8');
    });
  });

  /* ------------------------------------------------------------------ */
  describe('color tokens — no legacy pink/fuchsia', () => {
    it('does not render any hardcoded pink hex (#EC4899 or #F472B6) in the hub', () => {
      const { container } = renderHub();
      const html = container.innerHTML;
      expect(html).not.toMatch(/#ec4899/i);
      expect(html).not.toMatch(/#f472b6/i);
    });

    it('does not render any hardcoded fuchsia hex (#D946EF or #E879F9) in the hub', () => {
      const { container } = renderHub();
      const html = container.innerHTML;
      expect(html).not.toMatch(/#d946ef/i);
      expect(html).not.toMatch(/#e879f9/i);
    });

    it('uses the sky-blue token (#38BDF8) somewhere in the rendered hub', () => {
      const { container } = renderHub();
      expect(container.innerHTML.toLowerCase()).toContain('#38bdf8');
    });
  });

  /* ------------------------------------------------------------------ */
  describe('zone filter buttons', () => {
    it('renders the "All Zones" filter button', () => {
      renderHub();
      expect(screen.getByRole('button', { name: /all zones/i })).toBeInTheDocument();
    });

    it('renders a filter button for each zone in ZONE_ORDER', () => {
      renderHub();
      // The filter bar renders one button per zone inside the gh-filters container.
      // Zone names also appear elsewhere (featured pill, zone sections), so we query
      // within the filter container using className to avoid false multiple-element errors.
      const filterContainer = document.querySelector('.gh-filters');
      expect(filterContainer).not.toBeNull();
      for (const zone of ZONE_ORDER) {
        const cfg = ZONE_CONFIG[zone];
        // Find buttons whose text content contains the zone label within gh-filters
        const btns = within(filterContainer as HTMLElement)
          .getAllByRole('button')
          .filter((btn) => btn.textContent?.includes(cfg.label));
        expect(btns.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('clicking a zone filter button does not throw', () => {
      renderHub();
      const focusBtn = screen.getByRole('button', { name: /focus zone/i });
      expect(() => fireEvent.click(focusBtn)).not.toThrow();
    });

    it('clicking a zone filter and back to "All Zones" still shows all zone sections', () => {
      renderHub();
      // Click Focus Zone filter (inside gh-filters container to be specific)
      const filterContainer = document.querySelector('.gh-filters') as HTMLElement;
      const focusBtn = within(filterContainer)
        .getAllByRole('button')
        .find((btn) => btn.textContent?.includes('Focus Zone'));
      expect(focusBtn).toBeDefined();
      fireEvent.click(focusBtn!);

      const allZonesBtn = within(filterContainer)
        .getAllByRole('button')
        .find((btn) => btn.textContent?.includes('All Zones'));
      expect(allZonesBtn).toBeDefined();
      fireEvent.click(allZonesBtn!);

      // Zone section headings live inside .gh-zone-title elements
      const zoneTitles = document.querySelectorAll('.gh-zone-title');
      const titleTexts = Array.from(zoneTitles).map((el) => el.textContent ?? '');
      expect(titleTexts.some((t) => /chill zone/i.test(t))).toBe(true);
      expect(titleTexts.some((t) => /focus zone/i.test(t))).toBe(true);
      expect(titleTexts.some((t) => /challenge zone/i.test(t))).toBe(true);
    });
  });

  /* ------------------------------------------------------------------ */
  describe('zone sections', () => {
    it('renders zone section headings for chill, focus, and challenge', () => {
      renderHub();
      // Zone section headings live in .gh-zone-title elements (not filter buttons)
      const zoneTitles = document.querySelectorAll('.gh-zone-title');
      const titleTexts = Array.from(zoneTitles).map((el) => el.textContent ?? '');
      expect(titleTexts.some((t) => /chill zone/i.test(t))).toBe(true);
      expect(titleTexts.some((t) => /focus zone/i.test(t))).toBe(true);
      expect(titleTexts.some((t) => /challenge zone/i.test(t))).toBe(true);
    });

    it('shows game count per zone', () => {
      renderHub();
      // Each zone section should display "<n> games"
      const gameCountTexts = screen.getAllByText(/\d+ games/i);
      expect(gameCountTexts.length).toBeGreaterThanOrEqual(3);
    });
  });

  /* ------------------------------------------------------------------ */
  describe('avatar navigation', () => {
    it('renders the "My Avatar" button in the hub header', () => {
      renderHub();
      expect(screen.getByRole('button', { name: /my avatar/i })).toBeInTheDocument();
    });

    it('clicking "My Avatar" shows the AvatarProfile screen', async () => {
      renderHub();
      fireEvent.click(screen.getByRole('button', { name: /my avatar/i }));
      await act(async () => {
        await vi.dynamicImportSettled();
      });
      expect(screen.getByTestId('avatar-profile')).toBeInTheDocument();
    });

    it('AvatarProfile screen has a "Back to Hub" button', async () => {
      renderHub();
      fireEvent.click(screen.getByRole('button', { name: /my avatar/i }));
      await act(async () => {
        await vi.dynamicImportSettled();
      });
      expect(screen.getByRole('button', { name: /back to hub/i })).toBeInTheDocument();
    });

    it('clicking "Back to Hub" from profile returns to the hub', async () => {
      renderHub();
      fireEvent.click(screen.getByRole('button', { name: /my avatar/i }));
      await act(async () => {
        await vi.dynamicImportSettled();
      });
      fireEvent.click(screen.getByRole('button', { name: /back to hub/i }));
      expect(screen.getByRole('heading', { name: /brain gym/i })).toBeInTheDocument();
    });

    it('clicking "Open Shop" from AvatarProfile navigates to AvatarShop', async () => {
      renderHub();
      fireEvent.click(screen.getByRole('button', { name: /my avatar/i }));
      await act(async () => {
        await vi.dynamicImportSettled();
      });
      fireEvent.click(screen.getByRole('button', { name: /open shop/i }));
      await act(async () => {
        await vi.dynamicImportSettled();
      });
      expect(screen.getByTestId('avatar-shop')).toBeInTheDocument();
    });

    it('AvatarShop screen has a "Back to Profile" button', async () => {
      renderHub();
      fireEvent.click(screen.getByRole('button', { name: /my avatar/i }));
      await act(async () => {
        await vi.dynamicImportSettled();
      });
      fireEvent.click(screen.getByRole('button', { name: /open shop/i }));
      await act(async () => {
        await vi.dynamicImportSettled();
      });
      expect(screen.getByRole('button', { name: /back to profile/i })).toBeInTheDocument();
    });
  });

  /* ------------------------------------------------------------------ */
  describe('daily goal panel (inside featured section)', () => {
    it('shows "Daily Goal" label in the featured drill panel', () => {
      renderHub();
      // featuredRecommendation is always present on a fresh state
      expect(screen.getByText(/daily goal/i)).toBeInTheDocument();
    });

    it('shows "Total Runs" label in the featured drill panel', () => {
      renderHub();
      expect(screen.getByText(/total runs/i)).toBeInTheDocument();
    });

    it('shows "Next Unlock" label in the featured drill panel', () => {
      renderHub();
      expect(screen.getByText(/next unlock/i)).toBeInTheDocument();
    });
  });

  /* ------------------------------------------------------------------ */
  describe('game cards accessibility', () => {
    it('playable game cards have descriptive aria-labels starting with "Play"', () => {
      renderHub();
      // At level 0 several games are unlocked; all should have aria-label="Play <name>"
      const playButtons = screen
        .getAllByRole('button')
        .filter((btn) => btn.getAttribute('aria-label')?.startsWith('Play '));
      expect(playButtons.length).toBeGreaterThan(0);
    });

    it('locked game cards are disabled and have aria-labels mentioning the unlock level', () => {
      // Default stats → level 0, so Crossword (minLevel 1) and Pattern Quest (minLevel 2) are locked
      renderHub();
      const lockedButtons = screen
        .getAllByRole('button')
        .filter((btn) => btn.getAttribute('aria-label')?.includes('unlock at Level'));
      expect(lockedButtons.length).toBeGreaterThan(0);
      lockedButtons.forEach((btn) => {
        expect(btn).toBeDisabled();
      });
    });
  });

  /* ------------------------------------------------------------------ */
  describe('xp / level display', () => {
    it('renders the XP progress section', () => {
      renderHub();
      // xp label shows "X / 100 Cognitive Load" at default stats (xp = 0)
      expect(screen.getByText(/cognitive load/i)).toBeInTheDocument();
    });

    it('shows correct next-level label ("Fitness 1") at default level 0', () => {
      renderHub();
      // The XP section renders "Fitness {level + 1}" in a span inside .gh-xp-labels.
      // We query within that container to avoid conflicts with other text.
      const xpLabels = document.querySelector('.gh-xp-labels');
      expect(xpLabels).not.toBeNull();
      expect(xpLabels!.textContent).toMatch(/fitness\s*1/i);
    });
  });
});
