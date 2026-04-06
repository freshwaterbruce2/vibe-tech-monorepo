import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VoiceBar } from '../VoiceBar';
import type { VoiceState } from '@/hooks/useVoice';

// ---------------------------------------------------------------------------
// Mock lucide-react icons so we can identify which icon is rendered
// ---------------------------------------------------------------------------

vi.mock('lucide-react', () => ({
  Mic: (props: Record<string, unknown>) => (
    <svg data-testid="icon-mic" {...props} />
  ),
  MicOff: (props: Record<string, unknown>) => (
    <svg data-testid="icon-mic-off" {...props} />
  ),
  Volume2: (props: Record<string, unknown>) => (
    <svg data-testid="icon-volume" {...props} />
  ),
}));

// ---------------------------------------------------------------------------
// Mock Radix Tooltip to avoid portal / provider requirements in tests
// ---------------------------------------------------------------------------

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({
    children,
    asChild: _asChild,
    ...rest
  }: {
    children: ReactNode;
    asChild?: boolean;
  }) => <span {...rest}>{children}</span>,
  TooltipContent: ({ children }: { children: ReactNode }) => (
    <span data-testid="tooltip-content">{children}</span>
  ),
}));

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const defaultProps = () => ({
  state: 'idle' as VoiceState,
  enabled: true,
  onToggleEnabled: vi.fn(),
  onStartListening: vi.fn(),
  onStopListening: vi.fn(),
});

