/**
 * Verifiable-artifact types — spec 09 Phase 1 (task_list, plan, diff).
 * Artifacts are the reviewable SURFACE over BackgroundAgentSystem's live
 * task substrate: persisted, typed objects a human can open after the fact
 * and trace back to the task that produced them.
 * Spec: FEATURE_SPECS/competitive-gaps/09-VERIFIABLE-ARTIFACTS.md
 */

/**
 * Full kind union from the spec; Phase 1 records the first three.
 * 'walkthrough' arrives with Phase 3, 'screenshot' with spec 11.
 */
export type ArtifactKind = 'task_list' | 'plan' | 'walkthrough' | 'screenshot' | 'diff';

export type ArtifactStatus = 'draft' | 'final';

export interface Artifact {
  id: string;
  /** BackgroundTask id this artifact was produced by/for */
  taskId: string;
  kind: ArtifactKind;
  title: string;
  /** Markdown for task_list/plan/walkthrough; JSON payload for diff (see artifactContent) */
  content: string;
  createdAt: string;
  updatedAt: string;
  status: ArtifactStatus;
}

/** Minimal structural view of BackgroundAgentSystem used by artifactCapture */
export interface ArtifactTaskEvents {
  on(event: string, listener: (...args: unknown[]) => void): void;
  off(event: string, listener: (...args: unknown[]) => void): void;
}

/**
 * Structural view of BackgroundAgentSystem's mid-run injection primitive
 * (spec 09 Phase 2) as consumed by artifactComments.
 */
export interface ArtifactMessageInjector extends ArtifactTaskEvents {
  getTask(taskId: string): { status: string } | undefined;
  injectMessage(taskId: string, body: string): { id: string } | null;
}

/**
 * How a comment reached (or didn't reach) the agent:
 * queued → injected, awaiting the agent's next step boundary;
 * delivered → folded into a running step's context;
 * feedback → task wasn't running (or finished first) — recorded only.
 */
export type CommentDelivery = 'queued' | 'delivered' | 'feedback';

/** Non-blocking comment on an artifact (spec 09 Phase 2, AC #6/#7) */
export interface ArtifactComment {
  id: string;
  artifactId: string;
  /** BackgroundTask id (copied from the artifact) so delivery events match */
  taskId: string;
  body: string;
  createdAt: string;
  delivery: CommentDelivery;
}

/** Shape of the task payloads BackgroundAgentSystem emits (subset we read) */
export interface CapturedTaskLike {
  id?: string;
  userRequest?: string;
  error?: { message?: string };
}

/** Shape of the step payloads emitted on stepStart/stepComplete (subset) */
export interface CapturedStepLike {
  description?: string;
}
