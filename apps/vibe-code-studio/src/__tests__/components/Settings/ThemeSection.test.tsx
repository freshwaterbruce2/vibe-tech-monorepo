import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ThemeSection } from '../../../components/Settings/ThemeSection';
import { THEME_PRESETS } from '../../../services/theme/ThemeRegistry';

describe('ThemeSection', () => {
  it('renders every preset plus a custom option', () => {
    render(<ThemeSection value="one-dark-pro" onChange={vi.fn()} />);
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(THEME_PRESETS.length + 1);
    expect(screen.getByLabelText('Custom JSON theme')).toBeInTheDocument();
  });

  it('marks the active preset as selected', () => {
    render(<ThemeSection value="dracula" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Dracula theme')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Nord theme')).toHaveAttribute('aria-selected', 'false');
  });

  it('reports the chosen preset id', async () => {
    const onChange = vi.fn();
    render(<ThemeSection value="one-dark-pro" onChange={onChange} />);
    await userEvent.click(screen.getByLabelText('GitHub Light theme'));
    expect(onChange).toHaveBeenCalledWith('github-light');
  });

  it('reports "custom" when the custom card is chosen', async () => {
    const onChange = vi.fn();
    render(<ThemeSection value="dracula" onChange={onChange} />);
    await userEvent.click(screen.getByLabelText('Custom JSON theme'));
    expect(onChange).toHaveBeenCalledWith('custom');
  });

  it('marks the custom card selected when active', () => {
    render(<ThemeSection value="custom" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Custom JSON theme')).toHaveAttribute('aria-selected', 'true');
  });
});
