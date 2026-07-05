/**
 * artifactCapture tests — event-driven task_list lifecycle (AC #12: created
 * at task START), step checklist evolution, finalization on completed/failed,
 * recordDiff/recordPlan APIs, init idempotence, and UI-store sync.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  deleteArtifact,
  initArtifactCapture,
  recordDiffArtifact,
  recordPlanArtifact,
  recordScreenshotArtifact,
  resetArtifactCaptureForTests,
  runArtifactAction,
} from '../../../services/artifacts/artifactCapture';
import {
  decodeDiffContent,
  decodeScreenshotContent,
} from '../../../services/artifacts/artifactContent';
import type { ArtifactTaskEvents } from '../../../services/artifacts/types';
import { useArtifactsStore } from '../../../stores/artifactsStore';

type Listener = (...args: unknown[]) => void;

/** Fake BackgroundAgentSystem event surface */
function makeEvents(): ArtifactTaskEvents & { emit: (event: string, ...args: unknown[]) => void } {
  const listeners = new Map<string, Set<Listener>>();
  return {
    on: (event, listener) => {
      const set = listeners.get(event) ?? new Set();
      set.add(listener);
      listeners.set(event, set);
    },
    off: (event, listener) => {
      listeners.get(event)?.delete(listener);
    },
    emit: (event, ...args) => {
      for (const listener of listeners.get(event) ?? []) listener(...args);
    },
  };
}

/** Wait for the fire-and-forget capture handlers to settle */
const settle = () => new Promise(resolve => setTimeout(resolve, 0));

const task = { id: 'task-1', userRequest: 'refactor the auth module' };

beforeEach(() => {
  delete (window as Window & { electron?: unknown }).electron;
  localStorage.clear();
  useArtifactsStore.setState({ artifacts: [], panelOpen: false, selectedId: null });
});

afterEach(() => {
  resetArtifactCaptureForTests();
  localStorage.clear();
});

describe('task_list lifecycle', () => {
  it('creates a draft task_list at task START (AC #12)', async () => {
    const events = makeEvents();
    await initArtifactCapture(events);
    events.emit('submitted', task);
    await settle();

    const artifacts = useArtifactsStore.getState().artifacts;
    expect(artifacts).toHaveLength(1);
    expect(artifacts[0]).toMatchObject({ taskId: 'task-1', kind: 'task_list', status: 'draft' });
    expect(artifacts[0]?.content).toContain('refactor the auth module');
  });

  it('appends steps on stepStart and checks them on stepComplete', async () => {
    const events = makeEvents();
    await initArtifactCapture(events);
    events.emit('submitted', task);
    await settle();
    events.emit('stepStart', task, { description: 'read files' });
    await settle();
    events.emit('stepStart', task, { description: 'apply edits' });
    await settle();
    events.emit('stepComplete', task, { description: 'read files' });
    await settle();

    const content = useArtifactsStore.getState().artifacts[0]?.content ?? '';
    expect(content).toContain('- [x] read files');
    expect(content).toContain('- [ ] apply edits');
  });

  it('finalizes with a success footer on completed', async () => {
    const events = makeEvents();
    await initArtifactCapture(events);
    events.emit('submitted', task);
    await settle();
    events.emit('completed', task);
    await settle();

    const artifact = useArtifactsStore.getState().artifacts[0];
    expect(artifact?.status).toBe('final');
    expect(artifact?.content).toContain('✅ Task completed.');
  });

  it('finalizes with the failure message on failed', async () => {
    const events = makeEvents();
    await initArtifactCapture(events);
    events.emit('submitted', task);
    await settle();
    events.emit('failed', { ...task, error: { message: 'boom' } });
    await settle();

    const artifact = useArtifactsStore.getState().artifacts[0];
    expect(artifact?.status).toBe('final');
    expect(artifact?.content).toContain('❌ Task failed: boom');
  });

  it('ignores tasks without ids and steps without descriptions', async () => {
    const events = makeEvents();
    await initArtifactCapture(events);
    events.emit('submitted', {});
    events.emit('stepStart', task, {});
    events.emit('completed', { id: 'never-submitted' });
    await settle();
    expect(useArtifactsStore.getState().artifacts).toHaveLength(0);
  });
});

