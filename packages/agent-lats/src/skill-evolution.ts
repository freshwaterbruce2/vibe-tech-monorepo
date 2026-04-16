/**
 * Skill Evolution Engine — Phase 3
 *
 * Applies the Darwin Gödel Machine pattern to SKILL.md files:
 *   1. Snapshot — capture the current skill as a versioned baseline
 *   2. Mutate  — apply rule-based operators to produce a candidate variant
 *   3. Benchmark — score both structurally against measurable criteria
 *   4. Archive — store all variants; only promote if the candidate beats deployed
 *
 * Mutation operators (rule-based, no LLM required):
 *   add_guardrails  — append a "Common Mistakes" section from agent_mistakes DB
 *   add_examples    — inject "What NOT to do" from self_critiques violations
 *   condense        — strip redundancy, compress verbose bullet points
 *   annotate        — add per-domain mistake context from agent_mistakes
 *
 * Structural benchmark (0.0–1.0):
 *   30% actionability  — ratio of imperative rules to total lines
 *   25% specificity    — mentions of concrete tools/files/patterns
 *   20% example_density — code blocks per section
 *   15% guardrail_density — explicit prohibitions per rule set
 *   10% clarity        — inverse of avg words per bullet (lower = clearer)
 */

import { randomUUID } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import type Database from 'better-sqlite3';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MutationType = 'original' | 'add_guardrails' | 'add_examples' | 'condense' | 'annotate';

export interface SkillVariant {
  id: string;
  skillName: string;
  skillPath: string;
  version: number;
  parentId: string | null;
  mutationType: MutationType;
  content: string;
  benchmarkScore: number | null;
  benchmarkBreakdown: BenchmarkBreakdown | null;
  isDeployed: boolean;
  wasPromoted: boolean;
  createdAt: string;
  benchmarkedAt: string | null;
}

export interface BenchmarkBreakdown {
  actionability: number;    // 0-1: ratio of lines with imperative verbs
  specificity: number;      // 0-1: concrete tool/file references
  exampleDensity: number;   // 0-1: code blocks relative to sections
  guardrailDensity: number; // 0-1: explicit prohibitions
  clarity: number;          // 0-1: inverse avg words per bullet
  final: number;
}

export interface EvolutionResult {
  original: SkillVariant;
  mutated: SkillVariant;
  delta: number;                        // mutated.benchmarkScore - original.benchmarkScore
  promoted: boolean;                    // true if mutated beats original
  recommendation: string;
}

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

export function parseSkill(content: string): { frontmatter: string; body: string; name: string } {
  // Normalize Windows CRLF → LF so the regex works regardless of file line endings
  const normalized = content.replace(/\r\n/g, '\n');
  const fmMatch = normalized.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) return { frontmatter: '', body: normalized, name: 'unknown' };
  const frontmatter = fmMatch[1]!;
  const body = fmMatch[2]!;
  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
  return { frontmatter, body, name: nameMatch?.[1]?.trim() ?? 'unknown' };
}

export function assembleSkill(frontmatter: string, body: string): string {
  return `---\n${frontmatter}\n---\n${body}`;
}

// ---------------------------------------------------------------------------
// Benchmark
// ---------------------------------------------------------------------------

