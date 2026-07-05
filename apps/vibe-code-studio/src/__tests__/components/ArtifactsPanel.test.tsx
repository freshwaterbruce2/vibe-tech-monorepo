/**
 * ArtifactsPanel tests — task grouping, kind icons + badges, previews,
 * deep-link + delete actions, and the kind-aware viewer (diff renders via
 * MultiFileDiffView per spec AC #4; malformed diff falls back to raw view;
 * markdown kinds render preformatted).
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ArtifactsPanel } from '../../components/ArtifactsPanel';
import { encodeDiffContent } from '../../services/artifacts/artifactContent';
import type { Artifact, ArtifactComment } from '../../services/artifacts/types';
import { useArtifactsStore } from '../../stores/artifactsStore';

const artifact = (overrides: Partial<Artifact>): Artifact => ({
  id: 'a-1',
  taskId: 'task-1',
  kind: 'task_list',
  title: 'Task list — refactor',
  content: '- [x] read files\n- [ ] apply edits',
  createdAt: new Date(2026, 6, 4, 10, 0).toISOString(),
  updatedAt: new Date(2026, 6, 4, 10, 5).toISOString(),
  status: 'draft',
  ...overrides,
});

const comment = (overrides: Partial<ArtifactComment>): ArtifactComment => ({
  id: 'c-1',
  artifactId: 'a-1',
  taskId: 'task-1',
  body: 'focus on tests',
  createdAt: new Date(2026, 6, 5, 10, 0).toISOString(),
  delivery: 'queued',
  ...overrides,
});

const handlers = {
  onClose: vi.fn(),
  onOpenTask: vi.fn(),
  onDelete: vi.fn(),
  onAddComment: vi.fn(),
};

const renderPanel = (props: Partial<Parameters<typeof ArtifactsPanel>[0]> = {}) =>
  render(<ArtifactsPanel isOpen {...handlers} {...props} />);

beforeEach(() => {
  vi.clearAllMocks();
  useArtifactsStore.setState({ artifacts: [], comments: [], panelOpen: true, selectedId: null });
});

describe('list view', () => {
  it('renders nothing when closed', () => {
    renderPanel({ isOpen: false });
    expect(screen.queryByTestId('artifacts-panel')).toBeNull();
  });

  it('shows the empty state without artifacts', () => {
    renderPanel();
    expect(screen.getByText(/No artifacts yet/)).toBeTruthy();
  });

  it('groups artifacts by task with status badges and previews', () => {
    useArtifactsStore.setState({
      artifacts: [
        artifact({}),
        artifact({ id: 'a-2', kind: 'plan', title: 'Plan', status: 'final', content: '# Goal' }),
        artifact({ id: 'a-3', taskId: 'task-2', title: 'Other task list' }),
      ],
    });
    renderPanel();
    expect(screen.getAllByText(/^Task task-/)).toHaveLength(2);
    expect(screen.getByText('Task list — refactor')).toBeTruthy();
    expect(screen.getByText('final')).toBeTruthy();
    expect(screen.getAllByText('draft')).toHaveLength(2);
    // markdown-stripped preview (both task_list artifacts share this content)
    expect(screen.getAllByText(/read files/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows a friendly preview for screenshot cards instead of raw JSON (spec 09 P3)', () => {
    useArtifactsStore.setState({
      artifacts: [
        artifact({
          id: 'shot-1',
          kind: 'screenshot',
          title: 'Login page',
          content: '{"imageDataUrl":"data:image/png;base64,AAAA","capturedAt":"x"}',
        }),
      ],
    });
    renderPanel();
    expect(screen.getByTestId('artifact-card-shot-1').textContent).toContain(
      'Browser screenshot — open to view the image'
    );
    expect(screen.getByTestId('artifact-card-shot-1').textContent).not.toContain('imageDataUrl');
  });

  it('deep links to the originating task (AC #9)', () => {
    useArtifactsStore.setState({ artifacts: [artifact({})] });
    renderPanel();
    fireEvent.click(screen.getByLabelText('Open task task-1'));
    expect(handlers.onOpenTask).toHaveBeenCalledWith('task-1');
  });

  it('deletes without opening the artifact', () => {
    useArtifactsStore.setState({ artifacts: [artifact({})] });
    renderPanel();
    fireEvent.click(screen.getByLabelText('Delete Task list — refactor'));
    expect(handlers.onDelete).toHaveBeenCalledWith('a-1');
    expect(useArtifactsStore.getState().selectedId).toBeNull();
  });

  it('close button calls onClose', () => {
    renderPanel();
    fireEvent.click(screen.getByLabelText('Close artifacts panel'));
    expect(handlers.onClose).toHaveBeenCalled();
  });
});

describe('viewer', () => {
  it('opens markdown kinds preformatted, with meta + task link, and goes back', () => {
    useArtifactsStore.setState({ artifacts: [artifact({})] });
    renderPanel();
    fireEvent.click(screen.getByTestId('artifact-card-a-1'));

    expect(screen.getByTestId('artifact-viewer-markdown').textContent).toContain(
      '- [x] read files'
    );
    fireEvent.click(screen.getByText(/View task task-1/));
    expect(handlers.onOpenTask).toHaveBeenCalledWith('task-1');

    fireEvent.click(screen.getByLabelText('Back to artifacts'));
    expect(screen.getByTestId('artifact-card-a-1')).toBeTruthy();
  });

  it('renders diff artifacts through MultiFileDiffView (AC #4)', () => {
    useArtifactsStore.setState({
      artifacts: [
        artifact({
          id: 'a-diff',
          kind: 'diff',
          title: 'Auth diff',
          status: 'final',
          content: encodeDiffContent(
            [
              {
                path: 'src/auth.ts',
                originalContent: 'const a = 1;',
                newContent: 'const a = 2;',
                changeType: 'modify',
              },
            ],
            'high'
          ),
        }),
      ],
    });
    renderPanel();
    fireEvent.click(screen.getByTestId('artifact-card-a-diff'));
    expect(screen.getByTestId('artifact-viewer-diff')).toBeTruthy();
    expect(screen.getByText(/src[/\\]auth\.ts/)).toBeTruthy();

    // Approve/Reject on a frozen artifact just close the viewer (back to list)
    fireEvent.click(screen.getByText(/Reject All/));
    expect(screen.getByTestId('artifact-card-a-diff')).toBeTruthy();
    expect(screen.queryByTestId('artifact-viewer-diff')).toBeNull();
  });

  it('falls back to raw view for malformed diff content', () => {
    useArtifactsStore.setState({
      artifacts: [artifact({ id: 'a-bad', kind: 'diff', content: 'not json' })],
    });
    renderPanel();
    fireEvent.click(screen.getByTestId('artifact-card-a-bad'));
    expect(screen.getByTestId('artifact-viewer-markdown').textContent).toContain('not json');
  });
});

describe('comment thread (spec 09 Phase 2)', () => {
  const openArtifact = (id = 'a-1') => {
    renderPanel();
    fireEvent.click(screen.getByTestId(`artifact-card-${id}`));
  };

  it('shows only the selected artifact thread with delivery badges', () => {
    useArtifactsStore.setState({
      artifacts: [artifact({})],
      comments: [
        comment({}),
        comment({ id: 'c-2', body: 'shipped note', delivery: 'delivered' }),
        comment({ id: 'c-other', artifactId: 'a-other', body: 'unrelated thread' }),
      ],
    });
    openArtifact();

    expect(screen.getByTestId('artifact-comment-thread')).toBeTruthy();
    expect(screen.getByText('focus on tests')).toBeTruthy();
    expect(screen.getByText('sending to agent…')).toBeTruthy();
    expect(screen.getByText('delivered to agent')).toBeTruthy();
    expect(screen.queryByText('unrelated thread')).toBeNull();
    expect(screen.getByText('Comments (2)')).toBeTruthy();
  });

  it('submits a comment for the open artifact and clears the input', () => {
    useArtifactsStore.setState({ artifacts: [artifact({})] });
    openArtifact();

    const input = screen.getByLabelText('Add a comment') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'try the shared helper' } });
    fireEvent.click(screen.getByLabelText('Send comment'));

    expect(handlers.onAddComment).toHaveBeenCalledTimes(1);
    const [passedArtifact, body] = handlers.onAddComment.mock.calls[0]!;
    expect(passedArtifact.id).toBe('a-1');
    expect(body).toBe('try the shared helper');
    expect(input.value).toBe('');
  });

  it('submits on Enter but not Shift+Enter, and never submits blanks', () => {
    useArtifactsStore.setState({ artifacts: [artifact({})] });
    openArtifact();
    const input = screen.getByLabelText('Add a comment') as HTMLTextAreaElement;

    fireEvent.click(screen.getByLabelText('Send comment')); // empty
    expect(handlers.onAddComment).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: 'line one' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    expect(handlers.onAddComment).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(handlers.onAddComment).toHaveBeenCalledTimes(1);
  });

  it('renders no thread on diff artifacts', () => {
    useArtifactsStore.setState({
      artifacts: [artifact({ id: 'a-diff2', kind: 'diff', content: 'not json' })],
    });
    openArtifact('a-diff2');
    expect(screen.queryByTestId('artifact-comment-thread')).toBeNull();
  });
});
