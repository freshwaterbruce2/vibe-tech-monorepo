/**
 * ArtifactViewer — kind-based rendering for a single artifact. diff kind is
 * re-rendered through the existing MultiFileDiffView (spec 09 AC #4) in
 * review mode (approve/reject both just close — the artifact is a frozen
 * record, not a pending edit). Markdown kinds render as preformatted text
 * until spec 05's plan viewer ships.
 * Spec: FEATURE_SPECS/competitive-gaps/09-VERIFIABLE-ARTIFACTS.md
 */
import { decodeDiffContent } from '../../services/artifacts/artifactContent';
import type { Artifact } from '../../services/artifacts/types';
import { MultiFileDiffView } from '../MultiFileDiffView';
import * as S from './styled';

export interface ArtifactViewerProps {
  artifact: Artifact;
  onClose: () => void;
}

export const ArtifactViewer = ({ artifact, onClose }: ArtifactViewerProps) => {
  if (artifact.kind === 'diff') {
    const decoded = decodeDiffContent(artifact.content);
    if (decoded) {
      return (
        <S.ViewerBody data-testid="artifact-viewer-diff">
          <MultiFileDiffView
            changes={decoded.changes}
            estimatedImpact={decoded.estimatedImpact}
            onApprove={onClose}
            onReject={onClose}
          />
        </S.ViewerBody>
      );
    }
  }
  return (
    <S.ViewerBody data-testid="artifact-viewer-markdown">
      <S.MarkdownBlock>{artifact.content}</S.MarkdownBlock>
    </S.ViewerBody>
  );
};
