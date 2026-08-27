/**
 * ArtifactScreenshotView — image renderer for screenshot-kind artifacts
 * (spec 09 Phase 3 / spec 11 evidence). Decodes the spec-11 screenshot
 * payload and renders the embedded data-URL image with its caption;
 * malformed content degrades to the raw view like the diff kind does.
 * Spec: FEATURE_SPECS/competitive-gaps/09-VERIFIABLE-ARTIFACTS.md
 */
import { decodeScreenshotContent } from '../../services/artifacts/artifactContent';
import type { Artifact } from '../../services/artifacts/types';
import * as S from './styled';

export interface ArtifactScreenshotViewProps {
  artifact: Artifact;
}

export const ArtifactScreenshotView = ({ artifact }: ArtifactScreenshotViewProps) => {
  const decoded = decodeScreenshotContent(artifact.content);
  if (!decoded) {
    return (
      <S.MarkdownBlock data-testid="artifact-screenshot-raw">{artifact.content}</S.MarkdownBlock>
    );
  }
  return (
    <S.ScreenshotFigure data-testid="artifact-viewer-screenshot">
      <S.ScreenshotImage src={decoded.imageDataUrl} alt={decoded.description ?? artifact.title} />
      <S.ScreenshotCaption>
        {decoded.description ?? artifact.title} · {new Date(decoded.capturedAt).toLocaleString()}
      </S.ScreenshotCaption>
    </S.ScreenshotFigure>
  );
};
