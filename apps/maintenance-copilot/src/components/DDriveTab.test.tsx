// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DDriveTab } from './DDriveTab';
import type { DDriveHealth, DatabaseHealth } from '../lib/api';

const dDrive: DDriveHealth = {
  totalSize: '1000 GB',
  freeSpace: '450 GB',
  learningSystem: { status: 'OK', staleFileCount: 21, insightsCount: 109, crashed: false },
};
const databases: DatabaseHealth = {
  databases: [
    {
      name: 'a.db',
      path: 'a.db',
      size: '1.5 MB',
      walStatus: 'Enabled',
      status: 'OK',
      hasLock: true,
    },
    {
      name: 'b.db',
      path: 'b.db',
      size: '0.2 MB',
      walStatus: 'Disabled',
      status: 'INTEGRITY_ERROR',
      hasLock: false,
    },
  ],
};

describe('DDriveTab', () => {
  it('renders disk metrics, the reframed learning panel, and the database list', () => {
    render(<DDriveTab dDrive={dDrive} databases={databases} />);
    expect(screen.getByText('450 GB')).toBeInTheDocument();
    expect(screen.getByText('109')).toBeInTheDocument(); // Insights Available
    expect(screen.getByText('21')).toBeInTheDocument(); // Stale Files
    expect(screen.getByText('a.db')).toBeInTheDocument();
    expect(screen.getByText(/INTEGRITY_ERROR/)).toBeInTheDocument();
  });

  it('renders two same-named databases distinctly by path (unique React key)', () => {
    render(
      <DDriveTab
        dDrive={dDrive}
        databases={{
          databases: [
            {
              name: 'trading.db',
              path: 'trading.db',
              size: '1 MB',
              walStatus: 'Enabled',
              status: 'OK',
              hasLock: true,
            },
            {
              name: 'trading.db',
              path: 'crypto-enhanced\\trading.db',
              size: '2 MB',
              walStatus: 'Enabled',
              status: 'OK',
              hasLock: true,
            },
          ],
        }}
      />,
    );
    // Both real DBs render (the old name-keyed list silently dropped one).
    expect(screen.getByText('trading.db')).toBeInTheDocument();
    expect(screen.getByText('crypto-enhanced\\trading.db')).toBeInTheDocument();
  });

  it('shows the OOM/crash alert with reason', () => {
    render(
      <DDriveTab
        dDrive={{
          ...dDrive,
          learningSystem: { ...dDrive.learningSystem, crashed: true, reason: 'out of memory' },
        }}
        databases={databases}
      />,
    );
    expect(screen.getByText(/OOM\/crash: out of memory/)).toBeInTheDocument();
  });

  it('shows the crash alert without a colon when no reason is present', () => {
    render(
      <DDriveTab
        dDrive={{ ...dDrive, learningSystem: { ...dDrive.learningSystem, crashed: true } }}
        databases={databases}
      />,
    );
    const alert = screen.getByText(/OOM\/crash/);
    expect(alert.textContent).not.toContain(':');
  });

  it('handles missing data with em-dashes and an empty-db badge', () => {
    render(<DDriveTab />);
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    expect(screen.getByText(/No databases found/)).toBeInTheDocument();
  });
});
