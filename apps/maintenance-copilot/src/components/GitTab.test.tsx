// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GitTab } from './GitTab';

describe('GitTab', () => {
  it('renders branch, dirty state, and recent commits', () => {
    render(
      <GitTab
        git={{
          branch: 'feat/x',
          isDirty: true,
          recentCommits: [{ hash: 'abc123', message: 'do thing' }],
        }}
      />,
    );
    expect(screen.getByText('feat/x')).toBeInTheDocument();
    expect(screen.getByText(/uncommitted changes/)).toBeInTheDocument();
    expect(screen.getByText('abc123')).toBeInTheDocument();
  });

  it('shows a clean working tree when not dirty', () => {
    render(<GitTab git={{ branch: 'main', isDirty: false, recentCommits: [] }} />);
    expect(screen.getByText(/clean working tree/)).toBeInTheDocument();
  });

  it('degrades to "Git unavailable" off a repo or when undefined', () => {
    const { rerender } = render(
      <GitTab git={{ branch: 'unknown', isDirty: false, recentCommits: [] }} />,
    );
    expect(screen.getByText(/Git unavailable/)).toBeInTheDocument();
    rerender(<GitTab />);
    expect(screen.getByText(/Git unavailable/)).toBeInTheDocument();
  });
});
