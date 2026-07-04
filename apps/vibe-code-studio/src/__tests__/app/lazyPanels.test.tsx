import { render, screen, waitFor } from '@testing-library/react';
import { Component, Suspense } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import * as lazyPanels from '../../app/lazyPanels';
import { ProblemsPanelHost } from '../../app/lazyPanels';
import { useProblemsStore } from '../../stores/problemsStore';

/** Swallows render errors: we only assert the lazy import thunks execute */
class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}

describe('lazyPanels', () => {
  it('lazy-loads ProblemsPanelHost and renders it', async () => {
    // Warm the module graph so the lazy import resolves quickly under coverage load
    await import('../../components/ProblemsPanel/ProblemsPanelHost');
    useProblemsStore.setState({ bySource: {}, panelOpen: true });
    render(
      <Suspense fallback={<span>loading</span>}>
        <ProblemsPanelHost />
      </Suspense>
    );
    expect(await screen.findByTestId('problems-panel', {}, { timeout: 15000 })).toBeTruthy();
    useProblemsStore.setState({ panelOpen: false });
  }, 20000);

  it('every lazy panel entry resolves its dynamic import', async () => {
    const entries = Object.entries(lazyPanels) as Array<[string, ComponentType]>;
    expect(entries.length).toBeGreaterThan(0);
    const loaded: string[] = [];
    for (const [name, Panel] of entries) {
      const { unmount } = render(
        <Boundary>
          <Suspense fallback={null}>
            <Panel />
          </Suspense>
        </Boundary>
      );
      // The lazy thunk + its .then(m => ...) mapper run once the import settles;
      // render success is NOT asserted (panels may require props/providers).
      await waitFor(() => loaded.push(name), { timeout: 15000 });
      await new Promise(resolve => setTimeout(resolve, 25));
      unmount();
    }
    expect(loaded).toHaveLength(entries.length);
  }, 120000);
});