describe('auto walkthrough at settle (spec 09 Phase 3, AC #8)', () => {
  const listWalkthroughs = () =>
    useArtifactsStore.getState().artifacts.filter(a => a.kind === 'walkthrough');

  it('records a final walkthrough on completed, linking diffs and screenshots', async () => {
    const events = makeEvents();
    await initArtifactCapture(events);
    events.emit('submitted', task);
    await settle();
    events.emit('stepStart', task, { description: 'apply edits' });
    await settle();
    events.emit('stepComplete', task, { description: 'apply edits' });
    await settle();
    await recordDiffArtifact('task-1', 'Auth refactor diff', [
      { path: 'src/auth.ts', originalContent: 'a', newContent: 'b', changeType: 'modify' },
    ]);
    const screenshot = await recordScreenshotArtifact('task-1', 'Login page', {
      imageDataUrl: 'data:image/png;base64,AAAA',
      capturedAt: new Date(4000).toISOString(),
    });

    events.emit('completed', task);
    await settle();

    const walkthroughs = listWalkthroughs();
    expect(walkthroughs).toHaveLength(1);
    const walkthrough = walkthroughs[0]!;
    expect(walkthrough).toMatchObject({
      taskId: 'task-1',
      status: 'final',
      title: 'Walkthrough — refactor the auth module',
    });
    expect(walkthrough.content).toContain('## Goal');
    expect(walkthrough.content).toContain('refactor the auth module');
    expect(walkthrough.content).toContain('✅ Task completed.');
    expect(walkthrough.content).toContain('1/1 planned steps completed.');
    expect(walkthrough.content).toContain('- Auth refactor diff');
    expect(walkthrough.content).toContain('- `src/auth.ts` (modify)');
    expect(walkthrough.content).toContain(`![Login page](artifact:${screenshot.id})`);
  });

  it('records a failure walkthrough with the error message', async () => {
    const events = makeEvents();
    await initArtifactCapture(events);
    events.emit('submitted', task);
    await settle();
    events.emit('failed', { ...task, error: { message: 'boom' } });
    await settle();

    const walkthrough = listWalkthroughs()[0];
    expect(walkthrough?.content).toContain('❌ Task failed: boom.');
    expect(walkthrough?.content).toContain(
      'No browser verification evidence was captured for this task.'
    );
  });

  it('does not generate a walkthrough for tasks it never observed', async () => {
    const events = makeEvents();
    await initArtifactCapture(events);
    events.emit('completed', { id: 'never-submitted', userRequest: 'x' });
    await settle();
    expect(listWalkthroughs()).toHaveLength(0);
  });
});

describe('initArtifactCapture', () => {
  it('is idempotent and does not double-attach listeners', async () => {
    const events = makeEvents();
    await initArtifactCapture(events);
    await initArtifactCapture(events);
    events.emit('submitted', task);
    await settle();
    expect(useArtifactsStore.getState().artifacts).toHaveLength(1); // not 2
  });

  it('re-attaches when the event source changes', async () => {
    const first = makeEvents();
    const second = makeEvents();
    await initArtifactCapture(first);
    await initArtifactCapture(second);

    first.emit('submitted', task);
    await settle();
    expect(useArtifactsStore.getState().artifacts).toHaveLength(0); // detached

    second.emit('submitted', task);
    await settle();
    expect(useArtifactsStore.getState().artifacts).toHaveLength(1);
  });

  it('syncs persisted artifacts into the UI store on init', async () => {
    localStorage.setItem(
      'vcs_artifacts',
      JSON.stringify([
        {
          id: 'artifact-1',
          taskId: 't1',
          kind: 'plan',
          title: 'Plan',
          content: '# plan',
          createdAt: new Date(1000).toISOString(),
          updatedAt: new Date(1000).toISOString(),
          status: 'final',
        },
      ])
    );
    await initArtifactCapture(makeEvents());
    expect(useArtifactsStore.getState().artifacts.map(a => a.id)).toEqual(['artifact-1']);
  });
});

describe('record APIs', () => {
  it('recordDiffArtifact stores an encoded FileChange payload', async () => {
    await initArtifactCapture(makeEvents());
    const artifact = await recordDiffArtifact('task-1', 'Auth refactor diff', [
      {
        path: 'src/auth.ts',
        originalContent: 'a',
        newContent: 'b',
        changeType: 'modify',
      },
    ]);
    expect(artifact.kind).toBe('diff');
    expect(artifact.status).toBe('final');
    expect(decodeDiffContent(artifact.content)?.changes[0]?.path).toBe('src/auth.ts');
    expect(useArtifactsStore.getState().artifacts.map(a => a.id)).toContain(artifact.id);
  });

  it('recordScreenshotArtifact stores an encoded screenshot payload (spec 11 AC #6)', async () => {
    await initArtifactCapture(makeEvents());
    const artifact = await recordScreenshotArtifact('task-1', 'Screenshot — verify', {
      imageDataUrl: 'data:image/png;base64,AAAA',
      capturedAt: new Date(5000).toISOString(),
      description: 'verify the page',
    });
    expect(artifact.kind).toBe('screenshot');
    expect(artifact.status).toBe('final');
    expect(decodeScreenshotContent(artifact.content)?.imageDataUrl).toBe(
      'data:image/png;base64,AAAA'
    );
    expect(useArtifactsStore.getState().artifacts.map(a => a.id)).toContain(artifact.id);
  });

  it('recordPlanArtifact stores markdown', async () => {
    await initArtifactCapture(makeEvents());
    const artifact = await recordPlanArtifact('task-1', 'Plan', '# The plan');
    expect(artifact.kind).toBe('plan');
    expect(artifact.content).toBe('# The plan');
  });

  it('deleteArtifact removes and syncs', async () => {
    await initArtifactCapture(makeEvents());
    const artifact = await recordPlanArtifact('task-1', 'Plan', '# p');
    await deleteArtifact(artifact.id);
    expect(useArtifactsStore.getState().artifacts).toHaveLength(0);
  });

  it('record APIs throw before init', async () => {
    resetArtifactCaptureForTests();
    await expect(recordPlanArtifact('t', 'x', 'y')).rejects.toThrow(/not initialized/);
  });
});

describe('runArtifactAction', () => {
  it('runs the action and swallows/logs rejections', async () => {
    const ok = vi.fn().mockResolvedValue('done');
    runArtifactAction(ok, 'ok-case');
    runArtifactAction(() => Promise.reject(new Error('nope')), 'fail-case');
    await settle();
    expect(ok).toHaveBeenCalled();
  });
});
