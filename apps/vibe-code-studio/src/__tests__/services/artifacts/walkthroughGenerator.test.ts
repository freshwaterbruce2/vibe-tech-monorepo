/**
 * walkthroughGenerator tests — the fixed Goal / What Changed / Files Touched /
 * Verification skeleton, step-summary derivation from task_list markdown,
 * file dedupe across diff artifacts, inline screenshot refs, and the
 * text-only graceful degradation when source artifacts are missing.
 */
import { describe, expect, it } from 'vitest';
import { encodeDiffContent, screenshotRef } from '../../../services/artifacts/artifactContent';
import type { Artifact } from '../../../services/artifacts/types';
import {
  buildWalkthroughMarkdown,
  buildWalkthroughTitle,
} from '../../../services/artifacts/walkthroughGenerator';
import type { WalkthroughInput } from '../../../services/artifacts/walkthroughGenerator';

function artifact(overrides: Partial<Artifact>): Artifact {
  return {
    id: 'a-1',
    taskId: 'task-1',
    kind: 'diff',
    title: 'A diff',
    content: '',
    createdAt: new Date(1000).toISOString(),
    updatedAt: new Date(1000).toISOString(),
    status: 'final',
    ...overrides,
  };
}

function diffArtifact(id: string, title: string, paths: Array<[string, 'modify' | 'create']>) {
  return artifact({
    id,
    title,
    kind: 'diff',
    content: encodeDiffContent(
      paths.map(([path, changeType]) => ({
        path,
        originalContent: 'a',
        newContent: 'b',
        changeType,
      }))
    ),
  });
}

function baseInput(overrides: Partial<WalkthroughInput> = {}): WalkthroughInput {
  return {
    userRequest: 'refactor the auth module',
    outcome: 'completed',
    diffs: [],
    screenshots: [],
    ...overrides,
  };
}

describe('buildWalkthroughTitle', () => {
  it('prefixes and truncates the user request to 80 chars', () => {
    expect(buildWalkthroughTitle('fix the bug')).toBe('Walkthrough — fix the bug');
    expect(buildWalkthroughTitle('x'.repeat(100))).toBe(`Walkthrough — ${'x'.repeat(80)}`);
  });

  it('falls back for an empty request', () => {
    expect(buildWalkthroughTitle('')).toBe('Walkthrough — agent task');
  });
});

