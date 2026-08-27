/**
 * ArtifactWalkthroughView — renders walkthrough markdown (spec 09 Phase 3)
 * with spec-11 screenshots embedded inline: `![title](artifact:<id>)` refs
 * are resolved against the artifacts store and rendered as images. Missing
 * or undecodable refs degrade to a text placeholder (text-only walkthroughs
 * render unchanged).
 * Spec: FEATURE_SPECS/competitive-gaps/09-VERIFIABLE-ARTIFACTS.md
 */
import { useMemo } from 'react';
import {
  decodeScreenshotContent,
  splitWalkthroughSegments,
} from '../../services/artifacts/artifactContent';
import type { WalkthroughSegment } from '../../services/artifacts/artifactContent';
import type { Artifact } from '../../services/artifacts/types';
import { useArtifactsStore } from '../../stores/artifactsStore';
import * as S from './styled';

export interface ArtifactWalkthroughViewProps {
  artifact: Artifact;
}

const InlineScreenshot = ({
  segment,
  artifacts,
}: {
  segment: Extract<WalkthroughSegment, { type: 'screenshot' }>;
  artifacts: Artifact[];
}) => {
  const referenced = artifacts.find(a => a.id === segment.artifactId && a.kind === 'screenshot');
  const decoded = referenced ? decodeScreenshotContent(referenced.content) : null;
  if (!decoded) {
    return (
      <S.ScreenshotCaption data-testid="walkthrough-screenshot-missing">
        (screenshot unavailable — {segment.title || segment.artifactId})
      </S.ScreenshotCaption>
    );
  }
  return (
    <S.ScreenshotFigure data-testid="walkthrough-screenshot">
      <S.ScreenshotImage src={decoded.imageDataUrl} alt={segment.title || 'screenshot'} />
      <S.ScreenshotCaption>{segment.title || decoded.description}</S.ScreenshotCaption>
    </S.ScreenshotFigure>
  );
};

export const ArtifactWalkthroughView = ({ artifact }: ArtifactWalkthroughViewProps) => {
  const artifacts = useArtifactsStore(state => state.artifacts);
  const segments = useMemo(() => splitWalkthroughSegments(artifact.content), [artifact.content]);

  return (
    <div data-testid="artifact-viewer-walkthrough">
      {segments.map((segment, index) =>
        segment.type === 'text' ? (
          <S.MarkdownBlock key={index}>{segment.text}</S.MarkdownBlock>
        ) : (
          <InlineScreenshot key={index} segment={segment} artifacts={artifacts} />
        )
      )}
    </div>
  );
};
