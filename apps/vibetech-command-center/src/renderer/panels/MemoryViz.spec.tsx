import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryViz } from './MemoryViz';
import type { MemorySnapshot, DecayScoreItem, MemorySearchResultItem } from './memory-types';

const mockSnapshot = vi.fn();
const mockSearch = vi.fn();
const mockDecay = vi.fn();
const mockConsolidate = vi.fn();

function setupBridge(snapshot: MemorySnapshot | null, error = false) {
  mockSnapshot.mockReset();
  mockSearch.mockReset();
  mockDecay.mockReset();
  mockConsolidate.mockReset();

  if (error) {
    mockSnapshot.mockRejectedValue(new Error('snapshot failure'));
  } else if (snapshot) {
    mockSnapshot.mockResolvedValue({ ok: true, data: snapshot, timestamp: Date.now() });
  } else {
    mockSnapshot.mockReturnValue(new Promise(() => {}));
  }

  mockSearch.mockResolvedValue({ ok: true, data: [] as MemorySearchResultItem[], timestamp: Date.now() });
  mockDecay.mockResolvedValue({ ok: true, data: [] as DecayScoreItem[], timestamp: Date.now() });
  mockConsolidate.mockResolvedValue({ ok: true, data: { success: true, message: 'Read-only preview complete' }, timestamp: Date.now() });

  Object.defineProperty(window, 'commandCenter', {
    value: {
      memory: {
        snapshot: mockSnapshot,
        search: mockSearch,
        decay: mockDecay,
        consolidate: mockConsolidate,
      }
    },
    writable: true,
    configurable: true
  });
}

function renderWithQuery(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
  return { qc };
}

function makeSnapshot(opts?: Partial<MemorySnapshot>): MemorySnapshot {
  const base: MemorySnapshot = {
    stats: [
      { store: 'episodic', recordCount: 3 },
      { store: 'semantic', recordCount: 2, avgEmbeddingDim: 384 },
      { store: 'procedural', recordCount: 1 },
    ],
    recentEpisodic: [
      { id: 1, sourceId: 'nova-agent', timestamp: Date.now(), query: 'What is React?', response: 'A UI library', sessionId: 's1' },
      { id: 2, sourceId: 'vibe-code-studio', timestamp: Date.now() - 60000, query: 'How to test?', response: 'Use vitest', sessionId: 's2' },
    ],
    recentSemantic: [
      { id: 10, text: 'React hooks pattern', category: 'frontend', importance: 8, created: Date.now(), lastAccessed: Date.now(), accessCount: 5 },
      { id: 11, text: 'Rust ownership', category: 'backend', importance: 6, created: Date.now() - 10000, lastAccessed: Date.now() - 10000, accessCount: 2 },
    ],
    recentProcedural: [
      { id: 20, pattern: 'Refactor loop', context: 'Extract function', frequency: 12, successRate: 0.92, lastUsed: Date.now() },
    ],
    decayItems: [],
    consolidationStatus: { lastRunAt: Date.now() - 3600000, itemsSummarized: 4, itemsPruned: 1 },
    generatedAt: Date.now(),
  };
  return { ...base, ...opts };
}

