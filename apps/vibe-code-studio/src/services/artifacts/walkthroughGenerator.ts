/**
 * Walkthrough generator — spec 09 Phase 3 (AC #8). Builds the fixed markdown
 * skeleton (Goal / What Changed / Files Touched / Verification) from the
 * artifacts already recorded for a task: task_list outcome, diff artifacts
 * (files touched), and spec-11 screenshot artifacts embedded as inline
 * references. Pure functions — capture wiring lives in artifactCapture.
 * Spec: FEATURE_SPECS/competitive-gaps/09-VERIFIABLE-ARTIFACTS.md
 */
import { decodeDiffContent, screenshotRef } from './artifactContent';
import type { Artifact } from './types';

export type WalkthroughOutcome = 'completed' | 'failed';

export interface WalkthroughInput {
  userRequest: string;
  outcome: WalkthroughOutcome;
  failureMessage?: string;
  /** Final task_list markdown (checked/unchecked step lines) */
  taskListContent?: string;
  /** diff-kind artifacts recorded for the task */
  diffs: Artifact[];
  /** screenshot-kind artifacts recorded for the task (spec 11) */
  screenshots: Artifact[];
  /** Verification notes from the spec-11 Phase-2 autonomous pass */
  verificationNotes?: string[];
}

export function buildWalkthroughTitle(userRequest: string): string {
  return `Walkthrough — ${(userRequest || 'agent task').slice(0, 80)}`;
}

/** "3/4 steps completed" from the task_list checklist markdown */
function stepSummary(taskListContent: string | undefined): string | null {
  if (!taskListContent) return null;
  const done = (taskListContent.match(/^- \[x\] /gm) ?? []).length;
  const open = (taskListContent.match(/^- \[ \] /gm) ?? []).length;
  const total = done + open;
  if (total === 0) return null;
  return `${done}/${total} planned steps completed.`;
}

function outcomeLine(input: WalkthroughInput): string {
  if (input.outcome === 'completed') {
    return '✅ Task completed.';
  }
  return `❌ Task failed${input.failureMessage ? `: ${input.failureMessage}` : ''}.`;
}

function whatChangedSection(input: WalkthroughInput): string[] {
  const lines = [outcomeLine(input)];
  const summary = stepSummary(input.taskListContent);
  if (summary) lines.push(summary);
  if (input.diffs.length > 0) {
    lines.push('', 'Recorded change sets:');
    for (const diff of input.diffs) {
      lines.push(`- ${diff.title}`);
    }
  } else {
    lines.push('', 'No file-change artifacts were recorded for this task.');
  }
  return lines;
}

/** Deduped `path (changeType)` lines across every diff artifact */
function filesTouchedSection(diffs: Artifact[]): string[] {
  const byPath = new Map<string, string>();
  for (const diff of diffs) {
    const decoded = decodeDiffContent(diff.content);
    for (const change of decoded?.changes ?? []) {
      byPath.set(change.path, change.changeType);
    }
  }
  if (byPath.size === 0) {
    return ['No touched files could be derived from the recorded diffs.'];
  }
  return [...byPath.entries()].map(([path, changeType]) => `- \`${path}\` (${changeType})`);
}

function verificationSection(screenshots: Artifact[], notes: string[] = []): string[] {
  const lines = [...notes];
  if (screenshots.length === 0) {
    if (lines.length === 0) {
      lines.push('No browser verification evidence was captured for this task.');
    }
    return lines;
  }
  if (lines.length > 0) lines.push('');
  lines.push(
    `${screenshots.length} browser screenshot${screenshots.length === 1 ? '' : 's'} captured during verification (spec 11):`,
    ''
  );
  for (const screenshot of screenshots) {
    lines.push(screenshotRef(screenshot.id, screenshot.title), '');
  }
  return lines;
}

/**
 * Render the walkthrough markdown. Degrades gracefully: every section has a
 * text-only fallback when its source artifacts don't exist (spec Phase 3).
 */
export function buildWalkthroughMarkdown(input: WalkthroughInput): string {
  return [
    '# Walkthrough',
    '',
    '## Goal',
    '',
    input.userRequest || '(no user request recorded)',
    '',
    '## What Changed',
    '',
    ...whatChangedSection(input),
    '',
    '## Files Touched',
    '',
    ...filesTouchedSection(input.diffs),
    '',
    '## Verification',
    '',
    ...verificationSection(input.screenshots, input.verificationNotes),
  ].join('\n');
}
