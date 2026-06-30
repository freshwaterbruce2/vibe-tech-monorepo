// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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
  it('shows the real apps/packages split and a no-drift badge', () => {
    render(<MonorepoTab workspace={ws} onRepair={() => undefined} />);
    expect(screen.getByText('1 apps · 1 packages')).toBeInTheDocument();
    expect(screen.getByText(/No dependency drift detected/)).toBeInTheDocument();
    expect(screen.getByText('2 workspace members')).toBeInTheDocument();
    expect(screen.getByText('@v/a')).toBeInTheDocument();
  });

  it('lists drift versions when present', () => {
    render(
      <MonorepoTab
        workspace={{
          ...ws,
          drifts: [
            { dependencyName: 'lodash', versions: [{ version: '^4.0.0', packages: ['a', 'b'] }] },
          ],
        }}
        onRepair={() => undefined}
      />,
    );
    expect(screen.getByText(/\^4\.0\.0 \(2\)/)).toBeInTheDocument();
    expect(screen.queryByText(/No dependency drift/)).toBeNull();
  });

  it('fires onRepair when the Repair button is clicked', () => {
    const onRepair = vi.fn();
    render(<MonorepoTab workspace={ws} onRepair={onRepair} />);
    fireEvent.click(screen.getByRole('button', { name: /Align Dependencies/ }));
    expect(onRepair).toHaveBeenCalledOnce();
  });

  it('handles undefined workspace data', () => {
    render(<MonorepoTab onRepair={() => undefined} />);
    expect(screen.getByText('0 apps · 0 packages')).toBeInTheDocument();
    expect(screen.getByText('0 workspace members')).toBeInTheDocument();
  });
});
