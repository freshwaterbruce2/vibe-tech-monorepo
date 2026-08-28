/**
 * Artifact comments → running agent (spec 09 Phase 2). addArtifactComment
 * persists the comment and, when the originating task is still active,
 * pushes the body through BackgroundAgentSystem.injectMessage — the agent
 * keeps running and picks the note up at its next step boundary. Delivery
 * state tracks the channel's events: 'messageInjected' flips queued →
 * delivered; 'messageDropped' (task finished first) degrades to feedback.
 * Completed tasks skip injection entirely — the comment is plain feedback.
 * Spec: FEATURE_SPECS/competitive-gaps/09-VERIFIABLE-ARTIFACTS.md
 */
import { useArtifactsStore } from '../../stores/artifactsStore';
import { runArtifactAction } from './artifactCapture';
import { ArtifactCommentStore } from './ArtifactCommentStore';
import type { Artifact, ArtifactComment, ArtifactMessageInjector, CommentDelivery } from './types';

let commentStoreInstance: ArtifactCommentStore | null = null;
let attachedInjector: ArtifactMessageInjector | null = null;
/** InjectedMessage id → comment id, to flip delivery on channel events */
const messageComments = new Map<string, string>();

function syncCommentsToUiStore(): void {
  if (!commentStoreInstance) return;
  useArtifactsStore.getState().actions.setComments(commentStoreInstance.list());
}

function requireCommentStore(): ArtifactCommentStore {
  if (!commentStoreInstance) {
    throw new Error('Artifact comments not initialized — call initArtifactComments');
  }
  return commentStoreInstance;
}

async function onDeliveryEvent(messageId: string, delivery: CommentDelivery): Promise<void> {
  const commentId = messageComments.get(messageId);
  if (!commentId) return;
  messageComments.delete(messageId);
  await requireCommentStore().setDelivery(commentId, delivery);
  syncCommentsToUiStore();
}

const injectorListeners: Record<string, (...args: unknown[]) => void> = {
  messageInjected: (...args) =>
    runArtifactAction(
      () => onDeliveryEvent((args[1] as { id: string }).id, 'delivered'),
      'comment delivery'
    ),
  messageDropped: (...args) =>
    runArtifactAction(
      () => onDeliveryEvent((args[1] as { id: string }).id, 'feedback'),
      'comment drop'
    ),
};

/**
 * Create (once) the comment store and attach delivery listeners to the
 * injection channel. Idempotent across React re-mounts.
 */
export async function initArtifactComments(
  injector: ArtifactMessageInjector
): Promise<ArtifactCommentStore> {
  commentStoreInstance ??= new ArtifactCommentStore();
  await commentStoreInstance.load();
  if (attachedInjector !== injector) {
    if (attachedInjector) {
      for (const [event, listener] of Object.entries(injectorListeners)) {
        attachedInjector.off(event, listener);
      }
    }
    for (const [event, listener] of Object.entries(injectorListeners)) {
      injector.on(event, listener);
    }
    attachedInjector = injector;
  }
  syncCommentsToUiStore();
  return commentStoreInstance;
}

/**
 * Persist a comment on an artifact; inject it into the task's message queue
 * when the task is still pending/running (non-blocking — never pauses or
 * cancels). Returns null for blank input.
 */
export async function addArtifactComment(
  artifact: Pick<Artifact, 'id' | 'taskId'>,
  body: string
): Promise<ArtifactComment | null> {
  const trimmed = body.trim();
  if (!trimmed) return null;

  const status = attachedInjector?.getTask(artifact.taskId)?.status;
  const active = status === 'pending' || status === 'running';
  let comment = await requireCommentStore().add({
    artifactId: artifact.id,
    taskId: artifact.taskId,
    body: trimmed,
    delivery: active ? 'queued' : 'feedback',
  });

  if (active) {
    // Map synchronously after injectMessage so a fast drain can't outrun it
    const message = attachedInjector?.injectMessage(artifact.taskId, trimmed) ?? null;
    if (message) {
      messageComments.set(message.id, comment.id);
    } else {
      // Task finished between the status check and the push — degrade
      comment = (await requireCommentStore().setDelivery(comment.id, 'feedback')) ?? comment;
    }
  }

  syncCommentsToUiStore();
  return comment;
}

/** Cascade used by the panel host when an artifact is deleted */
export async function deleteCommentsForArtifact(artifactId: string): Promise<void> {
  await requireCommentStore().removeByArtifact(artifactId);
  syncCommentsToUiStore();
}

/** Test seam: detach listeners and clear singletons */
export function resetArtifactCommentsForTests(): void {
  if (attachedInjector) {
    for (const [event, listener] of Object.entries(injectorListeners)) {
      attachedInjector.off(event, listener);
    }
  }
  attachedInjector = null;
  commentStoreInstance = null;
  messageComments.clear();
}
