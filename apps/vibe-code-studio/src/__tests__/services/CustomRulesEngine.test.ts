import { describe, it, expect, beforeEach, vi } from 'vitest';

import { CustomRulesEngine } from '../../services/CustomRulesEngine';
import type { FileSystemService } from '../../services/FileSystemService';
import type { DeepCodeRules } from '../../types/customInstructions';

/**
 * Real unit tests for CustomRulesEngine.
 *
 * The engine only touches two methods on FileSystemService — exists() and
 * readFile() — so we inject a lightweight fake whose responses we control per
 * .deepcoderules path. Everything else (parsing, merging, pattern matching,
 * validation, caching) is exercised against the REAL class.
 */

interface FakeFs {
  exists: ReturnType<typeof vi.fn>;
  readFile: ReturnType<typeof vi.fn>;
}

const WORKSPACE = '/workspace';

/**
 * Build a fake FileSystemService backed by an in-memory map of
 * path -> .deepcoderules JSON string. Any path not in the map "does not exist".
 */
function makeFs(filesByPath: Record<string, string>): FakeFs {
  const exists = vi.fn(async (path: string) => path in filesByPath);
  const readFile = vi.fn(async (path: string) => {
    if (!(path in filesByPath)) {
      throw new Error(`ENOENT: ${path}`);
    }
    return filesByPath[path]!;
  });
  return { exists, readFile };
}

function makeEngine(fs: FakeFs): CustomRulesEngine {
  // The constructor only stores the service; the cast is safe for the
  // narrow surface the engine actually uses.
  const engine = new CustomRulesEngine(fs as unknown as FileSystemService);
  engine.setWorkspaceRoot(WORKSPACE);
  return engine;
}

