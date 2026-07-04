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
