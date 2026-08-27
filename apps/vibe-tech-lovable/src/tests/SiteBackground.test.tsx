import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SiteBackground } from '@/components/layout/SiteBackground';

describe('SiteBackground', () => {
  it('renders one decorative, noninteractive background system', () => {
    render(<SiteBackground />);

    const background = screen.getByTestId('site-background');
    expect(background.getAttribute('aria-hidden')).toBe('true');
    expect(background.classList.contains('site-background')).toBe(true);
    expect(background.querySelectorAll('canvas')).toHaveLength(0);
    expect(background.querySelectorAll('.site-background__signal')).toHaveLength(3);
  });
});
