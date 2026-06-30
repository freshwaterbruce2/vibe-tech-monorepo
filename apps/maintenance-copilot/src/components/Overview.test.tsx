// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Overview } from './Overview';
import { scoreTone, countTone } from '../lib/tone';
import type { GatewayData } from '../hooks/useGatewayData';

const healthy: GatewayData = {
  telemetry: { healthScore: 90, mismatchedDeps: 0, activeLockfiles: 0, hasOOM: false },
  workspace: {
    drifts: [],
    packages: [
      {
        name: 'a',
        path: 'apps/a',
        type: 'app',
        dependenciesCount: 1,
        devDependenciesCount: 0,
        status: 'stable',
      },
      {
        name: 'b',
        path: 'packages/b',
        type: 'package',
        dependenciesCount: 0,
        devDependenciesCount: 1,
        status: 'stable',
      },
    ],
  },
  databases: {
    databases: [
      { name: 'x.db', size: '1 MB', walStatus: 'Disabled', status: 'OK', hasLock: false },
    ],
  },
  dDrive: {
    totalSize: '1 GB',
    freeSpace: '1 GB',
    learningSystem: { status: 'OK', staleFileCount: 0, insightsCount: 9, crashed: false },
  },
};

describe('tone helpers', () => {
  it.each([
    [90, 'ok'],
    [60, 'warn'],
    [30, 'danger'],
  ] as const)('scoreTone(%i) = %s', (s, t) => expect(scoreTone(s)).toBe(t));
  it.each([
    [0, 'ok'],
    [2, 'warn'],
  ] as const)('countTone(%i) = %s', (n, t) => expect(countTone(n)).toBe(t));
});

describe('Overview', () => {
  it('renders live telemetry + the 47/36-style workspace split and a clean alert', () => {
    render(<Overview data={healthy} />);
    expect(screen.getByText('90%')).toBeInTheDocument();
    expect(screen.getByText('1 / 1')).toBeInTheDocument(); // apps / packages
    expect(screen.getByText(/No active issues/)).toBeInTheDocument();
  });

  it('rolls up drifts, locked DBs, and a learning-system crash (with reason)', () => {
    const data: GatewayData = {
      ...healthy,
      workspace: {
        ...healthy.workspace!,
        drifts: [{ dependencyName: 'lodash', versions: [{ version: '^4.0.0', packages: ['a'] }] }],
      },
      databases: {
        databases: [
          { name: 'busy.db', size: '2 MB', walStatus: 'Enabled', status: 'OK', hasLock: true },
        ],
      },
      dDrive: {
        ...healthy.dDrive!,
        learningSystem: {
          status: 'WARN',
          staleFileCount: 3,
          insightsCount: 9,
          crashed: true,
          reason: 'out of memory',
        },
      },
    };
    render(<Overview data={data} />);
    expect(screen.getByText(/lodash drift across 1 version/)).toBeInTheDocument();
    expect(screen.getByText(/1 database\(s\) with active WAL/)).toBeInTheDocument();
    expect(screen.getByText(/OOM\/crash detected: out of memory/)).toBeInTheDocument();
    expect(screen.queryByText(/No active issues/)).toBeNull();
  });

  it('handles undefined data with em-dash fallbacks and a 0/0 split', () => {
    render(<Overview data={{}} />);
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    expect(screen.getByText('0 / 0')).toBeInTheDocument();
    expect(screen.getByText(/No active issues/)).toBeInTheDocument();
  });

  it('derives crash from telemetry.hasOOM when dDrive is absent (no reason)', () => {
    const data: GatewayData = {
      telemetry: { healthScore: 40, mismatchedDeps: 2, activeLockfiles: 1, hasOOM: true },
    };
    render(<Overview data={data} />);
    expect(screen.getByText('40%')).toBeInTheDocument();
    const crash = screen.getByText(/OOM\/crash detected/);
    expect(crash.textContent).not.toContain(':');
  });
});
