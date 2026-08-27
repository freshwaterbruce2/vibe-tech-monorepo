/**
 * GitDiffService Tests
 *
 * Feeds real unified-diff strings through the parser and verifies
 * parsed files, hunks, stats, conflict detection, and resolution.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GitDiffService } from '../../services/GitDiffService';
import type { ConflictResolution, FileDiff } from '../../services/GitDiffService';
import type { UnifiedAIService } from '../../services/ai/UnifiedAIService';

const UUID_RE = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';

const simpleDiff = [
  'diff --git a/src/utils/math.ts b/src/utils/math.ts',
  'index 1111111..2222222 100644',
  '--- a/src/utils/math.ts',
  '+++ b/src/utils/math.ts',
  '@@ -1,3 +1,4 @@ function add()',
  ' const a = 1;',
  '-const b = 2;',
  '+const b = 3;',
  '+const c = 4;',
].join('\n');

const newFileDiff = [
  'diff --git a/src/created.ts b/src/created.ts',
  'new file mode 100644',
  'index 0000000..2222222',
  '--- /dev/null',
  '+++ b/src/created.ts',
  '@@ -0,0 +1,2 @@',
  '+export const fresh = true;',
  '+export const shiny = 1;',
].join('\n');

const deletedFileDiff = [
  'diff --git a/src/gone.ts b/src/gone.ts',
  'deleted file mode 100644',
  'index 2222222..0000000',
  '--- a/src/gone.ts',
  '+++ /dev/null',
  '@@ -1,1 +0,0 @@',
  '-export const gone = true;',
].join('\n');

const renamedFileDiff = [
  'diff --git a/src/old-name.ts b/src/new-name.ts',
  'similarity index 95%',
  '--- a/src/old-name.ts',
  '+++ b/src/new-name.ts',
  '@@ -1,2 +1,2 @@',
  ' const kept = true;',
  '-const before = 1;',
  '+const after = 2;',
].join('\n');

const conflictDiff = [
  'diff --git a/src/conflict.ts b/src/conflict.ts',
  'index 1111111..2222222 100644',
  '--- a/src/conflict.ts',
  '+++ b/src/conflict.ts',
  '@@ -1,3 +1,7 @@',
  " const start = 'begin';",
  '+<<<<<<< HEAD',
  "+const value = 'ours';",
  '+=======',
  "+const value = 'theirs';",
  '+>>>>>>> feature-branch',
  " const end = 'done';",
].join('\n');

const makeAiService = () => {
  const complete = vi.fn();
  return { complete, aiService: { complete } as unknown as UnifiedAIService };
};

describe('GitDiffService', () => {
  let service: GitDiffService;
  let complete: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    const mocks = makeAiService();
    complete = mocks.complete;
    service = new GitDiffService(mocks.aiService);
  });

  describe('parseDiff', () => {
    it('parses a modification diff into files, hunks, and stats', () => {
      const files = service.parseDiff(simpleDiff);

      expect(files).toHaveLength(1);
      const file = files[0];
      expect(file.id).toMatch(new RegExp(`^file-${UUID_RE}$`));
      expect(file.filePath).toBe('src/utils/math.ts');
      expect(file.fileName).toBe('math.ts');
      expect(file.changeType).toBe('modification');
      expect(file.oldPath).toBeUndefined();
      expect(file.hasConflicts).toBe(false);
      expect(file.stats).toEqual({ additions: 2, deletions: 1, total: 3 });

      expect(file.hunks).toHaveLength(1);
      const hunk = file.hunks[0];
      expect(hunk.id).toMatch(new RegExp(`^hunk-${UUID_RE}$`));
      expect(hunk.oldStart).toBe(1);
      expect(hunk.oldLines).toBe(3);
      expect(hunk.newStart).toBe(1);
      expect(hunk.newLines).toBe(4);
      expect(hunk.context).toBe('function add()');
      expect(hunk.lines.map(l => l.type)).toEqual(['context', 'deletion', 'addition', 'addition']);
      expect(hunk.lines[1].content).toBe('const b = 2;');
    });

    it('generates unique ids for every parsed file and hunk', () => {
      const first = service.parseDiff(simpleDiff)[0];
      const second = service.parseDiff(simpleDiff)[0];

      expect(first.id).not.toBe(second.id);
      expect(first.hunks[0].id).not.toBe(second.hunks[0].id);
    });

    it('detects new files as additions', () => {
      const files = service.parseDiff(newFileDiff);
      expect(files[0].changeType).toBe('addition');
      expect(files[0].stats).toEqual({ additions: 2, deletions: 0, total: 2 });
    });

    it('detects deleted files as deletions', () => {
      const files = service.parseDiff(deletedFileDiff);
      expect(files[0].changeType).toBe('deletion');
      expect(files[0].stats).toEqual({ additions: 0, deletions: 1, total: 1 });
    });

    it('tracks oldPath for renamed files', () => {
      const files = service.parseDiff(renamedFileDiff);
      expect(files[0].filePath).toBe('src/new-name.ts');
      expect(files[0].oldPath).toBe('src/old-name.ts');
    });

    it('detects conflicts and marks conflict-marker lines', () => {
      const files = service.parseDiff(conflictDiff);
      const file = files[0];

      expect(file.changeType).toBe('conflict');
      expect(file.hasConflicts).toBe(true);
      const markerLines = file.hunks[0].lines.filter(l => l.type === 'conflict-marker');
      expect(markerLines.length).toBe(3);
    });

    it('parses multi-file diffs into separate FileDiff entries', () => {
      const files = service.parseDiff(`${simpleDiff}\n${newFileDiff}`);
      expect(files).toHaveLength(2);
      expect(files.map(f => f.filePath)).toEqual(['src/utils/math.ts', 'src/created.ts']);
    });

    it('returns an empty array for text with no diff headers', () => {
      expect(service.parseDiff('just some random text\nwith no diff at all')).toEqual([]);
    });

    it('parses hunk headers without explicit line counts', () => {
      const singleLineHunk = [
        'diff --git a/one.txt b/one.txt',
        '--- a/one.txt',
        '+++ b/one.txt',
        '@@ -5 +5 @@',
        '-old',
        '+new',
      ].join('\n');

      const [file] = service.parseDiff(singleLineHunk);
      expect(file.hunks[0].oldLines).toBe(1);
      expect(file.hunks[0].newLines).toBe(1);
    });
  });

  describe('analyzeDiff', () => {
    it('builds a summary and attaches AI insights and explanations', async () => {
      complete
        .mockResolvedValueOnce({
          content: JSON.stringify({
            overallImpact: 'Small refactor',
            riskAssessment: 'low',
            suggestions: ['ship it'],
          }),
        })
        .mockResolvedValue({ content: 'Updated constants in math.ts. ' });

      const files = service.parseDiff(`${simpleDiff}\n${conflictDiff}`);
      const analysis = await service.analyzeDiff(files);

      // Conflict markers are typed 'conflict-marker', not additions, so the
      // conflict file contributes only its two real value lines.
      expect(analysis.summary).toEqual({
        filesChanged: 2,
        additions: 4,
        deletions: 1,
        conflicts: 1,
      });
      expect(analysis.aiInsights).toEqual({
        overallImpact: 'Small refactor',
        riskAssessment: 'low',
        suggestions: ['ship it'],
      });
      expect(analysis.files[0].explanation).toBe('Updated constants in math.ts.');
      expect(complete).toHaveBeenCalled();
    });

    it('returns undefined insights when the AI call fails', async () => {
      complete.mockRejectedValue(new Error('offline'));

      const files = service.parseDiff(simpleDiff);
      const analysis = await service.analyzeDiff(files);

      expect(analysis.aiInsights).toBeUndefined();
      expect(analysis.files[0].explanation).toBeUndefined();
      expect(analysis.summary.filesChanged).toBe(1);
    });

    it('returns undefined insights when the AI response has no JSON', async () => {
      complete.mockResolvedValue({ content: 'no json here' });

      const analysis = await service.analyzeDiff(service.parseDiff(simpleDiff));
      expect(analysis.aiInsights).toBeUndefined();
    });
  });

  describe('suggestConflictResolution', () => {
    it('parses a JSON suggestion from the AI', async () => {
      complete.mockResolvedValue({
        content: JSON.stringify({
          resolution: 'theirs',
          explanation: 'Their version is newer',
          preview: "const value = 'theirs';",
        }),
      });

      const [file] = service.parseDiff(conflictDiff);
      const suggestion = await service.suggestConflictResolution(file, file.hunks[0]);

      expect(suggestion.resolution).toBe('theirs');
      expect(suggestion.explanation).toBe('Their version is newer');
      expect(suggestion.preview).toBe("const value = 'theirs';");
    });

    it('falls back to ours when the AI call fails', async () => {
      complete.mockRejectedValue(new Error('offline'));

      const [file] = service.parseDiff(conflictDiff);
      const suggestion = await service.suggestConflictResolution(file, file.hunks[0]);

      expect(suggestion.resolution).toBe('ours');
      expect(suggestion.explanation).toBe('Could not generate AI suggestion');
    });

    it('falls back to ours when the AI response is not JSON', async () => {
      complete.mockResolvedValue({ content: 'nope' });

      const [file] = service.parseDiff(conflictDiff);
      const suggestion = await service.suggestConflictResolution(file, file.hunks[0]);

      expect(suggestion.resolution).toBe('ours');
      expect(suggestion.explanation).toBe('Could not parse AI suggestion');
    });
  });

  describe('applyConflictResolution', () => {
    let conflictFile: FileDiff;

    beforeEach(() => {
      conflictFile = service.parseDiff(conflictDiff)[0];
    });

    const apply = (resolution: ConflictResolution['resolution'], customContent?: string) =>
      service.applyConflictResolution(conflictFile, {
        conflictId: 'c-1',
        resolution,
        customContent,
      });

    it('keeps our side for the "ours" strategy', () => {
      expect(apply('ours')).toBe(
        "const start = 'begin';\nconst value = 'ours';\nconst end = 'done';"
      );
    });

    it('keeps their side for the "theirs" strategy', () => {
      expect(apply('theirs')).toBe(
        "const start = 'begin';\nconst value = 'theirs';\nconst end = 'done';"
      );
    });

    it('keeps both sides for the "both" strategy', () => {
      expect(apply('both')).toBe(
        "const start = 'begin';\nconst value = 'ours';\nconst value = 'theirs';\nconst end = 'done';"
      );
    });

    it('drops both sides for the "neither" strategy', () => {
      expect(apply('neither')).toBe("const start = 'begin';\nconst end = 'done';");
    });

    it('returns custom content directly when provided', () => {
      expect(apply('custom', 'my merged content')).toBe('my merged content');
    });

    it('falls back to ours when custom has no content', () => {
      expect(apply('custom')).toBe(
        "const start = 'begin';\nconst value = 'ours';\nconst end = 'done';"
      );
    });
  });
});
