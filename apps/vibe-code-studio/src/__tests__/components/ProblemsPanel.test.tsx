import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProblemsPanel } from '../../components/ProblemsPanel';
import { filterDiagnostics } from '../../components/ProblemsPanel/utils';
import type { Diagnostic } from '../../services/tasks/types';
import { useProblemsStore } from '../../stores/problemsStore';

const diag = (overrides: Partial<Diagnostic>): Diagnostic => ({
  file: 'V:\\ws\\src\\app.ts',
  line: 10,
  column: 2,
  severity: 'error',
  message: 'Missing semicolon',
  code: 'semi',
  source: 'build',
  ...overrides,
});

beforeEach(() => {
  useProblemsStore.getState().actions.clearAll();
});

describe('filterDiagnostics', () => {
  it('passes everything through on "all" and filters by severity otherwise', () => {
    const list = [diag({}), diag({ severity: 'warning' }), diag({ severity: 'info' })];
    expect(filterDiagnostics(list, 'all')).toHaveLength(3);
    expect(filterDiagnostics(list, 'error')).toHaveLength(1);
    expect(filterDiagnostics(list, 'warning')).toHaveLength(1);
  });
});

describe('ProblemsPanel', () => {
  it('renders nothing when closed', () => {
    render(<ProblemsPanel isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByTestId('problems-panel')).toBeNull();
  });

  it('shows the empty state when there are no diagnostics', () => {
    render(<ProblemsPanel isOpen onClose={vi.fn()} />);
    expect(screen.getByText('No problems detected')).toBeTruthy();
  });

  it('groups diagnostics by file and opens the file at line:col on click', () => {
    useProblemsStore
      .getState()
      .actions.append('build', [
        diag({}),
        diag({ file: 'V:\\ws\\src\\other.ts', line: 3, column: 7, message: 'Bad type' }),
      ]);
    const onOpenFile = vi.fn();
    render(<ProblemsPanel isOpen onClose={vi.fn()} onOpenFile={onOpenFile} />);
    expect(screen.getByText('V:\\ws\\src\\app.ts')).toBeTruthy();
    expect(screen.getByText('V:\\ws\\src\\other.ts')).toBeTruthy();
    fireEvent.click(screen.getByText('Bad type'));
    expect(onOpenFile).toHaveBeenCalledWith('V:\\ws\\src\\other.ts', 3, 7);
  });

  it('does not crash when a row is clicked without an onOpenFile handler', () => {
    useProblemsStore.getState().actions.append('build', [diag({})]);
    render(<ProblemsPanel isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('Missing semicolon'));
  });

  it('filters rows by severity via the header buttons', () => {
    useProblemsStore
      .getState()
      .actions.append('lint', [
        diag({ source: 'lint' }),
        diag({ source: 'lint', severity: 'warning', message: 'Unexpected any', code: undefined }),
      ]);
    render(<ProblemsPanel isOpen onClose={vi.fn()} />);
    const header = screen.getByText('All (2)').parentElement!;
    fireEvent.click(header.children[1]);
    expect(screen.getByText('Missing semicolon')).toBeTruthy();
    expect(screen.queryByText('Unexpected any')).toBeNull();
    fireEvent.click(header.children[2]);
    expect(screen.getByText('Unexpected any')).toBeTruthy();
    expect(screen.queryByText('Missing semicolon')).toBeNull();
    fireEvent.click(screen.getByText('All (2)'));
    expect(screen.getByText('Missing semicolon')).toBeTruthy();
  });

  it('clears all diagnostics via the trash action', () => {
    useProblemsStore.getState().actions.append('build', [diag({})]);
    render(<ProblemsPanel isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Clear all'));
    expect(screen.getByText('No problems detected')).toBeTruthy();
  });

  it('invokes onClose from the close button', () => {
    const onClose = vi.fn();
    render(<ProblemsPanel isOpen onClose={onClose} />);
    fireEvent.click(screen.getByLabelText('Close problems panel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