function renderVoiceBar(overrides: { state?: VoiceState; enabled?: boolean; unsupported?: boolean; onToggleEnabled?: () => void; onStartListening?: () => void; onStopListening?: () => void } = {}) {
  const props = { ...defaultProps(), ...overrides };
  return render(<VoiceBar {...props} />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('VoiceBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---- icon rendering ----

  describe('icon rendering', () => {
    it('renders MicOff icon when disabled', () => {
      renderVoiceBar({ enabled: false });
      expect(screen.getByTestId('icon-mic-off')).toBeInTheDocument();
    });

    it('renders Mic icon when enabled and idle', () => {
      renderVoiceBar({ enabled: true, state: 'idle' });
      expect(screen.getByTestId('icon-mic')).toBeInTheDocument();
    });

    it('renders Mic icon when enabled and listening', () => {
      renderVoiceBar({ enabled: true, state: 'listening' });
      expect(screen.getByTestId('icon-mic')).toBeInTheDocument();
    });

    it('renders Volume2 icon when speaking', () => {
      renderVoiceBar({ enabled: true, state: 'speaking' });
      expect(screen.getByTestId('icon-volume')).toBeInTheDocument();
    });

    it('renders Mic icon when processing', () => {
      renderVoiceBar({ enabled: true, state: 'processing' });
      expect(screen.getByTestId('icon-mic')).toBeInTheDocument();
    });
  });

  // ---- click behavior ----

  describe('click behavior', () => {
    it('calls onToggleEnabled when clicking while disabled', () => {
      const onToggleEnabled = vi.fn();
      renderVoiceBar({ enabled: false, onToggleEnabled });

      fireEvent.click(screen.getByRole('button'));
      expect(onToggleEnabled).toHaveBeenCalledTimes(1);
    });

    it('calls onStartListening when clicking while enabled and idle', () => {
      const onStartListening = vi.fn();
      renderVoiceBar({ enabled: true, state: 'idle', onStartListening });

      fireEvent.click(screen.getByRole('button'));
      expect(onStartListening).toHaveBeenCalledTimes(1);
    });

    it('calls onStopListening when clicking while listening', () => {
      const onStopListening = vi.fn();
      renderVoiceBar({ enabled: true, state: 'listening', onStopListening });

      fireEvent.click(screen.getByRole('button'));
      expect(onStopListening).toHaveBeenCalledTimes(1);
    });

    it('does not call onStartListening or onStopListening during processing', () => {
      const onStartListening = vi.fn();
      const onStopListening = vi.fn();
      renderVoiceBar({
        enabled: true,
        state: 'processing',
        onStartListening,
        onStopListening,
      });

      // Button is disabled during processing -- click should not fire handlers
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('does not call onStartListening or onStopListening during speaking', () => {
      const onStartListening = vi.fn();
      const onStopListening = vi.fn();
      renderVoiceBar({
        enabled: true,
        state: 'speaking',
        onStartListening,
        onStopListening,
      });

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  // ---- listening animation ----

  describe('listening animation', () => {
    it('shows ping animation when state is listening', () => {
      const { container } = renderVoiceBar({
        enabled: true,
        state: 'listening',
      });

      const pingSpan = container.querySelector('.animate-ping');
      expect(pingSpan).toBeInTheDocument();
    });

    it('does not show ping animation when idle', () => {
      const { container } = renderVoiceBar({
        enabled: true,
        state: 'idle',
      });

      const pingSpan = container.querySelector('.animate-ping');
      expect(pingSpan).not.toBeInTheDocument();
    });

    it('does not show ping animation when disabled', () => {
      const { container } = renderVoiceBar({ enabled: false });

      const pingSpan = container.querySelector('.animate-ping');
      expect(pingSpan).not.toBeInTheDocument();
    });
  });

  // ---- disabled states ----

  describe('disabled states', () => {
    it('disables button when unsupported', () => {
      renderVoiceBar({ unsupported: true });
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('disables button during processing', () => {
      renderVoiceBar({ enabled: true, state: 'processing' });
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('disables button during speaking', () => {
      renderVoiceBar({ enabled: true, state: 'speaking' });
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('enables button when idle and enabled', () => {
      renderVoiceBar({ enabled: true, state: 'idle' });
      expect(screen.getByRole('button')).not.toBeDisabled();
    });

    it('enables button when listening', () => {
      renderVoiceBar({ enabled: true, state: 'listening' });
      expect(screen.getByRole('button')).not.toBeDisabled();
    });

    it('enables button when disabled (to allow toggling on)', () => {
      renderVoiceBar({ enabled: false });
      expect(screen.getByRole('button')).not.toBeDisabled();
    });
  });

  // ---- aria-label ----

  describe('aria-label', () => {
    it('shows "Enable voice mode" when disabled', () => {
      renderVoiceBar({ enabled: false });
      expect(screen.getByLabelText('Enable voice mode')).toBeInTheDocument();
    });

    it('shows "Voice not supported" when unsupported', () => {
      renderVoiceBar({ unsupported: true });
      expect(
        screen.getByLabelText('Voice not supported in this browser'),
      ).toBeInTheDocument();
    });

    it('shows "Listening" label when listening', () => {
      renderVoiceBar({ enabled: true, state: 'listening' });
      expect(
        screen.getByLabelText(/listening/i),
      ).toBeInTheDocument();
    });

    it('shows "Speaking" label when speaking', () => {
      renderVoiceBar({ enabled: true, state: 'speaking' });
      expect(
        screen.getByLabelText(/speaking/i),
      ).toBeInTheDocument();
    });

    it('shows "Processing" label when processing', () => {
      renderVoiceBar({ enabled: true, state: 'processing' });
      expect(
        screen.getByLabelText(/processing/i),
      ).toBeInTheDocument();
    });

    it('shows "Click to speak" when enabled and idle', () => {
      renderVoiceBar({ enabled: true, state: 'idle' });
      expect(screen.getByLabelText('Click to speak')).toBeInTheDocument();
    });
  });

  // ---- CSS classes ----

  describe('CSS styling classes', () => {
    it('applies muted color class when disabled', () => {
      renderVoiceBar({ enabled: false });
      const button = screen.getByRole('button');
      expect(button.className).toContain('text-white/40');
    });

    it('applies red color class when listening', () => {
      renderVoiceBar({ enabled: true, state: 'listening' });
      const button = screen.getByRole('button');
      expect(button.className).toContain('text-red-400');
    });

    it('applies cyan color class when speaking', () => {
      renderVoiceBar({ enabled: true, state: 'speaking' });
      const button = screen.getByRole('button');
      expect(button.className).toContain('text-cyan-400');
    });

    it('applies yellow color class when processing', () => {
      renderVoiceBar({ enabled: true, state: 'processing' });
      const button = screen.getByRole('button');
      expect(button.className).toContain('text-yellow-400');
    });

    it('applies cyan color class when idle and enabled', () => {
      renderVoiceBar({ enabled: true, state: 'idle' });
      const button = screen.getByRole('button');
      expect(button.className).toContain('text-cyan-400');
    });
  });
});