const IMPERATIVE_VERBS = /\b(always|never|must|should|avoid|use|prefer|do not|don't|ensure|check|verify|run|call|read|write|create|delete|update)\b/i;
const SPECIFIC_REFS = /`[^`]{3,60}`|C:\\|D:\\|\.ts|\.tsx|\.ps1|\.py|pnpm|npx|node|sqlite3|tsc|eslint/g;
const CODE_BLOCK = /```/g;
const SECTION_HEADER = /^#+\s/gm;
const PROHIBITION = /\b(never|do not|don't|avoid|prohibited|banned|must not|should not)\b/gi;
const BULLET_LINE = /^[\s]*[-*+]\s+(.+)$/gm;

export function benchmark(content: string): BenchmarkBreakdown {
  const lines = content.split('\n');
  const nonEmpty = lines.filter((l) => l.trim().length > 0);

  // 1. Actionability — fraction of non-empty lines containing an imperative verb
  const imperativeLines = nonEmpty.filter((l) => IMPERATIVE_VERBS.test(l)).length;
  const actionability = Math.min(1, imperativeLines / Math.max(1, nonEmpty.length) * 3.5);

  // 2. Specificity — concrete references per 10 lines
  const refMatches = (content.match(SPECIFIC_REFS) ?? []).length;
  const specificity = Math.min(1, refMatches / Math.max(1, nonEmpty.length) * 5);

  // 3. Example density — code block pairs per section
  const codeBlocks = (content.match(CODE_BLOCK) ?? []).length / 2;
  const sections = Math.max(1, (content.match(SECTION_HEADER) ?? []).length);
  const exampleDensity = Math.min(1, (codeBlocks / sections) * 2);

  // 4. Guardrail density — prohibitions per 20 lines
  const prohibitions = (content.match(PROHIBITION) ?? []).length;
  const guardrailDensity = Math.min(1, prohibitions / Math.max(1, nonEmpty.length) * 8);

  // 5. Clarity — inverse of average words per bullet (target: 10-20 words)
  const bullets: string[] = [];
  let m: RegExpExecArray | null;
  const bulletRe = /^[\s]*[-*+]\s+(.+)$/gm;
  bulletRe.lastIndex = 0;
  while ((m = bulletRe.exec(content)) !== null) bullets.push(m[1]!);
  const avgWords = bullets.length > 0
    ? bullets.reduce((s, b) => s + b.split(/\s+/).length, 0) / bullets.length
    : 20;
  // ideal ≈ 12 words; penalise both too short (<5) and too long (>30)
  const clarity = avgWords < 5 ? 0.4
    : avgWords <= 20 ? 1 - (avgWords - 12) / 20
    : Math.max(0, 1 - (avgWords - 20) / 40);

  const final =
    0.30 * actionability +
    0.25 * specificity +
    0.20 * exampleDensity +
    0.15 * guardrailDensity +
    0.10 * Math.max(0, Math.min(1, clarity));

  return {
    actionability: +actionability.toFixed(4),
    specificity: +specificity.toFixed(4),
    exampleDensity: +exampleDensity.toFixed(4),
    guardrailDensity: +guardrailDensity.toFixed(4),
    clarity: +Math.max(0, Math.min(1, clarity)).toFixed(4),
    final: +final.toFixed(4),
  };
}

// ---------------------------------------------------------------------------
// Mutation operators
// ---------------------------------------------------------------------------

/** Fetch relevant mistakes from agent_mistakes for a skill's domain */
function fetchDomainMistakes(db: Database.Database, skillName: string, limit = 5): string[] {
  const keywords = skillName.replace(/-/g, ' ').split(' ');
  const like = keywords.map(() => 'description LIKE ?').join(' OR ');
  const params = keywords.map((k) => `%${k}%`);
  const rows = db
    .prepare(
      `SELECT description, prevention_strategy FROM agent_mistakes
       WHERE (${like}) AND resolved = 0
       GROUP BY substr(description, 1, 80)
       ORDER BY MAX(id) DESC LIMIT ?`,
    )
    .all(...params, limit) as Array<{ description: string; prevention_strategy: string | null }>;
  return rows.map((r) => {
    const desc = r.description.substring(0, 100) + (r.description.length > 100 ? '…' : '');
    const strategy = r.prevention_strategy
      ? ` → ${r.prevention_strategy.substring(0, 80)}${r.prevention_strategy.length > 80 ? '…' : ''}`
      : '';
    return `- ${desc}${strategy}`;
  });
}

/** Fetch common violation patterns from self_critiques */
function fetchCommonViolations(db: Database.Database, limit = 5): string[] {
  const rows = db
    .prepare(
      `SELECT violations FROM self_critiques
       WHERE violations IS NOT NULL AND static_score < 0.9
       ORDER BY created_at DESC LIMIT ?`,
    )
    .all(limit) as Array<{ violations: string }>;

  const seen = new Set<string>();
  const result: string[] = [];
  for (const r of rows) {
    const violations: string[] = JSON.parse(r.violations);
    for (const v of violations) {
      const key = v.substring(0, 60);
      if (!seen.has(key)) {
        seen.add(key);
        result.push(`- ${v.substring(0, 120)}`);
      }
    }
  }
  return result.slice(0, limit);
}

export function mutate(
  db: Database.Database,
  content: string,
  type: MutationType,
  skillName: string,
): string {
  const { frontmatter, body } = parseSkill(content);
  let newBody = body;

  switch (type) {
    case 'add_guardrails': {
      const mistakes = fetchDomainMistakes(db, skillName);
      if (mistakes.length > 0) {
        const section =
          '\n\n## Common Mistakes (auto-generated from learning DB)\n\n' +
          '*These mistakes have been recorded from past agent executions:*\n\n' +
          mistakes.join('\n') +
          '\n';
        newBody = body.trimEnd() + section;
      }
      break;
    }

    case 'add_examples': {
      const violations = fetchCommonViolations(db);
      if (violations.length > 0) {
        const section =
          '\n\n## What NOT to do (from self-critique history)\n\n' +
          '*Patterns that consistently lower critique scores:*\n\n' +
          violations.join('\n') +
          '\n';
        newBody = body.trimEnd() + section;
      }
      break;
    }

    case 'condense': {
      // Remove duplicate blank lines, trim trailing spaces, compress 3+ line bullets to 1
      newBody = body
        .replace(/\n{3,}/g, '\n\n')        // max 2 consecutive blank lines
        .replace(/[ \t]+$/gm, '')           // trailing whitespace per line
        .replace(/^(\s*[-*+]\s+.+)\n\n(?=\s*[-*+])/gm, '$1\n'); // no blank line between adjacent bullets
      break;
    }

    case 'annotate': {
      const mistakes = fetchDomainMistakes(db, skillName, 3);
      const violations = fetchCommonViolations(db, 3);
      const combined = [...mistakes, ...violations];
      if (combined.length > 0) {
        const section =
          '\n\n## Live Learning Context\n\n' +
          '*Injected from agent_learning.db — updated each evolution cycle:*\n\n' +
          combined.join('\n') +
          '\n';
        newBody = body.trimEnd() + section;
      }
      break;
    }

    case 'original':
      break;
  }

  return assembleSkill(frontmatter, newBody);
}

// ---------------------------------------------------------------------------
// DB operations
// ---------------------------------------------------------------------------

export function getNextVersion(db: Database.Database, skillName: string): number {
  const row = db
    .prepare('SELECT MAX(version) as v FROM skill_variants WHERE skill_name = ?')
    .get(skillName) as { v: number | null };
  return (row.v ?? 0) + 1;
}

export function saveVariant(
  db: Database.Database,
  opts: {
    skillName: string;
    skillPath: string;
    mutationType: MutationType;
    content: string;
    parentId: string | null;
    isDeployed?: boolean;
  },
): SkillVariant {
  const id = randomUUID();
  const version = getNextVersion(db, opts.skillName);
  const bd = benchmark(opts.content);
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO skill_variants
     (id, skill_name, skill_path, version, parent_id, mutation_type, content,
      benchmark_score, benchmark_breakdown, is_deployed, was_promoted, created_at, benchmarked_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
  ).run(
    id, opts.skillName, opts.skillPath, version, opts.parentId,
    opts.mutationType, opts.content, bd.final,
    JSON.stringify(bd), opts.isDeployed ? 1 : 0, now, now,
  );

  return {
    id, skillName: opts.skillName, skillPath: opts.skillPath,
    version, parentId: opts.parentId, mutationType: opts.mutationType,
    content: opts.content, benchmarkScore: bd.final, benchmarkBreakdown: bd,
    isDeployed: opts.isDeployed ?? false, wasPromoted: false,
    createdAt: now, benchmarkedAt: now,
  };
}

export function getDeployedVariant(db: Database.Database, skillName: string): SkillVariant | null {
  const row = db
    .prepare('SELECT * FROM skill_variants WHERE skill_name = ? AND is_deployed = 1 ORDER BY version DESC LIMIT 1')
    .get(skillName) as Record<string, unknown> | undefined;
  return row ? rowToVariant(row) : null;
}

export function getVariantHistory(db: Database.Database, skillName: string, limit = 10): SkillVariant[] {
  const rows = db
    .prepare('SELECT * FROM skill_variants WHERE skill_name = ? ORDER BY version DESC LIMIT ?')
    .all(skillName, limit) as Array<Record<string, unknown>>;
  return rows.map(rowToVariant);
}

function rowToVariant(row: Record<string, unknown>): SkillVariant {
  return {
    id: row['id'] as string,
    skillName: row['skill_name'] as string,
    skillPath: row['skill_path'] as string,
    version: row['version'] as number,
    parentId: row['parent_id'] as string | null,
    mutationType: row['mutation_type'] as MutationType,
    content: row['content'] as string,
    benchmarkScore: row['benchmark_score'] as number | null,
    benchmarkBreakdown: row['benchmark_breakdown']
      ? JSON.parse(row['benchmark_breakdown'] as string) as BenchmarkBreakdown
      : null,
    isDeployed: (row['is_deployed'] as number) === 1,
    wasPromoted: (row['was_promoted'] as number) === 1,
    createdAt: row['created_at'] as string,
    benchmarkedAt: row['benchmarked_at'] as string | null,
  };
}

// ---------------------------------------------------------------------------
// High-level API
// ---------------------------------------------------------------------------

const SKILLS_BASE = process.env['SKILLS_PATH'] ?? 'C:\\Users\\fresh_zxae3v6\\.claude\\skills';

export function resolveSkillPath(skillName: string): string {
  return join(SKILLS_BASE, skillName, 'SKILL.md');
}

/**
 * Snapshot the current SKILL.md as the deployed baseline variant.
 * Safe to run multiple times — only creates a new entry if content has changed.
 */
export function snapshot(db: Database.Database, skillName: string): SkillVariant {
  const skillPath = resolveSkillPath(skillName);
  if (!existsSync(skillPath)) {
    throw new Error(`Skill not found: ${skillPath}`);
  }
  const content = readFileSync(skillPath, 'utf-8').replace(/\r\n/g, '\n');

  // Check if content matches latest deployed variant
  const deployed = getDeployedVariant(db, skillName);
  if (deployed && deployed.content === content) {
    return deployed; // Already snapshotted
  }

  // Mark any previous deployed variant as no longer deployed
  db.prepare('UPDATE skill_variants SET is_deployed = 0 WHERE skill_name = ? AND is_deployed = 1')
    .run(skillName);

  return saveVariant(db, {
    skillName,
    skillPath,
    mutationType: 'original',
    content,
    parentId: deployed?.id ?? null,
    isDeployed: true,
  });
}

/**
 * Generate a mutated variant and benchmark it against the deployed version.
 * Returns an EvolutionResult describing whether to promote.
 */
export function evolve(
  db: Database.Database,
  skillName: string,
  mutationType: MutationType,
): EvolutionResult {
  const skillPath = resolveSkillPath(skillName);
  if (!existsSync(skillPath)) throw new Error(`Skill not found: ${skillPath}`);

  // Ensure we have a baseline snapshot
  const original = snapshot(db, skillName);
  const mutatedContent = mutate(db, original.content, mutationType, skillName);

  // Don't save if mutation had no effect
  const noChange = mutatedContent === original.content;
  if (noChange) {
    return {
      original,
      mutated: original,
      delta: 0,
      promoted: false,
      recommendation: 'Mutation had no effect (no domain data available yet). Try a different mutation type or run more tasks to populate agent_mistakes.',
    };
  }

  const mutated = saveVariant(db, {
    skillName,
    skillPath,
    mutationType,
    content: mutatedContent,
    parentId: original.id,
    isDeployed: false,
  });

  const delta = (mutated.benchmarkScore ?? 0) - (original.benchmarkScore ?? 0);
  const promoted = delta > 0.02; // only promote if meaningfully better (>2%)

  if (promoted) {
    db.prepare('UPDATE skill_variants SET was_promoted = 1 WHERE id = ?').run(mutated.id);
  }

  const recommendation = promoted
    ? `Variant v${mutated.version} scores +${(delta * 100).toFixed(1)}% better. Run \`lats skill deploy --variant ${mutated.id}\` to apply.`
    : delta > 0
    ? `Marginal improvement (+${(delta * 100).toFixed(1)}%). Archived for future recombination.`
    : `No improvement (${(delta * 100).toFixed(1)}%). Archived. Try a different mutation type.`;

  return { original, mutated, delta, promoted, recommendation };
}

/**
 * Deploy a variant by writing its content to the SKILL.md file.
 * Marks it as deployed in the DB.
 */
export function deployVariant(db: Database.Database, variantId: string): SkillVariant {
  const row = db
    .prepare('SELECT * FROM skill_variants WHERE id = ?')
    .get(variantId) as Record<string, unknown> | undefined;

  if (!row) throw new Error(`Variant ${variantId} not found`);
  const variant = rowToVariant(row);

  // Write to disk
  writeFileSync(variant.skillPath, variant.content, 'utf-8');

  // Update DB: unmark old deployed, mark this one
  db.prepare('UPDATE skill_variants SET is_deployed = 0 WHERE skill_name = ? AND is_deployed = 1')
    .run(variant.skillName);
  db.prepare('UPDATE skill_variants SET is_deployed = 1 WHERE id = ?').run(variantId);

  return { ...variant, isDeployed: true };
}

/** Diff two variant contents — show which lines were added/removed */
export function diffVariants(a: string, b: string): string {
  const aLines = a.split('\n');
  const bLines = b.split('\n');
  const added = bLines.filter((l) => !aLines.includes(l) && l.trim()).map((l) => `+ ${l}`);
  const removed = aLines.filter((l) => !bLines.includes(l) && l.trim()).map((l) => `- ${l}`);
  return [...removed, ...added].join('\n') || '(no textual diff)';
}
