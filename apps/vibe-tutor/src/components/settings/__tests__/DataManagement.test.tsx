import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../services/dataStore', () => ({ dataStore: {} }));

import DataManagement from '../DataManagement';

describe('DataManagement — privacy policy (Play 13+)', () => {
  it('exposes an expandable privacy policy reachable from settings', () => {
    render(<DataManagement />);

    // Collapsed by default.
    expect(screen.queryByRole('region', { name: /privacy policy/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /privacy policy/i }));

    const policy = screen.getByRole('region', { name: /privacy policy/i });
    expect(policy).toBeInTheDocument();
    // Key 13+ / data-handling statements are present.
    expect(screen.getByText(/13 and older/i)).toBeInTheDocument();
    expect(screen.getByText(/does not sell your data/i)).toBeInTheDocument();
  });
});
