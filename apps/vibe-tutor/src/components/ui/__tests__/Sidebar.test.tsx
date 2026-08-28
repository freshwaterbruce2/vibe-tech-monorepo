import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Sidebar from '../Sidebar';

const defaultProps = {
  currentView: 'dashboard' as const,
  onNavigate: vi.fn(),
};

describe('Sidebar', () => {
  it('greets the user by name when userName is provided', () => {
    render(<Sidebar {...defaultProps} userName="Blake" />);

    const subtitles = screen.getAllByText((_, element) =>
      Boolean(element?.textContent?.includes('Blake')),
    );
    expect(subtitles.length).toBeGreaterThan(0);
  });

  it('falls back to the default greeting name when userName is not provided', () => {
    render(<Sidebar {...defaultProps} />);

    const subtitles = screen.getAllByText((_, element) =>
      Boolean(element?.textContent?.includes('Friend')),
    );
    expect(subtitles.length).toBeGreaterThan(0);
  });

  it('falls back to the default greeting name when userName is blank', () => {
    render(<Sidebar {...defaultProps} userName="   " />);

    const subtitles = screen.getAllByText((_, element) =>
      Boolean(element?.textContent?.includes('Friend')),
    );
    expect(subtitles.length).toBeGreaterThan(0);
  });
});
