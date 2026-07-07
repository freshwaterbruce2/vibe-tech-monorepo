// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MonorepoTab } from './MonorepoTab';
import type { WorkspaceHealth } from '../lib/api';

const ws: WorkspaceHealth = {
  drifts: [],
  packages: [
    {
      name: '@v/a',
      path: 'apps/a',
      type: 'app',
      dependenciesCount: 3,
      devDependenciesCount: 0,
      status: 'stable',
    },
    {
      name: '@v/b',
      path: 'packages/b',
      type: 'package',
      dependenciesCount: 1,
      devDependenciesCount: 2,
      status: 'stable',
    },
  ],
};

describe('MonorepoTab', () => {
  it('shows the real apps/packages split, drift count, and a no-drift badge', () => {
    render(<MonorepoTab workspace={ws} />);
    expect(screen.getByText(/1 apps · 1 packages · 0 dependencies drifting/)).toBeInTheDocument();
    expect(screen.getByText(/No dependency drift detected/)).toBeInTheDocument();
    expect(screen.getByText('2 workspace members')).toBeInTheDocument();
    expect(screen.getByText('@v/a')).toBeInTheDocument();
  });

  it('lists drift versions when present (read-only — no repair button)', () => {
    render(
      <MonorepoTab
        workspace={{
          ...ws,
          drifts: [
            { dependencyName: 'react', versions: [{ version: '18.0.0', packages: ['a', 'b'] }] },
          ],
        }}
      />,
    );
    expect(screen.getByText(/18\.0\.0 \(2\)/)).toBeInTheDocument();
    expect(screen.queryByText(/No dependency drift/)).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('handles undefined workspace data', () => {
    render(<MonorepoTab />);
    expect(screen.getByText(/0 apps · 0 packages · 0 dependencies drifting/)).toBeInTheDocument();
    expect(screen.getByText('0 workspace members')).toBeInTheDocument();
  });
});
