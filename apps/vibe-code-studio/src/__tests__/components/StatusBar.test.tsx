/**
 * StatusBar reachability tests.
 *
 * Two fixes are locked here:
 *  1. The git-branch item is now clickable and calls onGitClick (opens Source
 *     Control).
 *  2. The hardcoded "No errors" item is bound to the REAL problems store and is
 *     clickable to open the Problems panel.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import StatusBar from '../../components/StatusBar';
import { useProblemsStore } from '../../stores/problemsStore';
import type { Diagnostic } from '../../services/tasks/types';

// Force a git repo so the branch item renders (real useGit reports false in jsdom).
const gitState = {
  isGitRepo: true,
  status: { modified: [], added: [], deleted: [], untracked: [] },
  branches: [{ name: 'main', isCurrent: true }],
};
vi.mock('../../hooks/useGit', () => ({
  useGit: () => gitState,
}));

const diag = (severity: Diagnostic['severity']): Diagnostic => ({
  file: 'src/a.ts',
  line: 1,
  column: 1,
  severity,
  message: `${severity} here`,
  source: 'lint',
});

const noop = () => undefined;

function renderStatusBar(overrides: Partial<ComponentProps<typeof StatusBar>> = {}) {
  return render(
    <StatusBar
      currentFile={null}
      aiChatOpen={false}
      onToggleSidebar={noop}
      onToggleAIChat={noop}
      {...overrides}
    />
  );
}

describe('StatusBar — git + problems reachability', () => {
  beforeEach(() => {
    const { actions } = useProblemsStore.getState();
    actions.clearAll();
    actions.setPanelOpen(false);
    vi.clearAllMocks();
  });

  it('calls onGitClick when the branch item is clicked', () => {
    const onGitClick = vi.fn();
    renderStatusBar({ onGitClick });

    fireEvent.click(screen.getByText('main'));

    expect(onGitClick).toHaveBeenCalledTimes(1);
  });

  it('shows "No errors" when the problems store is empty', () => {
    renderStatusBar();
    expect(screen.getByText('No errors')).toBeInTheDocument();
  });

  it('renders real error/warning counts from the problems store', () => {
    useProblemsStore
      .getState()
      .actions.setSource('lint', [diag('error'), diag('error'), diag('warning')]);

    renderStatusBar();

    expect(screen.getByText('2 errors, 1 warning')).toBeInTheDocument();
    expect(screen.queryByText('No errors')).not.toBeInTheDocument();
  });

  it('uses singular wording for a single error', () => {
    useProblemsStore.getState().actions.setSource('lint', [diag('error')]);

    renderStatusBar();

    expect(screen.getByText('1 error, 0 warnings')).toBeInTheDocument();
  });

  it('opens the Problems panel when the diagnostics item is clicked', () => {
    renderStatusBar();

    fireEvent.click(screen.getByText('No errors'));

    expect(useProblemsStore.getState().panelOpen).toBe(true);
  });

  it('renders line, character and word counts for the current file', () => {
    renderStatusBar({
      currentFile: {
        path: 'src/a.ts',
        language: 'typescript',
        content: 'const x = 1;\nconst y = 2;',
        isModified: false,
      } as ComponentProps<typeof StatusBar>['currentFile'],
    });

    expect(screen.getByText(/Ln 2, Col 1/)).toBeInTheDocument();
  });

  it('labels and invokes the coding surface as Chat Agent', () => {
    const onToggleAIChat = vi.fn();
    renderStatusBar({ onToggleAIChat });

    fireEvent.click(screen.getByRole('button', { name: 'Chat Agent' }));

    expect(onToggleAIChat).toHaveBeenCalledOnce();
  });
});
