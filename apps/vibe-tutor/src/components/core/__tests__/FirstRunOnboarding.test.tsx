import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import FirstRunOnboarding from '../FirstRunOnboarding';

describe('FirstRunOnboarding', () => {
  it('lets users go back from avatar selection to role selection', () => {
    render(<FirstRunOnboarding onComplete={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /i'm the kid/i }));

    expect(screen.getByText('Pick your avatar')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /back/i }));

    expect(screen.getByText("Who's using this app?")).toBeInTheDocument();
  });

  it('requires explicit confirmation after selecting an avatar', () => {
    render(<FirstRunOnboarding onComplete={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /i'm the kid/i }));

    const continueButton = screen.getByRole('button', { name: /continue/i });
    expect(continueButton).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /choose avatar 🐉 focus dragon/i }));

    expect(screen.getByText('Pick your avatar')).toBeInTheDocument();
    expect(continueButton).toBeEnabled();
  });

  it('prevents duplicate completion submissions while setup is saving', () => {
    const onComplete = vi.fn(
      async () => new Promise<void>(() => {
        // Intentionally unresolved to keep the component in a submitting state.
      }),
    );

    render(<FirstRunOnboarding onComplete={onComplete} />);

    fireEvent.click(screen.getByRole('button', { name: /i'm the kid/i }));
    fireEvent.click(screen.getByRole('button', { name: /choose avatar 🐉 focus dragon/i }));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    const startButton = screen.getByRole('button', { name: /start earning/i });

    fireEvent.click(startButton);
    fireEvent.click(startButton);

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
  });
});
