/**
 * artifactComments tests — comment → injection channel wiring (spec 09
 * Phase 2): running task gets exactly one injectMessage push (never a
 * cancel/pause), finished task degrades to feedback, delivery flips on
 * 'messageInjected'/'messageDropped', and the UI store mirror stays in sync.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addArtifactComment,
  deleteCommentsForArtifact,
  initArtifactComments,
  resetArtifactCommentsForTests,
} from '../../../services/artifacts/artifactComments';
import type { ArtifactMessageInjector } from '../../../services/artifacts/types';
import { useArtifactsStore } from '../../../stores/artifactsStore';

type ElectronWindow = Window & { electron?: unknown };

interface FakeInjector extends ArtifactMessageInjector {
  emit: (event: string, ...args: unknown[]) => void;
  getTask: ReturnType<typeof vi.fn>;
  injectMessage: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
}

function makeInjector(
  status: string | undefined,
  injectResult: { id: string } | null = { id: 'msg-1' }
): FakeInjector {
  const listeners = new Map<string, (...args: unknown[]) => void>();
  return {
    on: vi.fn((event: string, listener: (...args: unknown[]) => void) => {
      listeners.set(event, listener);
    }),
    off: vi.fn((event: string) => {
      listeners.delete(event);
    }),
    getTask: vi.fn(() => (status ? { status } : undefined)),
    injectMessage: vi.fn(() => injectResult),
    emit: (event: string, ...args: unknown[]) => listeners.get(event)?.(...args),
  };
}

const artifact = { id: 'a-1', taskId: 'task-1' };

beforeEach(() => {
  resetArtifactCommentsForTests();
  delete (window as ElectronWindow).electron;
  localStorage.clear();
  useArtifactsStore.setState({ artifacts: [], comments: [], panelOpen: false, selectedId: null });
  vi.clearAllMocks();
});

describe('initArtifactComments', () => {
  it('attaches delivery listeners once and is idempotent', async () => {
    const injector = makeInjector('running');
    await initArtifactComments(injector);
    await initArtifactComments(injector);
    expect(injector.on).toHaveBeenCalledTimes(2); // messageInjected + messageDropped
  });

  it('re-attaches when the injector instance changes', async () => {
    const first = makeInjector('running');
    const second = makeInjector('running');
    await initArtifactComments(first);
    await initArtifactComments(second);
    expect(first.off).toHaveBeenCalledTimes(2);
    expect(second.on).toHaveBeenCalledTimes(2);
  });

  it('addArtifactComment throws before init', async () => {
    await expect(addArtifactComment(artifact, 'too early')).rejects.toThrow(/not initialized/);
  });
});

describe('addArtifactComment', () => {
  it('returns null for a blank body without persisting', async () => {
    const injector = makeInjector('running');
    await initArtifactComments(injector);
    expect(await addArtifactComment(artifact, '   ')).toBeNull();
    expect(injector.injectMessage).not.toHaveBeenCalled();
    expect(useArtifactsStore.getState().comments).toHaveLength(0);
  });

  it('injects exactly once on a running task and records queued (spec: no cancel/pause)', async () => {
    const injector = makeInjector('running');
    await initArtifactComments(injector);

    const comment = await addArtifactComment(artifact, '  focus on tests  ');

    expect(comment?.delivery).toBe('queued');
    expect(comment?.body).toBe('focus on tests');
    expect(injector.injectMessage).toHaveBeenCalledTimes(1);
    expect(injector.injectMessage).toHaveBeenCalledWith('task-1', 'focus on tests');
    expect(useArtifactsStore.getState().comments).toHaveLength(1);
  });

  it('also injects while the task is still pending', async () => {
    const injector = makeInjector('pending');
    await initArtifactComments(injector);
    const comment = await addArtifactComment(artifact, 'early note');
    expect(comment?.delivery).toBe('queued');
    expect(injector.injectMessage).toHaveBeenCalledTimes(1);
  });

  it('records feedback without injecting when the task is completed', async () => {
    const injector = makeInjector('completed');
    await initArtifactComments(injector);

    const comment = await addArtifactComment(artifact, 'nice work');

    expect(comment?.delivery).toBe('feedback');
    expect(injector.injectMessage).not.toHaveBeenCalled();
  });

  it('records feedback when the task is unknown to the agent system', async () => {
    const injector = makeInjector(undefined);
    await initArtifactComments(injector);
    const comment = await addArtifactComment(artifact, 'orphaned');
    expect(comment?.delivery).toBe('feedback');
    expect(injector.injectMessage).not.toHaveBeenCalled();
  });

  it('degrades to feedback when the push loses the race with task completion', async () => {
    const injector = makeInjector('running', null); // injectMessage refuses
    await initArtifactComments(injector);
    const comment = await addArtifactComment(artifact, 'too late');
    expect(injector.injectMessage).toHaveBeenCalledTimes(1);
    expect(comment?.delivery).toBe('feedback');
    expect(useArtifactsStore.getState().comments[0]?.delivery).toBe('feedback');
  });
});

describe('delivery events', () => {
  it("flips queued → delivered on the channel's messageInjected", async () => {
    const injector = makeInjector('running', { id: 'msg-42' });
    await initArtifactComments(injector);
    const comment = await addArtifactComment(artifact, 'watch the edge case');

    injector.emit('messageInjected', { id: 'task-1' }, { id: 'msg-42' });
    await vi.waitFor(() => {
      expect(useArtifactsStore.getState().comments[0]?.delivery).toBe('delivered');
    });
    expect(comment).not.toBeNull();
  });

  it('degrades queued → feedback on messageDropped (task finished first)', async () => {
    const injector = makeInjector('running', { id: 'msg-7' });
    await initArtifactComments(injector);
    await addArtifactComment(artifact, 'never made it');

    injector.emit('messageDropped', { id: 'task-1' }, { id: 'msg-7' });
    await vi.waitFor(() => {
      expect(useArtifactsStore.getState().comments[0]?.delivery).toBe('feedback');
    });
  });

  it('ignores delivery events for unknown message ids', async () => {
    const injector = makeInjector('running', { id: 'msg-1' });
    await initArtifactComments(injector);
    await addArtifactComment(artifact, 'stable');

    injector.emit('messageInjected', { id: 'task-1' }, { id: 'someone-elses-message' });
    await Promise.resolve();
    expect(useArtifactsStore.getState().comments[0]?.delivery).toBe('queued');
  });
});

describe('deleteCommentsForArtifact', () => {
  it('removes the artifact thread and syncs the UI store', async () => {
    const injector = makeInjector('completed');
    await initArtifactComments(injector);
    await addArtifactComment(artifact, 'first');
    await addArtifactComment({ id: 'a-2', taskId: 'task-1' }, 'other thread');

    await deleteCommentsForArtifact('a-1');

    const remaining = useArtifactsStore.getState().comments;
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.artifactId).toBe('a-2');
  });
});
