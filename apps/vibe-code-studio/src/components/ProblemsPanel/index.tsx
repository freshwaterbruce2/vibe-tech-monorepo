/**
 * ProblemsPanel — shared diagnostics dock panel. Reads the problemsStore
 * (fed by the Task Runner now; LSP per spec 07 and DAP per spec 12 later)
 * and jumps to file:line:col on click.
 * Spec: FEATURE_SPECS/competitive-gaps/02-TASK-RUNNER.md
 */
import { AlertCircle, AlertTriangle, Info, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { DiagnosticSeverity } from '../../services/tasks/types';
import {
  countBySeverity,
  flattenDiagnostics,
  groupByFile,
  useProblemsStore,
} from '../../stores/problemsStore';
import * as S from './styled';
import { filterDiagnostics } from './utils';
import type { SeverityFilter } from './utils';

const SEVERITY_ICON: Record<DiagnosticSeverity, ReactNode> = {
  error: <AlertCircle size={14} color="#f14c4c" />,
  warning: <AlertTriangle size={14} color="#cca700" />,
  info: <Info size={14} color="#3794ff" />,
};

export interface ProblemsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFile?: (file: string, line?: number, column?: number) => void;
}

export const ProblemsPanel = ({ isOpen, onClose, onOpenFile }: ProblemsPanelProps) => {
  const bySource = useProblemsStore(state => state.bySource);
  const clearAll = useProblemsStore(state => state.actions.clearAll);
  const [filter, setFilter] = useState<SeverityFilter>('all');

  const all = useMemo(() => flattenDiagnostics(bySource), [bySource]);
  const counts = useMemo(() => countBySeverity(all), [all]);
  const groups = useMemo(() => groupByFile(filterDiagnostics(all, filter)), [all, filter]);

  if (!isOpen) return null;

  return (
    <S.PanelContainer $isOpen={isOpen} data-testid="problems-panel">
      <S.PanelHeader>
        <S.HeaderTitle>Problems</S.HeaderTitle>
        <S.HeaderActions>
          <S.FilterButton $active={filter === 'all'} onClick={() => setFilter('all')}>
            All ({all.length})
          </S.FilterButton>
          <S.FilterButton $active={filter === 'error'} onClick={() => setFilter('error')}>
            {SEVERITY_ICON.error} {counts.error}
          </S.FilterButton>
          <S.FilterButton $active={filter === 'warning'} onClick={() => setFilter('warning')}>
            {SEVERITY_ICON.warning} {counts.warning}
          </S.FilterButton>
          <S.IconButton onClick={clearAll} title="Clear all problems" aria-label="Clear all">
            <Trash2 size={14} />
          </S.IconButton>
          <S.IconButton onClick={onClose} title="Close panel" aria-label="Close problems panel">
            <X size={14} />
          </S.IconButton>
        </S.HeaderActions>
      </S.PanelHeader>
      <S.ProblemsList>
        {groups.size === 0 ? (
          <S.EmptyState>No problems detected</S.EmptyState>
        ) : (
          [...groups.entries()].map(([file, diagnostics]) => (
            <div key={file}>
              <S.FileGroupHeader title={file}>{file}</S.FileGroupHeader>
              {diagnostics.map((diagnostic, index) => (
                <S.ProblemRow
                  key={`${file}:${diagnostic.line}:${diagnostic.column}:${index}`}
                  onClick={() => onOpenFile?.(diagnostic.file, diagnostic.line, diagnostic.column)}
                >
                  {SEVERITY_ICON[diagnostic.severity]}
                  <S.ProblemMessage>{diagnostic.message}</S.ProblemMessage>
                  {diagnostic.code ? <S.ProblemCode>{diagnostic.code}</S.ProblemCode> : null}
                  <S.ProblemLocation>
                    {diagnostic.line}:{diagnostic.column}
                  </S.ProblemLocation>
                  <S.SourceBadge>{diagnostic.source}</S.SourceBadge>
                </S.ProblemRow>
              ))}
            </div>
          ))
        )}
      </S.ProblemsList>
    </S.PanelContainer>
  );
};