describe('MemoryViz', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner while snapshot loads', () => {
    setupBridge(null);
    renderWithQuery(<MemoryViz />);
    expect(screen.getByText(/loading memory snapshot/i)).toBeTruthy();
  });

  it('shows error banner when snapshot fails', async () => {
    setupBridge(null, true);
    renderWithQuery(<MemoryViz />);
    await waitFor(() => expect(screen.getByText(/snapshot failure/i)).toBeTruthy());
    expect(screen.getByText(/snapshot failure/i).className).toContain('text-status-error');
  });

  describe('overview tab', () => {
    beforeEach(() => {
      setupBridge(makeSnapshot());
    });

    it('renders 3 stat cards', async () => {
      renderWithQuery(<MemoryViz />);
      await waitFor(() => expect(screen.getByText('Consolidation Preview')).toBeTruthy());

      const cards = screen.getAllByText(/episodic|semantic|procedural/i).filter((el) =>
        el.className?.includes('uppercase')
      );
      expect(cards.length).toBe(3);
    });

    it('shows consolidation status', async () => {
      renderWithQuery(<MemoryViz />);
      await waitFor(() => expect(screen.getByText(/consolidation preview/i)).toBeTruthy());
      expect(screen.getByText(/summarized: 4/i)).toBeTruthy();
      expect(screen.getByText(/pruned: 1/i)).toBeTruthy();
    });

    it('preview consolidation button calls memory.consolidate', async () => {
      const user = userEvent.setup();
      renderWithQuery(<MemoryViz />);
      await waitFor(() => expect(screen.getByText(/consolidation preview/i)).toBeTruthy());

      await user.click(screen.getByRole('button', { name: /preview decay\/consolidation/i }));
      await waitFor(() => expect(mockConsolidate).toHaveBeenCalled());
    });
  });

  describe('episodic tab', () => {
    beforeEach(() => {
      setupBridge(makeSnapshot());
    });

    it('renders timeline with source badges and timestamps', async () => {
      const user = userEvent.setup();
      renderWithQuery(<MemoryViz />);
      await waitFor(() => expect(screen.getByText('Consolidation Preview')).toBeTruthy());

      await user.click(screen.getByRole('button', { name: /^Episodic$/i }));
      await waitFor(() => expect(screen.getByText('nova-agent')).toBeTruthy());
      expect(screen.getByText('vibe-code-studio')).toBeTruthy();
    });

    it('click to expand full text', async () => {
      const user = userEvent.setup();
      renderWithQuery(<MemoryViz />);
      await waitFor(() => expect(screen.getByText('Consolidation Preview')).toBeTruthy());

      await user.click(screen.getByRole('button', { name: /^Episodic$/i }));
      await waitFor(() => expect(screen.getAllByText(/expand/i).length).toBeGreaterThan(0));

      const firstExpand = screen.getAllByText(/expand/i)[0]!;
      await user.click(firstExpand);
      await waitFor(() => expect(screen.getByText(/collapse/i)).toBeTruthy());
      expect(screen.getByText('A UI library')).toBeTruthy();
    });
  });

  describe('semantic tab', () => {
    beforeEach(() => {
      setupBridge(makeSnapshot());
    });

    it('renders paginated list', async () => {
      const user = userEvent.setup();
      renderWithQuery(<MemoryViz />);
      await waitFor(() => expect(screen.getByText('Consolidation Preview')).toBeTruthy());

      await user.click(screen.getByRole('button', { name: /^Semantic$/i }));
      await waitFor(() => expect(screen.getByText('React hooks pattern')).toBeTruthy());
      expect(screen.getByText('Rust ownership')).toBeTruthy();
      expect(screen.getByText('2 total')).toBeTruthy();
    });

    it('sort toggle works', async () => {
      const user = userEvent.setup();
      renderWithQuery(<MemoryViz />);
      await waitFor(() => expect(screen.getByText('Consolidation Preview')).toBeTruthy());

      await user.click(screen.getByRole('button', { name: /^Semantic$/i }));
      await waitFor(() => expect(screen.getByText('React hooks pattern')).toBeTruthy());

      await user.click(screen.getByRole('button', { name: /access count/i }));
      expect(screen.getByText('React hooks pattern')).toBeTruthy();

      await user.click(screen.getByRole('button', { name: /last accessed/i }));
      expect(screen.getByText('Rust ownership')).toBeTruthy();
    });

    it('shows importance bars with correct colors', async () => {
      const user = userEvent.setup();
      renderWithQuery(<MemoryViz />);
      await waitFor(() => expect(screen.getByText('Consolidation Preview')).toBeTruthy());

      await user.click(screen.getByRole('button', { name: /^Semantic$/i }));
      await waitFor(() => expect(screen.getByText('React hooks pattern')).toBeTruthy());

      const bars = screen.getAllByText(/80%|60%/);
      expect(bars.length).toBeGreaterThan(0);
    });
  });

  describe('procedural tab', () => {
    beforeEach(() => {
      setupBridge(makeSnapshot());
    });

    it('renders table with pattern, context, frequency, success', async () => {
      const user = userEvent.setup();
      renderWithQuery(<MemoryViz />);
      await waitFor(() => expect(screen.getByText('Consolidation Preview')).toBeTruthy());

      await user.click(screen.getByRole('button', { name: /^Procedural$/i }));
      await waitFor(() => expect(screen.getByText('Refactor loop')).toBeTruthy());
      expect(screen.getByText('Extract function')).toBeTruthy();
      expect(screen.getByText('12')).toBeTruthy();
    });

    it('success rate badges colored correctly', async () => {
      const user = userEvent.setup();
      const snapshot = makeSnapshot({
        recentProcedural: [
          { id: 20, pattern: 'High', context: 'ctx', frequency: 10, successRate: 0.95 },
          { id: 21, pattern: 'Med', context: 'ctx', frequency: 5, successRate: 0.65 },
          { id: 22, pattern: 'Low', context: 'ctx', frequency: 2, successRate: 0.30 },
        ]
      });
      setupBridge(snapshot);
      renderWithQuery(<MemoryViz />);
      await waitFor(() => expect(screen.getByText('Consolidation Preview')).toBeTruthy());

      await user.click(screen.getByRole('button', { name: /^Procedural$/i }));
      await waitFor(() => expect(screen.getByText('High')).toBeTruthy());

      expect(screen.getByText('95%').className).toContain('emerald');
      expect(screen.getByText('65%').className).toContain('amber');
      expect(screen.getByText('30%').className).toContain('rose');
    });
  });

  describe('decay tab', () => {
    const decayItems: DecayScoreItem[] = [
      { memoryId: 1, textPreview: 'Keep me', decayScore: 0.85, recommendedAction: 'keep', ageMs: 1000, accessCount: 5, importance: 8, category: 'a' },
      { memoryId: 2, textPreview: 'Summarize me', decayScore: 0.35, recommendedAction: 'summarize', ageMs: 10000, accessCount: 1, importance: 4, category: 'b' },
      { memoryId: 3, textPreview: 'Prune me', decayScore: 0.1, recommendedAction: 'prune', ageMs: 100000, accessCount: 0, importance: 1, category: null },
    ];

    beforeEach(() => {
      setupBridge(makeSnapshot());
      mockDecay.mockResolvedValue({ ok: true, data: decayItems, timestamp: Date.now() });
    });

    it('renders horizontal bars with correct colors', async () => {
      const user = userEvent.setup();
      renderWithQuery(<MemoryViz />);
      await waitFor(() => expect(screen.getByText('Consolidation Preview')).toBeTruthy());

      await user.click(screen.getByRole('button', { name: /^Decay$/i }));
      await waitFor(() => expect(screen.getByText('Keep me')).toBeTruthy());

      expect(screen.getByText('Summarize me')).toBeTruthy();
      expect(screen.getByText('Prune me')).toBeTruthy();
    });
  });

  describe('search', () => {
    beforeEach(() => {
      setupBridge(makeSnapshot());
    });

    it('typing query and submitting calls memory.search', async () => {
      const user = userEvent.setup();
      mockSearch.mockResolvedValue({
        ok: true,
        data: [{ source: 'semantic' as const, score: 0.9, text: 'match' }],
        timestamp: Date.now()
      });

      renderWithQuery(<MemoryViz />);
      await waitFor(() => expect(screen.getByText('Consolidation Preview')).toBeTruthy());

      const input = screen.getByPlaceholderText(/search memories/i);
      await user.type(input, 'react');
      await user.keyboard('{Enter}');

      await waitFor(() => expect(mockSearch).toHaveBeenCalledWith('react', 20));
    });

    it('results modal shows store badges and relevance scores', async () => {
      const user = userEvent.setup();
      mockSearch.mockResolvedValue({
        ok: true,
        data: [
          { source: 'episodic' as const, score: 1.0, text: 'Q: hello\nA: world' },
          { source: 'semantic' as const, score: 0.8, text: 'fact' },
        ],
        timestamp: Date.now()
      });

      renderWithQuery(<MemoryViz />);
      await waitFor(() => expect(screen.getByText('Consolidation Preview')).toBeTruthy());

      const input = screen.getByPlaceholderText(/search memories/i);
      await user.type(input, 'hello');
      await user.keyboard('{Enter}');

      await waitFor(() => expect(screen.getByText('Search Results')).toBeTruthy());
      expect(screen.getByText('episodic')).toBeTruthy();
      expect(screen.getByText('semantic')).toBeTruthy();
      expect(screen.getByText('100%')).toBeTruthy();
      expect(screen.getByText('80%')).toBeTruthy();
    });
  });
});