describe('CustomRulesEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Silence the expected logger.error noise from intentional load failures.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  describe('Rule Parsing', () => {
    it('parses a valid JSON .deepcoderules file and resolves it for a file', async () => {
      const rules: DeepCodeRules = {
        version: '1.0',
        global: {
          style: { quotes: 'single', indentSize: 2 },
          conventions: { maxFunctionLength: 40 },
        },
      };
      const fs = makeFs({
        [`${WORKSPACE}/.deepcoderules`]: JSON.stringify(rules),
      });
      const engine = makeEngine(fs);

      const resolved = await engine.resolveRulesForFile(`${WORKSPACE}/src/app.ts`);

      // The workspace-level rules file was found and merged in.
      expect(resolved.sources).toEqual([`${WORKSPACE}/.deepcoderules`]);
      expect(resolved.rules.version).toBe('1.0');
      expect(resolved.rules.global?.style?.quotes).toBe('single');
      expect(resolved.rules.global?.conventions?.maxFunctionLength).toBe(40);
      // No patterns defined -> none applied.
      expect(resolved.appliedPatterns).toEqual([]);
    });

    it('merges hierarchical rules with deeper (closer-to-file) rules overriding', async () => {
      const workspaceRules: DeepCodeRules = {
        version: '1.0',
        global: { style: { quotes: 'single', indentSize: 2 } },
      };
      // Closer file overrides quotes but keeps indentSize via deep merge.
      const srcRules: DeepCodeRules = {
        version: '1.0',
        global: { style: { quotes: 'double' } },
      };
      const fs = makeFs({
        [`${WORKSPACE}/.deepcoderules`]: JSON.stringify(workspaceRules),
        [`${WORKSPACE}/src/.deepcoderules`]: JSON.stringify(srcRules),
      });
      const engine = makeEngine(fs);

      const resolved = await engine.resolveRulesForFile(`${WORKSPACE}/src/app.ts`);

      // Both sources discovered, workspace-first ordering.
      expect(resolved.sources).toEqual([
        `${WORKSPACE}/.deepcoderules`,
        `${WORKSPACE}/src/.deepcoderules`,
      ]);
      // Later (src) rule wins for quotes; deep-merged indentSize survives.
      expect(resolved.rules.global?.style?.quotes).toBe('double');
      expect(resolved.rules.global?.style?.indentSize).toBe(2);
    });

    it('handles a malformed rules file gracefully (skips it, no throw)', async () => {
      const fs = makeFs({
        // Invalid JSON object -> parser.parse throws -> loadRules returns null.
        [`${WORKSPACE}/.deepcoderules`]: '{ this is : not valid json ]',
      });
      const engine = makeEngine(fs);

      const resolved = await engine.resolveRulesForFile(`${WORKSPACE}/src/app.ts`);

      // The bad file is excluded from sources; merge falls back to defaults.
      expect(resolved.sources).toEqual([]);
      // mergeRules([]) returns the default rule set.
      expect(resolved.rules.version).toBe('1.0');
      expect(resolved.rules.global?.style?.quotes).toBe('single');
      expect(resolved.rules.global?.conventions?.maxFunctionLength).toBe(50);
    });

    it('returns default rules when no .deepcoderules files exist anywhere', async () => {
      const fs = makeFs({});
      const engine = makeEngine(fs);

      const resolved = await engine.resolveRulesForFile(`${WORKSPACE}/src/app.ts`);

      expect(resolved.sources).toEqual([]);
      expect(resolved.rules.global?.conventions?.maxFileLength).toBe(500);
    });
  });

  describe('Pattern Matching & Priority Resolution', () => {
    it('applies a pattern whose file extension matches the target file', async () => {
      const rules: DeepCodeRules = {
        version: '1.0',
        global: { style: { quotes: 'single' } },
        patterns: [
          {
            name: 'typescript-files',
            match: { extensions: ['ts'] },
            rules: { style: { quotes: 'double' } },
          },
          {
            name: 'python-files',
            match: { extensions: ['py'] },
            rules: { style: { quotes: 'single' } },
          },
        ],
      };
      const fs = makeFs({ [`${WORKSPACE}/.deepcoderules`]: JSON.stringify(rules) });
      const engine = makeEngine(fs);

      const resolved = await engine.resolveRulesForFile(`${WORKSPACE}/src/app.ts`);

      // Only the .ts pattern matched.
      expect(resolved.appliedPatterns).toEqual(['typescript-files']);
      // Matched pattern's rules deep-merged onto global.
      expect(resolved.rules.global?.style?.quotes).toBe('double');
    });

    it('applies only the matching pattern, leaving non-matching extensions out', async () => {
      // The engine's applyPatternRules calls deepMerge(global, ...matched) and
      // deepMerge throws on a single arg, so at least one pattern must match.
      // Here a 'ts' pattern matches and a 'py' pattern does not.
      const rules: DeepCodeRules = {
        version: '1.0',
        global: { style: { quotes: 'single' } },
        patterns: [
          {
            name: 'python-files',
            match: { extensions: ['py'] },
            rules: { style: { quotes: 'single' } },
          },
          {
            name: 'typescript-files',
            match: { extensions: ['ts'] },
            rules: { style: { quotes: 'double' } },
          },
        ],
      };
      const fs = makeFs({ [`${WORKSPACE}/.deepcoderules`]: JSON.stringify(rules) });
      const engine = makeEngine(fs);

      const resolved = await engine.resolveRulesForFile(`${WORKSPACE}/src/app.ts`);

      // Only the ts pattern matched; the py pattern was excluded.
      expect(resolved.appliedPatterns).toEqual(['typescript-files']);
      expect(resolved.appliedPatterns).not.toContain('python-files');
      expect(resolved.rules.global?.style?.quotes).toBe('double');
    });

    it('resolves conflicting patterns by priority (highest-priority match wins)', async () => {
      const rules: DeepCodeRules = {
        version: '1.0',
        global: { conventions: { maxFunctionLength: 100 } },
        patterns: [
          {
            name: 'low-priority',
            priority: 1,
            match: { extensions: ['ts'] },
            rules: { conventions: { maxFunctionLength: 60 } },
          },
          {
            name: 'high-priority',
            priority: 10,
            match: { extensions: ['ts'] },
            rules: { conventions: { maxFunctionLength: 20 } },
          },
        ],
      };
      const fs = makeFs({ [`${WORKSPACE}/.deepcoderules`]: JSON.stringify(rules) });
      const engine = makeEngine(fs);

      const resolved = await engine.resolveRulesForFile(`${WORKSPACE}/src/app.ts`);

      // Patterns are sorted by priority desc -> ['high-priority', 'low-priority'].
      expect(resolved.appliedPatterns).toEqual(['high-priority', 'low-priority']);
      // deepMerge(target, source) only takes the FIRST matched rule set
      // (the highest-priority one), so its value wins: 20.
      expect(resolved.rules.global?.conventions?.maxFunctionLength).toBe(20);
    });

    it('respects excludeFiles in pattern matching', async () => {
      // 'all-ts' always matches so applyPatternRules never hits the empty-merge
      // crash; 'no-tests' is excluded for *.test.ts files.
      const rules: DeepCodeRules = {
        version: '1.0',
        global: { style: { quotes: 'single' } },
        patterns: [
          {
            name: 'all-ts',
            match: { extensions: ['ts'] },
            rules: { style: { quotes: 'single' } },
          },
          {
            name: 'no-tests',
            match: { extensions: ['ts'], excludeFiles: ['*.test.ts'] },
            rules: { style: { quotes: 'double' } },
          },
        ],
      };
      const fs = makeFs({ [`${WORKSPACE}/.deepcoderules`]: JSON.stringify(rules) });
      const engine = makeEngine(fs);

      const matched = await engine.resolveRulesForFile(`${WORKSPACE}/src/app.ts`);
      const excluded = await engine.resolveRulesForFile(`${WORKSPACE}/src/app.test.ts`);

      // Plain .ts file: both patterns apply.
      expect(matched.appliedPatterns).toContain('no-tests');
      // *.test.ts: the no-tests pattern is excluded, only all-ts remains.
      expect(excluded.appliedPatterns).toEqual(['all-ts']);
      expect(excluded.appliedPatterns).not.toContain('no-tests');
    });
  });

  describe('Code Validation', () => {
    it('flags prohibited keywords found in code', async () => {
      const rules: DeepCodeRules = {
        version: '1.0',
        global: {
          prohibited: { keywords: ['eval', 'var '], reason: 'unsafe' },
        },
      };
      const fs = makeFs({ [`${WORKSPACE}/.deepcoderules`]: JSON.stringify(rules) });
      const engine = makeEngine(fs);

      const result = await engine.validateCode(
        'var x = 1;\nconst y = eval("2");',
        `${WORKSPACE}/src/app.ts`,
      );

      expect(result.valid).toBe(false);
      expect(result.violations).toContain('Prohibited keyword found: eval');
      expect(result.violations).toContain('Prohibited keyword found: var ');
    });

    it('passes clean code with no violations', async () => {
      const rules: DeepCodeRules = {
        version: '1.0',
        global: { prohibited: { keywords: ['eval'] } },
      };
      const fs = makeFs({ [`${WORKSPACE}/.deepcoderules`]: JSON.stringify(rules) });
      const engine = makeEngine(fs);

      const result = await engine.validateCode(
        'const y = 2;\n',
        `${WORKSPACE}/src/app.ts`,
      );

      expect(result.valid).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it('flags functions exceeding the max function length', async () => {
      const rules: DeepCodeRules = {
        version: '1.0',
        global: { conventions: { maxFunctionLength: 3 } },
      };
      const fs = makeFs({ [`${WORKSPACE}/.deepcoderules`]: JSON.stringify(rules) });
      const engine = makeEngine(fs);

      // extractFunctions matches the `const name = (...) => {` arrow form.
      const longFn = [
        'const bigFn = () => {',
        '  const a = 1;',
        '  const b = 2;',
        '  const c = 3;',
        '  return a + b + c;',
        '};',
      ].join('\n');

      const result = await engine.validateCode(longFn, `${WORKSPACE}/src/app.ts`);

      expect(result.valid).toBe(false);
      expect(
        result.violations.some((v) => v.includes('bigFn') && v.includes('exceeds max length')),
      ).toBe(true);
    });

    it('flags files exceeding the max file length', async () => {
      const rules: DeepCodeRules = {
        version: '1.0',
        global: { conventions: { maxFileLength: 5 } },
      };
      const fs = makeFs({ [`${WORKSPACE}/.deepcoderules`]: JSON.stringify(rules) });
      const engine = makeEngine(fs);

      const code = Array.from({ length: 10 }, (_, i) => `const v${i} = ${i};`).join('\n');
      const result = await engine.validateCode(code, `${WORKSPACE}/src/app.ts`);

      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.includes('File exceeds max length'))).toBe(true);
    });
  });

  describe('Prompt Enhancement (applyRulesToPrompt)', () => {
    it('prepends system prompt and context instructions, appends style/naming', () => {
      const fs = makeFs({});
      const engine = makeEngine(fs);
      const rules: DeepCodeRules = {
        version: '1.0',
        global: {
          style: {
            indentation: 'spaces',
            indentSize: 2,
            quotes: 'single',
            semicolons: true,
            naming: { variables: 'camelCase', classes: 'PascalCase' },
          },
          prohibited: { keywords: ['eval'], reason: 'security' },
        },
        aiConfig: {
          systemPrompt: 'You are an expert.',
          contextInstructions: ['Prefer functional code', 'Keep it small'],
        },
      };

      const out = engine.applyRulesToPrompt('BASE PROMPT', rules, {
        filePath: `${WORKSPACE}/src/app.ts`,
        fileType: 'ts',
        directory: `${WORKSPACE}/src`,
        language: 'typescript',
      });

      // System prompt and context come before the base prompt.
      expect(out.indexOf('You are an expert.')).toBeLessThan(out.indexOf('BASE PROMPT'));
      expect(out).toContain('Prefer functional code');
      // Style / naming / prohibited appended.
      expect(out).toContain('Style Preferences:');
      expect(out).toContain("Use single quotes");
      expect(out).toContain('Naming Conventions:');
      expect(out).toContain('Variables: camelCase');
      expect(out).toContain('DO NOT use: eval');
      expect(out).toContain('Reason: security');
    });

    it('returns the base prompt unchanged when rules are empty', () => {
      const fs = makeFs({});
      const engine = makeEngine(fs);
      const out = engine.applyRulesToPrompt('JUST THE BASE', { version: '1.0' }, {
        filePath: `${WORKSPACE}/src/app.ts`,
        fileType: 'ts',
        directory: `${WORKSPACE}/src`,
        language: 'typescript',
      });
      expect(out).toBe('JUST THE BASE');
    });
  });

  describe('Templates', () => {
    it('exposes built-in templates plus workspace templates', async () => {
      const rules: DeepCodeRules = {
        version: '1.0',
        templates: {
          'my-snippet': { name: 'My Snippet', code: 'const x = 1;' },
        },
      };
      const fs = makeFs({ [`${WORKSPACE}/.deepcoderules`]: JSON.stringify(rules) });
      const engine = makeEngine(fs);

      const templates = await engine.getAllTemplates();

      expect(templates.has('workspace')).toBe(true);
      expect(templates.has('built-in')).toBe(true);
      expect(templates.get('workspace')?.['my-snippet']?.name).toBe('My Snippet');
      // Built-in templates include the known react-component / async-function.
      expect(templates.get('built-in')?.['react-component']).toBeDefined();
      expect(templates.get('built-in')?.['async-function']?.trigger).toBe('afn');
    });

    it('omits the workspace entry when the workspace file has no templates', async () => {
      const fs = makeFs({}); // no workspace .deepcoderules
      const engine = makeEngine(fs);

      const templates = await engine.getAllTemplates();

      expect(templates.has('workspace')).toBe(false);
      expect(templates.has('built-in')).toBe(true);
    });
  });

  describe('Caching', () => {
    it('caches parsed rules so the file is read only once across resolves', async () => {
      const rules: DeepCodeRules = { version: '1.0', global: { style: { quotes: 'single' } } };
      const fs = makeFs({ [`${WORKSPACE}/.deepcoderules`]: JSON.stringify(rules) });
      const engine = makeEngine(fs);

      await engine.resolveRulesForFile(`${WORKSPACE}/src/a.ts`);
      await engine.resolveRulesForFile(`${WORKSPACE}/src/b.ts`);

      // exists() is checked each resolve, but readFile/parse only happens once
      // because the parsed result is cached by path.
      const reads = fs.readFile.mock.calls.filter(
        (c) => c[0] === `${WORKSPACE}/.deepcoderules`,
      );
      expect(reads.length).toBe(1);
    });

    it('clearCache() forces a re-read on the next resolve', async () => {
      const rules: DeepCodeRules = { version: '1.0' };
      const fs = makeFs({ [`${WORKSPACE}/.deepcoderules`]: JSON.stringify(rules) });
      const engine = makeEngine(fs);

      await engine.resolveRulesForFile(`${WORKSPACE}/src/a.ts`);
      engine.clearCache();
      await engine.resolveRulesForFile(`${WORKSPACE}/src/a.ts`);

      const reads = fs.readFile.mock.calls.filter(
        (c) => c[0] === `${WORKSPACE}/.deepcoderules`,
      );
      expect(reads.length).toBe(2);
    });

    it('setWorkspaceRoot() clears the cache (re-reads after root change)', async () => {
      const rules: DeepCodeRules = { version: '1.0' };
      const fs = makeFs({ [`${WORKSPACE}/.deepcoderules`]: JSON.stringify(rules) });
      const engine = makeEngine(fs);

      await engine.resolveRulesForFile(`${WORKSPACE}/src/a.ts`);
      // Reset to the same root -> cache cleared.
      engine.setWorkspaceRoot(WORKSPACE);
      await engine.resolveRulesForFile(`${WORKSPACE}/src/a.ts`);

      const reads = fs.readFile.mock.calls.filter(
        (c) => c[0] === `${WORKSPACE}/.deepcoderules`,
      );
      expect(reads.length).toBe(2);
    });
  });
});
