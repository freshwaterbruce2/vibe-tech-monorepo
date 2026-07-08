/**
 * Artifact content codecs — diff artifacts store FileChange[] as JSON so the
 * panel can re-render them through the existing MultiFileDiffView (spec 09
 * AC #4). Decoding is zod-validated and never throws: malformed content
 * degrades to null and the panel falls back to a raw view.
 * Spec: FEATURE_SPECS/competitive-gaps/09-VERIFIABLE-ARTIFACTS.md
 */
import { z } from 'zod';
import type { FileChange } from '@vibetech/types';

const fileChangeSchema = z.object({
  path: z.string().min(1),
  originalContent: z.string(),
  newContent: z.string(),
  diff: z.string().optional(),
  changeType: z.enum(['modify', 'create', 'delete']),
  reason: z.string().optional(),
});

const diffContentSchema = z.object({
  changes: z.array(fileChangeSchema),
  estimatedImpact: z.enum(['low', 'medium', 'high']).default('medium'),
});

export interface DiffArtifactContent {
  changes: FileChange[];
  estimatedImpact: 'low' | 'medium' | 'high';
}

/** Serialize a diff payload for Artifact.content */
export function encodeDiffContent(
  changes: FileChange[],
  estimatedImpact: DiffArtifactContent['estimatedImpact'] = 'medium'
): string {
  return JSON.stringify({ changes, estimatedImpact });
}

/** Parse Artifact.content for kind 'diff'; null when malformed */
export function decodeDiffContent(content: string): DiffArtifactContent | null {
  try {
    const result = diffContentSchema.safeParse(JSON.parse(content));
    return result.success ? (result.data as DiffArtifactContent) : null;
  } catch {
    return null;
  }
}

const screenshotContentSchema = z.object({
  /** data: URL (base64) — rendered directly by the panel */
  imageDataUrl: z.string().min(1),
  capturedAt: z.string().min(1),
  /** What the browser session was verifying when this was captured */
  description: z.string().optional(),
});

export interface ScreenshotArtifactContent {
  imageDataUrl: string;
  capturedAt: string;
  description?: string;
}

/** Serialize a screenshot payload for Artifact.content (spec 11 AC #6) */
export function encodeScreenshotContent(payload: ScreenshotArtifactContent): string {
  return JSON.stringify(payload);
}

/** Parse Artifact.content for kind 'screenshot'; null when malformed */
export function decodeScreenshotContent(content: string): ScreenshotArtifactContent | null {
  try {
    const result = screenshotContentSchema.safeParse(JSON.parse(content));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

/**
 * Inline screenshot reference used in walkthrough markdown (spec 09 Phase 3).
 * Walkthroughs stay text-only — image bytes live in the referenced
 * screenshot artifact, resolved at render time by the viewer.
 */
export function screenshotRef(artifactId: string, title: string): string {
  return `![${title}](artifact:${artifactId})`;
}

export type WalkthroughSegment =
  | { type: 'text'; text: string }
  | { type: 'screenshot'; artifactId: string; title: string };

const SCREENSHOT_REF_RE = /!\[([^\]]*)\]\(artifact:([^)\s]+)\)/g;

/**
 * Split walkthrough markdown into text runs and screenshot references so the
 * viewer can render referenced images inline (missing refs degrade to text).
 */
export function splitWalkthroughSegments(markdown: string): WalkthroughSegment[] {
  const segments: WalkthroughSegment[] = [];
  let last = 0;
  for (const match of markdown.matchAll(SCREENSHOT_REF_RE)) {
    const index = match.index ?? 0;
    if (index > last) {
      segments.push({ type: 'text', text: markdown.slice(last, index) });
    }
    segments.push({ type: 'screenshot', title: match[1] ?? '', artifactId: match[2] ?? '' });
    last = index + match[0].length;
  }
  if (last < markdown.length) {
    segments.push({ type: 'text', text: markdown.slice(last) });
  }
  return segments;
}

/** Markdown checklist line for a task_list artifact */
export function taskListLine(description: string, done: boolean): string {
  return `- [${done ? 'x' : ' '}] ${description}`;
}

/** Flip a step's checklist line from unchecked to checked (first match) */
export function checkTaskListLine(content: string, description: string): string {
  const unchecked = taskListLine(description, false);
  const index = content.indexOf(unchecked);
  if (index === -1) return content;
  return (
    content.slice(0, index) +
    taskListLine(description, true) +
    content.slice(index + unchecked.length)
  );
}
