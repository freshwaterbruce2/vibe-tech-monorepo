import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import App from '@/App';

vi.mock('@/components/ui/toaster', () => ({ Toaster: () => null }));
vi.mock('@/pages/About', () => ({ default: () => null }));
vi.mock('@/pages/Blog', () => ({ default: () => null }));
vi.mock('@/pages/BlogEditor', () => ({ default: () => null }));
vi.mock('@/pages/public/BlogPostPage', () => ({ default: () => null }));
vi.mock('@/pages/Contact', () => ({ default: () => null }));
vi.mock('@/pages/Dashboard', () => ({ default: () => null }));
vi.mock('@/pages/FuturisticDemo', () => ({ default: () => null }));
vi.mock('@/pages/Index', () => ({ default: () => <div>Home route</div> }));
vi.mock('@/pages/NotFound', () => ({ default: () => null }));
vi.mock('@/pages/PalettePreview', () => ({ default: () => null }));
vi.mock('@/pages/Portfolio', () => ({ default: () => null }));
vi.mock('@/pages/Pricing', () => ({ default: () => null }));
vi.mock('@/pages/Privacy', () => ({ default: () => null }));
vi.mock('@/pages/ProjectDetail', () => ({ default: () => null }));
vi.mock('@/pages/Resources', () => ({ default: () => null }));
vi.mock('@/pages/Services', () => ({ default: () => null }));
vi.mock('@/pages/Terms', () => ({ default: () => null }));
vi.mock('@/pages/Tools', () => ({ default: () => null }));

describe('App', () => {
  it('mounts one persistent background above the route system', () => {
    window.history.pushState({}, '', '/');
    render(<App />);

    expect(screen.getByTestId('site-background')).toBeTruthy();
    expect(screen.getByText('Home route')).toBeTruthy();
  });
});
