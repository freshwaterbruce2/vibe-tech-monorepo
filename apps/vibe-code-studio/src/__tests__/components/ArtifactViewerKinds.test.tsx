/**
 * ArtifactViewer kind-routing tests for spec 09 Phase 3 — screenshot image
 * rendering (data-URL img + caption, raw fallback on malformed payloads) and
 * walkthrough markdown with inline screenshot refs resolved from the
 * artifacts store (missing refs degrade to a text placeholder).
 */
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ArtifactViewer } from '../../components/ArtifactsPanel/ArtifactViewer';
import { encodeScreenshotContent, screenshotRef } from '../../services/artifacts/artifactContent';
import type { Artifact } from '../../services/artifacts/types';
import { useArtifactsStore } from '../../stores/artifactsStore';

function artifact(overrides: Partial<Artifact>): Artifact {
  return {
    id: 'a-1',
    taskId: 'task-1',
    kind: 'screenshot',
    title: 'Login page',
    content: '',
    createdAt: new Date(1000).toISOString(),
    updatedAt: new Date(1000).toISOString(),
    status: 'final',
    ...overrides,
  };
}

const screenshotArtifact = artifact({
  id: 's-1',
  kind: 'screenshot',
  title: 'Login page',
  content: encodeScreenshotContent({
    imageDataUrl: 'data:image/png;base64,AAAA',
    capturedAt: new Date(2000).toISOString(),
    description: 'verify the login page',
  }),
});

const noop = () => undefined;

beforeEach(() => {
  useArtifactsStore.setState({ artifacts: [], comments: [], panelOpen: false, selectedId: null });
});

describe('screenshot kind (deferred spec-11 renderer)', () => {
  it('renders the image with its caption', () => {
    render(<ArtifactViewer artifact={screenshotArtifact} onClose={noop} />);
    const figure = screen.getByTestId('artifact-viewer-screenshot');
    const img = figure.querySelector('img');
    expect(img?.getAttribute('src')).toBe('data:image/png;base64,AAAA');
    expect(img?.getAttribute('alt')).toBe('verify the login page');
    expect(figure.textContent).toContain('verify the login page');
  });

  it('falls back to the artifact title when no description exists', () => {
    const noDescription = artifact({
      content: encodeScreenshotContent({
        imageDataUrl: 'data:image/png;base64,BBBB',
        capturedAt: new Date(2000).toISOString(),
      }),
    });
    render(<ArtifactViewer artifact={noDescription} onClose={noop} />);
    expect(screen.getByTestId('artifact-viewer-screenshot').textContent).toContain('Login page');
  });

  it('degrades to the raw view on malformed content', () => {
    render(<ArtifactViewer artifact={artifact({ content: 'not json at all' })} onClose={noop} />);
    expect(screen.getByTestId('artifact-screenshot-raw').textContent).toBe('not json at all');
  });
});

describe('walkthrough kind', () => {
  it('renders text segments and resolves screenshot refs from the store', () => {
    useArtifactsStore.setState({ artifacts: [screenshotArtifact] });
    const walkthrough = artifact({
      id: 'w-1',
      kind: 'walkthrough',
      title: 'Walkthrough',
      content: `## Verification\n${screenshotRef('s-1', 'Login page')}\ntrailing notes`,
    });
    render(<ArtifactViewer artifact={walkthrough} onClose={noop} />);

    const view = screen.getByTestId('artifact-viewer-walkthrough');
    expect(view.textContent).toContain('## Verification');
    expect(view.textContent).toContain('trailing notes');
    const img = screen.getByTestId('walkthrough-screenshot').querySelector('img');
    expect(img?.getAttribute('src')).toBe('data:image/png;base64,AAAA');
  });

  it('shows a placeholder for refs whose screenshot artifact is gone', () => {
    const walkthrough = artifact({
      id: 'w-1',
      kind: 'walkthrough',
      content: screenshotRef('deleted-id', 'Old shot'),
    });
    render(<ArtifactViewer artifact={walkthrough} onClose={noop} />);
    expect(screen.getByTestId('walkthrough-screenshot-missing').textContent).toContain('Old shot');
  });

  it('shows a placeholder when the referenced artifact is not decodable as a screenshot', () => {
    useArtifactsStore.setState({
      artifacts: [artifact({ id: 's-bad', kind: 'screenshot', content: 'broken' })],
    });
    const walkthrough = artifact({
      id: 'w-1',
      kind: 'walkthrough',
      content: screenshotRef('s-bad', 'Broken shot'),
    });
    render(<ArtifactViewer artifact={walkthrough} onClose={noop} />);
    expect(screen.getByTestId('walkthrough-screenshot-missing')).toBeTruthy();
  });

  it('renders a text-only walkthrough unchanged', () => {
    const walkthrough = artifact({
      id: 'w-1',
      kind: 'walkthrough',
      content: '# Walkthrough\n\nNo evidence captured.',
    });
    render(<ArtifactViewer artifact={walkthrough} onClose={noop} />);
    expect(screen.getByTestId('artifact-viewer-walkthrough').textContent).toContain(
      'No evidence captured.'
    );
  });
});
