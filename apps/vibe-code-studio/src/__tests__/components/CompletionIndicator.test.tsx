import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import CompletionIndicator, { CompletionStats } from '@/components/CompletionIndicator';

/**
 * Real behavioral tests for CompletionIndicator + CompletionStats.
 *
 * The component is a styled-components overlay. The outer Container is always
 * mounted; visibility is driven by the `$visible` styled prop which resolves to
 * `display: flex` (when `visible && isActive`) or `display: none`. The
 * `visible` state flips true via queueMicrotask once `hasCompletion` is true and
 * the indicator has not been dismissed.
 *
 * There is NO real keyboard event handling in the component — the Tab/Esc/Alt
 * hints are purely visual labels. So we assert the labels exist, but we do not
 * assert any keydown listener behavior that the component does not implement.
 */
/**
 * CompletionIndicator flips `visible` via queueMicrotask right after mount.
 * Rendering inside async act() flushes that microtask within act, keeping
 * React's "update not wrapped in act(...)" warning out of the test output.
 */
const renderInAct = async (ui: ReactElement) => {
  let result!: ReturnType<typeof render>;
  await act(async () => {
    result = render(ui);
  });
  return result;
};

describe('CompletionIndicator Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the static title and key hints', async () => {
      await renderInAct(
        <CompletionIndicator
          isActive={true}
          hasCompletion={true}
          model="moonshot/kimi-2.5-pro"
          strategy="fast"
        />
      );

      // Title text is split by the ModelBadge child, so match the text node.
      expect(screen.getByText('AI Completion Ready')).toBeInTheDocument();

      // Key hint labels and keys actually rendered by the component.
      expect(screen.getByText('Tab')).toBeInTheDocument();
      expect(screen.getByText('Esc')).toBeInTheDocument();
      expect(screen.getByText('Alt + ]')).toBeInTheDocument();
      expect(screen.getByText('to accept')).toBeInTheDocument();
      expect(screen.getByText('to dismiss')).toBeInTheDocument();
      expect(screen.getByText('for next')).toBeInTheDocument();
    });

    it('renders the dismiss close button with a title', async () => {
      await renderInAct(<CompletionIndicator isActive={true} hasCompletion={true} />);

      expect(screen.getByTitle('Dismiss')).toBeInTheDocument();
    });
  });

  describe('Visibility behavior', () => {
    it('becomes visible (display: flex) once hasCompletion is true and isActive', async () => {
      const { container } = await renderInAct(
        <CompletionIndicator isActive={true} hasCompletion={true} />
      );

      const outer = container.firstElementChild as HTMLElement;
      expect(outer).toBeTruthy();

      // visible flips via queueMicrotask -> styled prop resolves to flex.
      await waitFor(() => {
        expect(getComputedStyle(outer).display).toBe('flex');
      });
    });

    it('stays hidden (display: none) when there is no completion', async () => {
      const { container } = await renderInAct(
        <CompletionIndicator isActive={true} hasCompletion={false} />
      );

      const outer = container.firstElementChild as HTMLElement;

      // Give any microtask/effect a chance to run, then confirm it never shows.
      await act(async () => {
        await Promise.resolve();
      });
      expect(getComputedStyle(outer).display).toBe('none');
    });

    it('stays hidden when not active even if a completion is available', async () => {
      const { container } = await renderInAct(
        <CompletionIndicator isActive={false} hasCompletion={true} />
      );

      const outer = container.firstElementChild as HTMLElement;

      // visible may flip true, but `visible && isActive` is false -> none.
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(getComputedStyle(outer).display).toBe('none');
    });
  });

  describe('Model badge', () => {
    const cases: Array<[string, string]> = [
      ['claude-haiku-4.5', 'Haiku 4.5'],
      ['claude-sonnet-4.5', 'Sonnet 4.5'],
      ['deepseek-r1', 'DeepSeek'],
      ['moonshot/kimi-2.5-pro', 'AI'],
    ];

    it.each(cases)('maps model "%s" to badge label "%s"', async (model, expectedLabel) => {
      await renderInAct(<CompletionIndicator isActive={true} hasCompletion={true} model={model} />);

      expect(screen.getByText(expectedLabel)).toBeInTheDocument();
    });

    it('matches model name case-insensitively', async () => {
      await renderInAct(
        <CompletionIndicator isActive={true} hasCompletion={true} model="Claude-SONNET-Latest" />
      );

      expect(screen.getByText('Sonnet 4.5')).toBeInTheDocument();
    });

    it('defaults the badge to "AI" when no model prop is passed', async () => {
      // default prop is 'moonshot/kimi-2.5-pro' which maps to AI.
      await renderInAct(<CompletionIndicator isActive={true} hasCompletion={true} />);
      expect(screen.getByText('AI')).toBeInTheDocument();
    });
  });

  describe('Strategy description', () => {
    it('shows the fast-strategy description by default', async () => {
      await renderInAct(<CompletionIndicator isActive={true} hasCompletion={true} />);
      expect(screen.getByText('Using fast strategy for quick suggestions')).toBeInTheDocument();
    });

    it('shows the balanced-strategy description', async () => {
      await renderInAct(
        <CompletionIndicator isActive={true} hasCompletion={true} strategy="balanced" />
      );
      expect(screen.getByText('Using balanced strategy for quick suggestions')).toBeInTheDocument();
    });

    it('shows the accurate-strategy description', async () => {
      await renderInAct(
        <CompletionIndicator isActive={true} hasCompletion={true} strategy="accurate" />
      );
      expect(screen.getByText('Using accurate strategy for quick suggestions')).toBeInTheDocument();
    });

    it('shows the special adaptive description (not the generic template)', async () => {
      await renderInAct(
        <CompletionIndicator isActive={true} hasCompletion={true} strategy="adaptive" />
      );

      expect(screen.getByText('AI is choosing the best model for your code')).toBeInTheDocument();
      expect(
        screen.queryByText('Using adaptive strategy for quick suggestions')
      ).not.toBeInTheDocument();
    });
  });

  describe('Dismiss behavior', () => {
    it('calls onDismiss when the close button is clicked', async () => {
      const onDismiss = vi.fn();
      await renderInAct(
        <CompletionIndicator isActive={true} hasCompletion={true} onDismiss={onDismiss} />
      );

      fireEvent.click(screen.getByTitle('Dismiss'));
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('does not throw when dismissed without an onDismiss handler', async () => {
      await renderInAct(<CompletionIndicator isActive={true} hasCompletion={true} />);

      expect(() => fireEvent.click(screen.getByTitle('Dismiss'))).not.toThrow();
    });

    it('hides the indicator after dismiss', async () => {
      const { container } = await renderInAct(
        <CompletionIndicator isActive={true} hasCompletion={true} />
      );
      const outer = container.firstElementChild as HTMLElement;

      await waitFor(() => {
        expect(getComputedStyle(outer).display).toBe('flex');
      });

      fireEvent.click(screen.getByTitle('Dismiss'));

      await waitFor(() => {
        expect(getComputedStyle(outer).display).toBe('none');
      });
    });

    it('stays dismissed even when a new completion arrives', async () => {
      const { container, rerender } = await renderInAct(
        <CompletionIndicator isActive={true} hasCompletion={true} />
      );
      const outer = container.firstElementChild as HTMLElement;

      await waitFor(() => expect(getComputedStyle(outer).display).toBe('flex'));

      fireEvent.click(screen.getByTitle('Dismiss'));
      await waitFor(() => expect(getComputedStyle(outer).display).toBe('none'));

      // hasCompletion stays true, but dismissed gate keeps it hidden.
      rerender(<CompletionIndicator isActive={true} hasCompletion={true} />);

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(getComputedStyle(outer).display).toBe('none');
    });
  });
});

