import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { LoadingScreen } from '../LoadingScreen';

describe('LoadingScreen', () => {
  it('renders the loading logo', () => {
    render(<LoadingScreen />);
    expect(screen.getByText('⚡ Vibe Code Studio')).toBeInTheDocument();
  });
});
