/**
 * ArtifactsPanelHost tests — boots capture against the real
 * backgroundAgentSystem from ServicesContext, store-driven visibility, and
 * deep-link wiring to the Background Tasks panel via UIPanelContext.
 * Capture integration functions are mocked.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { ServicesContext, UIPanelContext } from '../../app/contexts';
import type { ServicesContextValue, UIPanelContextValue } from '../../app/contexts';
import { ArtifactsPanelHost } from '../../components/ArtifactsPanel/ArtifactsPanelHost';
import type { Artifact } from '../../services/artifacts/types';
import { useArtifactsStore } from '../../stores/artifactsStore';

vi.mock('../../services/artifacts/artifactCapture', async importOriginal => ({
  // keep runArtifactAction real; mock the engine entry points
  ...((await importOriginal()) as object),
  initArtifactCapture: vi.fn().mockResolvedValue({}),
  deleteArtifact: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../services/artifacts/artifactComments', () => ({
  initArtifactComments: vi.fn().mockResolvedValue({}),
  addArtifactComment: vi.fn().mockResolvedValue(null),
  deleteCommentsForArtifact: vi.fn().mockResolvedValue(undefined),
}));

import * as capture from '../../services/artifacts/artifactCapture';
import * as comments from '../../services/artifacts/artifactComments';

const backgroundAgentSystem = { on: vi.fn(), off: vi.fn() };
const setBackgroundPanelOpen = vi.fn();

const services = { backgroundAgentSystem } as unknown as ServicesContextValue;
const ui = { setBackgroundPanelOpen } as unknown as UIPanelContextValue;

const wrapper = ({ children }: { children: ReactNode }) => (
  <ServicesContext.Provider value={services}>
    <UIPanelContext.Provider value={ui}>{children}</UIPanelContext.Provider>
  </ServicesContext.Provider>
);

const artifact: Artifact = {
  id: 'a-1',
  taskId: 'task-1',
  kind: 'plan',
  title: 'Plan',
  content: '# p',
  createdAt: new Date(2026, 6, 4).toISOString(),
  updatedAt: new Date(2026, 6, 4).toISOString(),
  status: 'final',
};

beforeEach(() => {
  vi.clearAllMocks();
  useArtifactsStore.setState({ artifacts: [], comments: [], panelOpen: false, selectedId: null });
});

describe('ArtifactsPanelHost', () => {
  it('initializes capture and comments with the real backgroundAgentSystem', async () => {
    render(<ArtifactsPanelHost />, { wrapper });
    await waitFor(() => expect(capture.initArtifactCapture).toHaveBeenCalledTimes(1));
    expect(vi.mocked(capture.initArtifactCapture).mock.calls[0]![0]).toBe(backgroundAgentSystem);
    await waitFor(() => expect(comments.initArtifactComments).toHaveBeenCalledTimes(1));
    expect(vi.mocked(comments.initArtifactComments).mock.calls[0]![0]).toBe(backgroundAgentSystem);
  });

  it('renders the panel only when the store opens it, closes via the store', async () => {
    render(<ArtifactsPanelHost />, { wrapper });
    expect(screen.queryByTestId('artifacts-panel')).toBeNull();

    useArtifactsStore.getState().actions.setPanelOpen(true);
    expect(await screen.findByTestId('artifacts-panel')).toBeTruthy();

    fireEvent.click(screen.getByLabelText('Close artifacts panel'));
    expect(useArtifactsStore.getState().panelOpen).toBe(false);
  });

  it('deep-links open the Background Tasks panel and delete routes to capture', async () => {
    useArtifactsStore.setState({ panelOpen: true, artifacts: [artifact] });
    render(<ArtifactsPanelHost />, { wrapper });

    fireEvent.click(screen.getByLabelText('Open task task-1'));
    expect(setBackgroundPanelOpen).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByLabelText('Delete Plan'));
    expect(capture.deleteArtifact).toHaveBeenCalledWith('a-1');
    expect(comments.deleteCommentsForArtifact).toHaveBeenCalledWith('a-1');
  });

  it('routes comment submissions to addArtifactComment', async () => {
    useArtifactsStore.setState({ panelOpen: true, artifacts: [artifact] });
    render(<ArtifactsPanelHost />, { wrapper });

    fireEvent.click(screen.getByTestId('artifact-card-a-1'));
    fireEvent.change(screen.getByLabelText('Add a comment'), {
      target: { value: 'ship it carefully' },
    });
    fireEvent.click(screen.getByLabelText('Send comment'));

    await waitFor(() => expect(comments.addArtifactComment).toHaveBeenCalledTimes(1));
    const [passedArtifact, body] = vi.mocked(comments.addArtifactComment).mock.calls[0]!;
    expect(passedArtifact.id).toBe('a-1');
    expect(body).toBe('ship it carefully');
  });
});