describe('CompletionStats Component', () => {
  it('renders all stat rows with provided values', () => {
    render(
      <CompletionStats
        totalSuggestions={40}
        accepted={30}
        rejected={10}
        avgLatency={123}
        currentModel="kimi-2.5-pro"
      />
    );

    expect(screen.getByText('Suggestions:')).toBeInTheDocument();
    expect(screen.getByText('40')).toBeInTheDocument();
    expect(screen.getByText('Avg Latency:')).toBeInTheDocument();
    expect(screen.getByText('123ms')).toBeInTheDocument();
    expect(screen.getByText('Model:')).toBeInTheDocument();
    expect(screen.getByText('kimi-2.5-pro')).toBeInTheDocument();
  });

  it('computes the accept rate as a rounded percentage', () => {
    render(
      <CompletionStats
        totalSuggestions={40}
        accepted={30}
        rejected={10}
        avgLatency={50}
        currentModel="ai"
      />
    );

    // 30/40 = 75%
    expect(screen.getByText('Accept Rate:')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('reports 0% accept rate when there are no suggestions (no divide-by-zero)', () => {
    render(
      <CompletionStats
        totalSuggestions={0}
        accepted={0}
        rejected={0}
        avgLatency={0}
        currentModel="ai"
      />
    );

    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('rounds a non-integer accept rate', () => {
    render(
      <CompletionStats
        totalSuggestions={3}
        accepted={1}
        rejected={2}
        avgLatency={0}
        currentModel="ai"
      />
    );

    // 1/3 = 33.33% -> rounded to 33%
    expect(screen.getByText('33%')).toBeInTheDocument();
  });
});
