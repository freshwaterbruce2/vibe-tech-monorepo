import { render, screen, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { describe, expect, it, vi } from 'vitest';
import PageLayout from '@/components/layout/PageLayout';

vi.mock('@/components/NavBar', () => ({ default: () => <nav>Navigation</nav> }));
vi.mock('@/components/Footer', () => ({ default: () => <footer>Footer</footer> }));

describe('PageLayout', () => {
  it('renders page chrome, content, and metadata without another background layer', async () => {
    render(
      <HelmetProvider>
        <PageLayout
          canonicalUrl="https://www.vibe-tech.org/example"
          description="Example description"
          keywords="example, test"
          title="Example"
        >
          <section>Page content</section>
        </PageLayout>
      </HelmetProvider>,
    );

    expect(screen.getByText('Navigation')).toBeTruthy();
    expect(screen.getByText('Page content')).toBeTruthy();
    expect(screen.getByText('Footer')).toBeTruthy();
    expect(screen.queryByTestId('site-background')).toBeNull();
    await waitFor(() => expect(document.title).toBe('Example | Vibe Tech'));
  });
});