describe('buildWalkthroughMarkdown', () => {
  it('references every diff and screenshot artifact (spec test scenario)', () => {
    const markdown = buildWalkthroughMarkdown(
      baseInput({
        diffs: [
          diffArtifact('d-1', 'Auth refactor', [['src/auth.ts', 'modify']]),
          diffArtifact('d-2', 'Tests added', [['src/auth.test.ts', 'create']]),
        ],
        screenshots: [artifact({ id: 's-1', kind: 'screenshot', title: 'Login page' })],
      })
    );
    expect(markdown).toContain('- Auth refactor');
    expect(markdown).toContain('- Tests added');
    expect(markdown).toContain(screenshotRef('s-1', 'Login page'));
  });

  it('renders all four skeleton sections with the goal', () => {
    const markdown = buildWalkthroughMarkdown(baseInput());
    for (const heading of [
      '# Walkthrough',
      '## Goal',
      '## What Changed',
      '## Files Touched',
      '## Verification',
    ]) {
      expect(markdown).toContain(heading);
    }
    expect(markdown).toContain('refactor the auth module');
    expect(markdown).toContain('✅ Task completed.');
  });

  it('summarizes checked/unchecked steps from the task_list markdown', () => {
    const markdown = buildWalkthroughMarkdown(
      baseInput({
        taskListContent: [
          '## Steps',
          '- [x] read files',
          '- [x] apply edits',
          '- [ ] run tests',
        ].join('\n'),
      })
    );
    expect(markdown).toContain('2/3 planned steps completed.');
  });

  it('omits the step summary when the task list has no checklist lines', () => {
    const markdown = buildWalkthroughMarkdown(baseInput({ taskListContent: 'just prose' }));
    expect(markdown).not.toContain('planned steps completed');
  });

  it('dedupes files touched across diff artifacts (last change type wins)', () => {
    const markdown = buildWalkthroughMarkdown(
      baseInput({
        diffs: [
          diffArtifact('d-1', 'First pass', [
            ['src/a.ts', 'create'],
            ['src/b.ts', 'modify'],
          ]),
          diffArtifact('d-2', 'Second pass', [['src/a.ts', 'modify']]),
        ],
      })
    );
    expect(markdown).toContain('- `src/a.ts` (modify)');
    expect(markdown).toContain('- `src/b.ts` (modify)');
    expect(markdown.match(/`src\/a\.ts`/g)).toHaveLength(1);
  });

  it('degrades to text-only fallbacks with no diffs or screenshots', () => {
    const markdown = buildWalkthroughMarkdown(baseInput());
    expect(markdown).toContain('No file-change artifacts were recorded for this task.');
    expect(markdown).toContain('No touched files could be derived from the recorded diffs.');
    expect(markdown).toContain('No browser verification evidence was captured for this task.');
  });

  it('handles diff artifacts with undecodable content', () => {
    const markdown = buildWalkthroughMarkdown(
      baseInput({ diffs: [artifact({ id: 'd-x', title: 'Broken diff', content: 'not json' })] })
    );
    expect(markdown).toContain('- Broken diff');
    expect(markdown).toContain('No touched files could be derived from the recorded diffs.');
  });

  it('renders failure outcomes with and without a message', () => {
    expect(
      buildWalkthroughMarkdown(baseInput({ outcome: 'failed', failureMessage: 'boom' }))
    ).toContain('❌ Task failed: boom.');
    expect(buildWalkthroughMarkdown(baseInput({ outcome: 'failed' }))).toContain('❌ Task failed.');
  });

  it('pluralizes the screenshot count line', () => {
    const one = buildWalkthroughMarkdown(
      baseInput({ screenshots: [artifact({ id: 's-1', kind: 'screenshot', title: 'Shot' })] })
    );
    expect(one).toContain('1 browser screenshot captured');
    const two = buildWalkthroughMarkdown(
      baseInput({
        screenshots: [
          artifact({ id: 's-1', kind: 'screenshot', title: 'Shot A' }),
          artifact({ id: 's-2', kind: 'screenshot', title: 'Shot B' }),
        ],
      })
    );
    expect(two).toContain('2 browser screenshots captured');
  });

  it('notes a missing user request in the goal section', () => {
    expect(buildWalkthroughMarkdown(baseInput({ userRequest: '' }))).toContain(
      '(no user request recorded)'
    );
  });

  it('renders verification notes without screenshots (spec 11 Phase 2)', () => {
    const markdown = buildWalkthroughMarkdown(
      baseInput({ verificationNotes: ['✅ Verified http://localhost:5173/ — no console errors.'] })
    );
    expect(markdown).toContain('✅ Verified http://localhost:5173/ — no console errors.');
    expect(markdown).not.toContain('No browser verification evidence');
  });

  it('renders verification notes above the screenshot refs', () => {
    const markdown = buildWalkthroughMarkdown(
      baseInput({
        verificationNotes: ['⚠️ 2 console error(s) detected:'],
        screenshots: [artifact({ id: 's-1', kind: 'screenshot', title: 'Shot' })],
      })
    );
    const notesIndex = markdown.indexOf('⚠️ 2 console error(s) detected:');
    const shotIndex = markdown.indexOf(screenshotRef('s-1', 'Shot'));
    expect(notesIndex).toBeGreaterThan(-1);
    expect(shotIndex).toBeGreaterThan(notesIndex);
    expect(markdown).toContain('1 browser screenshot captured');
  });

  it('keeps the fallback text when verification notes are an empty array', () => {
    expect(buildWalkthroughMarkdown(baseInput({ verificationNotes: [] }))).toContain(
      'No browser verification evidence was captured for this task.'
    );
  });
});
