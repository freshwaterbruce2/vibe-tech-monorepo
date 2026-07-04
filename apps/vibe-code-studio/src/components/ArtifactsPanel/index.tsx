/**
 * ArtifactsPanel — reviewable artifacts grouped by originating task, with
 * kind icons, draft/final badges, previews, a per-task deep link back to the
 * Background Tasks panel (spec 09 AC #9), and a kind-aware viewer.
 * Spec: FEATURE_SPECS/competitive-gaps/09-VERIFIABLE-ARTIFACTS.md
 */
import {
  ArrowLeft,
  BookOpen,
  FileDiff,
  FileText,
  Image,
  ListChecks,
  Package,
  Trash2,
  X,
} from 'lucide-react';
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import type { Artifact, ArtifactKind } from '../../services/artifacts/types';
import { groupByTask, useArtifactsStore } from '../../stores/artifactsStore';
import { ArtifactViewer } from './ArtifactViewer';
import * as S from './styled';

const KIND_ICON: Record<ArtifactKind, ReactNode> = {
  task_list: <ListChecks size={14} />,
  plan: <FileText size={14} />,
  walkthrough: <BookOpen size={14} />,
  screenshot: <Image size={14} />,
  diff: <FileDiff size={14} />,
};

const previewOf = (artifact: Artifact): string =>
  artifact.kind === 'diff'
    ? 'File changes — open to review in the diff viewer'
    : artifact.content
        .replace(/[#*`\-[\]]/g, '')
        .trim()
        .slice(0, 140);

export interface ArtifactsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  /** Deep link: open the Background Tasks panel for this task (AC #9) */
  onOpenTask: (taskId: string) => void;
  onDelete: (artifactId: string) => void;
}

export const ArtifactsPanel = ({ isOpen, onClose, onOpenTask, onDelete }: ArtifactsPanelProps) => {
  const artifacts = useArtifactsStore(state => state.artifacts);
  const selectedId = useArtifactsStore(state => state.selectedId);
  const select = useArtifactsStore(state => state.actions.select);

  const groups = useMemo(() => groupByTask(artifacts), [artifacts]);
  const selected = selectedId ? artifacts.find(a => a.id === selectedId) : undefined;

  if (!isOpen) return null;

  return (
    <S.PanelContainer data-testid="artifacts-panel">
      <S.PanelHeader>
        <S.HeaderTitle>
          {selected ? (
            <S.IconButton onClick={() => select(null)} title="Back" aria-label="Back to artifacts">
              <ArrowLeft size={16} />
            </S.IconButton>
          ) : (
            <Package size={16} />
          )}
          {selected ? selected.title : 'Artifacts'}
        </S.HeaderTitle>
        <S.HeaderActions>
          <S.IconButton onClick={onClose} title="Close panel" aria-label="Close artifacts panel">
            <X size={16} />
          </S.IconButton>
        </S.HeaderActions>
      </S.PanelHeader>

      {selected ? (
        <S.ViewerContainer>
          <S.ViewerMeta>
            <span>{selected.kind}</span>
            <span>{selected.status}</span>
            <span>{new Date(selected.updatedAt).toLocaleString()}</span>
            <S.LinkButton onClick={() => onOpenTask(selected.taskId)}>
              View task {selected.taskId.slice(0, 24)}
            </S.LinkButton>
          </S.ViewerMeta>
          <ArtifactViewer artifact={selected} onClose={() => select(null)} />
        </S.ViewerContainer>
      ) : (
        <S.ArtifactList>
          {artifacts.length === 0 ? (
            <S.EmptyState>
              <Package size={32} />
              No artifacts yet. Run an agent task — its task list, plans, and diffs will appear here
              as reviewable artifacts.
            </S.EmptyState>
          ) : (
            [...groups.entries()].map(([taskId, taskArtifacts]) => (
              <div key={taskId}>
                <S.TaskGroupHeader title={taskId}>
                  <span>Task {taskId.slice(0, 32)}</span>
                  <S.LinkButton
                    onClick={() => onOpenTask(taskId)}
                    aria-label={`Open task ${taskId}`}
                  >
                    view task ↗
                  </S.LinkButton>
                </S.TaskGroupHeader>
                {taskArtifacts.map(artifact => (
                  <S.ArtifactCard
                    key={artifact.id}
                    onClick={() => select(artifact.id)}
                    data-testid={`artifact-card-${artifact.id}`}
                  >
                    <S.CardHeader>
                      {KIND_ICON[artifact.kind]}
                      <S.CardTitle>{artifact.title}</S.CardTitle>
                      <S.StatusBadge $final={artifact.status === 'final'}>
                        {artifact.status}
                      </S.StatusBadge>
                      <S.IconButton
                        onClick={event => {
                          event.stopPropagation();
                          onDelete(artifact.id);
                        }}
                        title="Delete artifact"
                        aria-label={`Delete ${artifact.title}`}
                      >
                        <Trash2 size={13} />
                      </S.IconButton>
                    </S.CardHeader>
                    <S.CardPreview>{previewOf(artifact)}</S.CardPreview>
                  </S.ArtifactCard>
                ))}
              </div>
            ))
          )}
        </S.ArtifactList>
      )}
    </S.PanelContainer>
  );
};
