import { Suspense } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { withLazyLoading } from '../../components/withLazyLoading';

vi.mock('../../components/LazyComponents', () => ({
  LoadingFallback: ({ message }: { message?: string }) => (
    <div data-testid="loading">{message ?? 'loading'}</div>
  ),
}));

describe('withLazyLoading', () => {
  it('loads a default export module', async () => {
    const importFn = vi.fn().mockResolvedValue({
      default: () => <div data-testid="def">default</div>,
    });
    const Lazy = withLazyLoading(importFn, 'default', 'wait');
    render(
      <Suspense fallback={null}>
        <Lazy />
      </Suspense>
    );
    await waitFor(() => expect(screen.getByTestId('def')).toBeInTheDocument());
    expect(Lazy.displayName).toBe('Lazy(default)');
  });

  it('loads a named export when present', async () => {
    const Named = () => <div data-testid="named">named</div>;
    const importFn = vi.fn().mockResolvedValue({ NamedPanel: Named });
    const Lazy = withLazyLoading(importFn, 'NamedPanel');
    render(
      <Suspense fallback={null}>
        <Lazy />
      </Suspense>
    );
    await waitFor(() => expect(screen.getByTestId('named')).toBeInTheDocument());
    expect(Lazy.displayName).toBe('Lazy(NamedPanel)');
  });

  it('treats the module itself as the component when no default', async () => {
    const Comp = () => <div data-testid="mod">mod</div>;
    const importFn = vi.fn().mockResolvedValue(Comp);
    const Lazy = withLazyLoading(importFn);
    render(
      <Suspense fallback={null}>
        <Lazy />
      </Suspense>
    );
    await waitFor(() => expect(screen.getByTestId('mod')).toBeInTheDocument());
    expect(Lazy.displayName).toBe('Lazy(Component)');
  });

  it('falls through when named export is missing', async () => {
    const importFn = vi.fn().mockResolvedValue({
      default: () => <div data-testid="fallback-default">d</div>,
    });
    const Lazy = withLazyLoading(importFn, 'MissingName');
    render(
      <Suspense fallback={null}>
        <Lazy />
      </Suspense>
    );
    await waitFor(() => expect(screen.getByTestId('fallback-default')).toBeInTheDocument());
  });
});
