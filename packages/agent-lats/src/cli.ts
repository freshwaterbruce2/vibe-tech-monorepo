#!/usr/bin/env node
/**
 * LATS CLI
 *
 * Usage:
 *   lats plan --task "Add OAuth to vibe-shop" [--candidates 3] [--agent webapp-expert]
 *   lats backpropagate --node <uuid> --success true|false [--reflection "..."]
 *   lats reflect --node <uuid> --outcome "What actually happened"
 *   lats critique --file <path> [--task "..."] [--node <uuid>] [--new-file]
 *   lats pairs [--generate]
 *   lats stats [--limit 10]
 */

import { getDb, closeDb, recordOutcome, storeCritique, generatePreferencePairsFromHistory } from './db.js';
import { plan, formatPlanForAgent } from './mcts.js';
import { generateReflectionPrompt } from './reflect.js';
import { critiqueFile } from './critique.js';
import { runAssessmentCycle, runRecentAssessmentCycle, getRecentAssessments } from './agent-q.js';
import { snapshot, evolve, deployVariant, diffVariants, getVariantHistory, getDeployedVariant } from './skill-evolution.js';
import {
  startRun, recordStage, finishRun, getStageStats, suggestOrderings,
  getRunHistory, recomputeAllBlame,
  DEFAULT_ORDERING,
} from './pipeline-evolution.js';
import type { StageName } from './pipeline-evolution.js';
import type { LATSOptions } from './types.js';
import type { MutationType } from './skill-evolution.js';

type Command = 'plan' | 'backpropagate' | 'reflect' | 'stats' | 'critique' | 'pairs' | 'skill' | 'pipeline' | 'assess';

interface ParsedArgs {
  command: Command;
  subcommand?: string;
  file?: string;
  newFile?: boolean;
  generate?: boolean;
  task?: string;
  nodeId?: string;
  success?: boolean;
  reflection?: string;
  outcome?: string;
  candidates?: number;
  agent?: string;
  project?: string;
  limit?: number;
  json?: boolean;
  dbPath?: string;
  skillName?: string;
  mutationType?: MutationType;
  variantId?: string;
  recentMinutes?: number;
  // pipeline-specific
  runId?: string;
  stage?: string;
  position?: number;
  durationMs?: number;
  inputScore?: number;
  outputScore?: number;
  errorMessage?: string;
  pipelineName?: string;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = argv.slice(2);
  const command = args[0] as Command;

  if (!['plan', 'backpropagate', 'reflect', 'stats', 'critique', 'pairs', 'skill', 'pipeline', 'assess'].includes(command)) {
    usage();
    process.exit(1);
  }

  const result: ParsedArgs = { command };

  // For 'skill'/'pipeline'/'assess', second positional arg is the subcommand
  let startIdx = 1;
  if ((command === 'skill' || command === 'pipeline' || command === 'assess') && args[1] && !args[1].startsWith('--')) {
    result.subcommand = args[1];
    startIdx = 2;
  }

  for (let i = startIdx; i < args.length; i++) {
    const flag = args[i];
    const next = args[i + 1];
    switch (flag) {
      case '--task':        result.task = next; i++; break;
      case '--node':        result.nodeId = next; i++; break;
      case '--success':     result.success = next === 'true'; i++; break;
      case '--reflection':  result.reflection = next; i++; break;
      case '--outcome':     result.outcome = next; i++; break;
      case '--candidates':  result.candidates = parseInt(next ?? '3', 10); i++; break;
      case '--agent':       result.agent = next; i++; break;
      case '--project':     result.project = next; i++; break;
      case '--limit':       result.limit = parseInt(next ?? '10', 10); i++; break;
      case '--json':        result.json = true; break;
      case '--db':          result.dbPath = next; i++; break;
      case '--file':        result.file = next; i++; break;
      case '--new-file':    result.newFile = true; break;
      case '--generate':    result.generate = true; break;
      case '--name':        result.skillName = next; i++; break;
      case '--type':        result.mutationType = next as MutationType; i++; break;
      case '--variant':     result.variantId = next; i++; break;
      case '--run':         result.runId = next; i++; break;
      case '--stage':       result.stage = next; i++; break;
      case '--position':    result.position = parseInt(next ?? '0', 10); i++; break;
      case '--duration':    result.durationMs = parseInt(next ?? '0', 10); i++; break;
      case '--input-score': result.inputScore = parseFloat(next ?? '0'); i++; break;
      case '--output-score':result.outputScore = parseFloat(next ?? '0'); i++; break;
      case '--error':       result.errorMessage = next; i++; break;
      case '--pipeline':    result.pipelineName = next; i++; break;
      case '--recent':      result.recentMinutes = parseInt(next ?? '60', 10); i++; break;
    }
  }

  return result;
}

function usage(): void {
  console.error(`
LATS — Language Agent Tree Search CLI

Commands:
  plan          Generate ranked approach candidates for a task
  backpropagate Record actual outcome and update the tree
  reflect       Generate a self-reflection prompt for a failed node
  critique      Static rubric analysis of a modified TypeScript file
  pairs         List or auto-generate preference pairs from critique history
  stats         Show recent MCTS planning history
  assess        Agent Q: aggregate critique scores into quality signal (Phase 2)
  skill         Manage skill evolution archive (snapshot/mutate/deploy)

Options:
  --task <text>          Task description
  --node <uuid>          Node ID (for backpropagate/reflect/critique)
  --success true|false   Whether the approach succeeded (backpropagate)
  --reflection <text>    Self-critique text (backpropagate)
  --outcome <text>       What actually happened (reflect)
  --file <path>          File to critique (critique command)
  --new-file             Flag file as newly created (tightens critique)
  --candidates <n>       Number of candidate approaches (default: 3)
  --generate             Auto-generate preference pairs (pairs command)
  --agent <id>           Agent ID for recording
  --project <name>       Project name for recording
  --limit <n>            Number of results to show (default: 10)
  --json                 Output JSON
  --db <path>            Override DB path
  --name <skill>         Skill name (skill command)
  --type <mutation>      Mutation type: add_guardrails|add_examples|condense|annotate
  --variant <uuid>       Variant ID (skill deploy command)

Skill subcommands:
  lats skill snapshot --name <skill>              Capture current SKILL.md as baseline
  lats skill mutate --name <skill> --type <type>  Generate a mutated variant
  lats skill benchmark --name <skill>             Score current SKILL.md
  lats skill archive --name <skill> [--limit n]   List variant history
  lats skill diff --name <skill>                  Diff latest vs deployed
  lats skill deploy --variant <uuid>              Write a variant to disk

Examples:
  lats plan --task "Add OAuth login to vibe-shop" --candidates 3
  lats backpropagate --node abc-123 --success true --agent webapp-expert
  lats critique --file apps/vibe-tutor/src/components/avatar/AvatarProfile.tsx
  lats pairs --generate
  lats stats --limit 5
  lats skill snapshot --name autonomous-agents
  lats skill mutate --name autonomous-agents --type add_guardrails
  lats skill archive --name autonomous-agents
`.trim());
}

function runStats(db: ReturnType<typeof getDb>, limit: number, json: boolean): void {
  const rows = db
    .prepare(
      `SELECT id, tree_id, approach_source, value_score, actual_success, task_description, created_at
       FROM mcts_nodes
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .all(limit) as Array<{
    id: string;
    tree_id: string;
    approach_source: string;
    value_score: number;
    actual_success: number | null;
    task_description: string;
    created_at: string;
  }>;

  if (json) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }

  console.log(`\nLATS Planning History (last ${limit}):\n`);
  for (const r of rows) {
    const outcome = r.actual_success === null ? 'pending' : r.actual_success === 1 ? 'SUCCESS' : 'FAILED';
    console.log(`  [${outcome}] ${r.approach_source} score=${r.value_score.toFixed(3)}`);
    console.log(`    task: ${r.task_description.substring(0, 80)}`);
    console.log(`    node: ${r.id}`);
    console.log(`    at:   ${r.created_at}`);
    console.log();
  }

  const successCount = db
    .prepare('SELECT COUNT(*) as n FROM mcts_nodes WHERE actual_success = 1')
    .get() as { n: number };
  const totalExecuted = db
    .prepare('SELECT COUNT(*) as n FROM mcts_nodes WHERE actual_success IS NOT NULL')
    .get() as { n: number };

  if (totalExecuted.n > 0) {
    const pct = ((successCount.n / totalExecuted.n) * 100).toFixed(1);
    console.log(`  Overall LATS success rate: ${successCount.n}/${totalExecuted.n} (${pct}%)`);
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);
  const opts: LATSOptions = {
    dbPath: args.dbPath,
    candidateCount: args.candidates,
  };
  const db = getDb(opts.dbPath);

  try {
    switch (args.command) {
      case 'plan': {
        if (!args.task) {
          console.error('Error: --task is required for the plan command');
          process.exit(1);
        }
        const result = plan(db, args.task, opts);
        if (args.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(formatPlanForAgent(result));
        }
        break;
      }

      case 'backpropagate': {
        if (!args.nodeId || args.success === undefined) {
          console.error('Error: --node and --success are required for backpropagate');
          process.exit(1);
        }
        recordOutcome(db, {
          nodeId: args.nodeId,
          success: args.success,
          agentId: args.agent,
          projectName: args.project,
          reflection: args.reflection,
        });
        if (args.json) {
          console.log(JSON.stringify({ ok: true, nodeId: args.nodeId, success: args.success }));
        } else {
          console.log(`Backpropagated: node=${args.nodeId} success=${args.success}`);
          if (args.success) {
            console.log('Pattern confidence boosted (+0.02) if this was a pattern_match node.');
          } else {
            console.log('Failure recorded to agent_mistakes. Run `lats reflect` to generate self-critique.');
          }
        }
        break;
      }

      case 'reflect': {
        if (!args.nodeId) {
          console.error('Error: --node is required for reflect');
          process.exit(1);
        }
        const nodeRow = db
          .prepare('SELECT task_description, approach, approach_source FROM mcts_nodes WHERE id = ?')
          .get(args.nodeId) as { task_description: string; approach: string; approach_source: string } | undefined;

        if (!nodeRow) {
          console.error(`Error: node ${args.nodeId} not found in mcts_nodes`);
          process.exit(1);
        }

        const output = generateReflectionPrompt(
          {
            taskDescription: nodeRow.task_description,
            approach: nodeRow.approach,
            approachSource: nodeRow.approach_source,
            errorOrOutcome: args.outcome ?? '(outcome not provided)',
            agentId: args.agent,
          },
          args.nodeId,
        );

        if (args.json) {
          console.log(JSON.stringify(output, null, 2));
        } else {
          console.log(output.template);
        }
        break;
      }

      case 'stats': {
        runStats(db, args.limit ?? 10, args.json ?? false);
        break;
      }

      case 'critique': {
        if (!args.file) {
          console.error('Error: --file is required for the critique command');
          process.exit(1);
        }
        const result = critiqueFile(args.file, args.newFile ?? false);
        if (args.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          const icon = result.preferenceType === 'positive' ? '✓' :
                       result.preferenceType === 'negative' ? '✗' : '~';
          console.log(`\n${icon} Critique: ${args.file}`);
          console.log(`  Score:  ${result.staticScore.toFixed(3)} (${result.preferenceType})`);
          if (result.violations.length === 0) {
            console.log('  All rubric checks passed.');
          } else {
            console.log(`  Violations (${result.violations.length}):`);
            for (const v of result.violations) {
              console.log(`    · ${v.substring(0, 100)}`);
            }
          }
        }
        // Always store to DB
        const task = args.task ?? `critique:${args.file}`;
        storeCritique(db, result, task, args.nodeId);
        if (!args.json) {
          console.log(`  Stored to self_critiques.`);
        }
        break;
      }

      case 'pairs': {
        if (args.generate) {
          const count = generatePreferencePairsFromHistory(db);
          if (args.json) {
            console.log(JSON.stringify({ generated: count }));
          } else {
            console.log(`Generated ${count} new preference pair(s) from critique history.`);
          }
        } else {
          // List recent pairs
          const pairs = db
            .prepare(
              `SELECT task_type, chosen_approach, rejected_approach, confidence, created_at
               FROM preference_pairs ORDER BY created_at DESC LIMIT ?`,
            )
            .all(args.limit ?? 10) as Array<{
            task_type: string; chosen_approach: string;
            rejected_approach: string; confidence: number; created_at: string;
          }>;
          if (args.json) {
            console.log(JSON.stringify(pairs, null, 2));
          } else {
            console.log(`\nPreference Pairs (${pairs.length}):\n`);
            for (const p of pairs) {
              console.log(`  Task: ${p.task_type.substring(0, 60)}`);
              console.log(`    ✓ chosen:   ${p.chosen_approach.substring(0, 80)}`);
              console.log(`    ✗ rejected: ${p.rejected_approach.substring(0, 80)}`);
              console.log(`    confidence: ${p.confidence.toFixed(3)}`);
              console.log();
            }
            if (pairs.length === 0) {
              console.log('  No pairs yet. Run `lats critique` on modified files to build up data,');
              console.log('  then `lats pairs --generate` to extract pairs automatically.');
            }
          }
        }
        break;
      }

      case 'skill': {
        const sub = args.subcommand;
        if (!sub) {
          console.error('Error: skill requires a subcommand: snapshot|mutate|benchmark|archive|diff|deploy');
          process.exit(1);
        }

        switch (sub) {
          case 'snapshot': {
            if (!args.skillName) { console.error('Error: --name required'); process.exit(1); }
            const v = snapshot(db, args.skillName);
            if (args.json) {
              console.log(JSON.stringify({ id: v.id, version: v.version, score: v.benchmarkScore }, null, 2));
            } else {
              console.log(`\nSnapshotted: ${args.skillName} v${v.version}`);
              console.log(`  ID:    ${v.id}`);
              console.log(`  Score: ${v.benchmarkScore?.toFixed(3)}`);
              console.log(`  Path:  ${v.skillPath}`);
            }
            break;
          }

          case 'mutate': {
            if (!args.skillName) { console.error('Error: --name required'); process.exit(1); }
            if (!args.mutationType) { console.error('Error: --type required (add_guardrails|add_examples|condense|annotate)'); process.exit(1); }
            const result = evolve(db, args.skillName, args.mutationType);
            if (args.json) {
              console.log(JSON.stringify({
                originalScore: result.original.benchmarkScore,
                mutatedScore: result.mutated.benchmarkScore,
                delta: result.delta,
                promoted: result.promoted,
                variantId: result.mutated.id,
                recommendation: result.recommendation,
              }, null, 2));
            } else {
              console.log(`\nEvolution: ${args.skillName} (${args.mutationType})`);
              console.log(`  Original v${result.original.version}: score=${result.original.benchmarkScore?.toFixed(3)}`);
              if (result.mutated.id !== result.original.id) {
                console.log(`  Mutated  v${result.mutated.version}: score=${result.mutated.benchmarkScore?.toFixed(3)}`);
                console.log(`  Delta:  ${result.delta >= 0 ? '+' : ''}${(result.delta * 100).toFixed(1)}%`);
                console.log(`  Promoted: ${result.promoted ? 'YES' : 'no'}`);
                console.log(`  Variant ID: ${result.mutated.id}`);
              }
              console.log(`\n  ${result.recommendation}`);
            }
            break;
          }

          case 'benchmark': {
            if (!args.skillName) { console.error('Error: --name required'); process.exit(1); }
            const v = snapshot(db, args.skillName);
            const bd = v.benchmarkBreakdown;
            if (args.json) {
              console.log(JSON.stringify(bd, null, 2));
            } else {
              console.log(`\nBenchmark: ${args.skillName} v${v.version}`);
              if (bd) {
                console.log(`  Actionability:    ${(bd.actionability * 100).toFixed(1)}%  (30% weight)`);
                console.log(`  Specificity:      ${(bd.specificity * 100).toFixed(1)}%  (25% weight)`);
                console.log(`  Example density:  ${(bd.exampleDensity * 100).toFixed(1)}%  (20% weight)`);
                console.log(`  Guardrail density:${(bd.guardrailDensity * 100).toFixed(1)}%  (15% weight)`);
                console.log(`  Clarity:          ${(bd.clarity * 100).toFixed(1)}%  (10% weight)`);
                console.log(`  ─────────────────────────────────────`);
                console.log(`  Final score:      ${(bd.final * 100).toFixed(1)}%`);
              }
            }
            break;
          }

          case 'archive': {
            if (!args.skillName) { console.error('Error: --name required'); process.exit(1); }
            const variants = getVariantHistory(db, args.skillName, args.limit ?? 10);
            if (args.json) {
              console.log(JSON.stringify(variants.map((v) => ({
                id: v.id, version: v.version, mutation: v.mutationType,
                score: v.benchmarkScore, deployed: v.isDeployed, promoted: v.wasPromoted,
              })), null, 2));
            } else {
              console.log(`\nVariant Archive: ${args.skillName} (${variants.length} entries)\n`);
              for (const v of variants) {
                const flags = [v.isDeployed ? 'DEPLOYED' : '', v.wasPromoted ? 'promoted' : ''].filter(Boolean).join(' ');
                console.log(`  v${v.version} [${v.mutationType}] score=${v.benchmarkScore?.toFixed(3)} ${flags}`);
                console.log(`    id: ${v.id}`);
                console.log(`    at: ${v.createdAt}`);
                console.log();
              }
              if (variants.length === 0) {
                console.log('  No variants yet. Run `lats skill snapshot --name <skill>` first.');
              }
            }
            break;
          }

          case 'diff': {
            if (!args.skillName) { console.error('Error: --name required'); process.exit(1); }
            const deployed = getDeployedVariant(db, args.skillName);
            if (!deployed) { console.error(`No deployed variant for ${args.skillName}. Run snapshot first.`); process.exit(1); }
            const variants = getVariantHistory(db, args.skillName, 2);
            const candidate = variants.find((v) => !v.isDeployed);
            if (!candidate) {
              console.log('No unapplied variants to diff against. Run `lats skill mutate` first.');
            } else {
              const diff = diffVariants(deployed.content, candidate.content);
              console.log(`\nDiff: v${deployed.version} (deployed) → v${candidate.version} (${candidate.mutationType})\n`);
              console.log(diff);
            }
            break;
          }

          case 'deploy': {
            if (!args.variantId) { console.error('Error: --variant <uuid> required'); process.exit(1); }
            const v = deployVariant(db, args.variantId);
            if (args.json) {
              console.log(JSON.stringify({ deployed: true, skillName: v.skillName, version: v.version, path: v.skillPath }));
            } else {
              console.log(`\nDeployed: ${v.skillName} v${v.version}`);
              console.log(`  Path: ${v.skillPath}`);
              console.log(`  Score: ${v.benchmarkScore?.toFixed(3)}`);
              console.log('\nSKILL.md has been updated on disk.');
            }
            break;
          }

          default:
            console.error(`Unknown skill subcommand: ${sub}`);
            console.error('Valid: snapshot|mutate|benchmark|archive|diff|deploy');
            process.exit(1);
        }
        break;
      }

      case 'assess': {
        // lats assess --node <uuid>          — run Agent Q for a completed node
        // lats assess --recent <N>           — assess orphan critiques from last N minutes
        // lats assess stats [--agent <id>]   — show quality history
        const sub = args.subcommand ?? (args.recentMinutes ? 'recent' : args.nodeId ? 'run' : 'stats');

        if (sub === 'recent') {
          const minutes = args.recentMinutes ?? 60;
          const assessment = runRecentAssessmentCycle(db, minutes);
          if (!assessment) {
            const msg = `No orphan self_critiques in the last ${minutes} minutes.`;
            if (args.json) {
              console.log(JSON.stringify({ ok: false, reason: msg }));
            } else {
              console.log(`⚠ ${msg}`);
            }
            break;
          }
          if (args.json) {
            console.log(JSON.stringify({
              window: minutes,
              filesCritiqued: assessment.filesCritiqued,
              avgFileQuality: assessment.avgFileQuality,
              qualityScore: assessment.qualityScore,
              qualityBand: assessment.qualityBand,
              summary: assessment.summary,
            }));
          } else {
            const band = { excellent: '✦', good: '✓', acceptable: '~', poor: '✗' }[assessment.qualityBand];
            console.log(`\n${band} Agent Q (session orphans, last ${minutes}m)`);
            console.log(`  Quality score: ${assessment.qualityScore.toFixed(3)} [${assessment.qualityBand}]`);
            console.log(`  Files critiqued: ${assessment.filesCritiqued}`);
            console.log(`    avg static score: ${assessment.avgFileQuality.toFixed(3)}`);
            console.log(`    positive: ${assessment.positiveFiles}/${assessment.filesCritiqued}`);
            console.log(`    clean:    ${assessment.cleanFiles}/${assessment.filesCritiqued}`);
            console.log(`  Stored to agent_q_assessments.`);
          }
        } else if (sub === 'run') {
          if (!args.nodeId) {
            console.error('Error: --node <uuid> is required for `assess`');
            process.exit(1);
          }
          const assessment = runAssessmentCycle(db, args.nodeId);
          if (!assessment) {
            const msg = `No self_critiques found for node ${args.nodeId}. ` +
              'Run Edit/Write operations with the LATS node active so critiques are linked.';
            if (args.json) {
              console.log(JSON.stringify({ ok: false, reason: msg }));
            } else {
              console.log(`⚠ ${msg}`);
            }
            break;
          }
          if (args.json) {
            console.log(JSON.stringify({
              nodeId: args.nodeId,
              filesCritiqued: assessment.filesCritiqued,
              avgFileQuality: assessment.avgFileQuality,
              qualityScore: assessment.qualityScore,
              qualityBand: assessment.qualityBand,
              summary: assessment.summary,
            }));
          } else {
            const band = { excellent: '✦', good: '✓', acceptable: '~', poor: '✗' }[assessment.qualityBand];
            console.log(`\n${band} Agent Q Assessment — node ${args.nodeId.substring(0, 8)}…`);
            console.log(`  Quality score: ${assessment.qualityScore.toFixed(3)} [${assessment.qualityBand}]`);
            console.log(`  Files critiqued: ${assessment.filesCritiqued}`);
            console.log(`    avg static score: ${assessment.avgFileQuality.toFixed(3)}`);
            console.log(`    positive: ${assessment.positiveFiles}/${assessment.filesCritiqued}`);
            console.log(`    clean:    ${assessment.cleanFiles}/${assessment.filesCritiqued}`);
            console.log(`  Stored to agent_q_assessments. MCTS node value updated.`);
          }
        } else {
          // stats
          const rows = getRecentAssessments(db, args.limit ?? 10, args.agent);
          if (args.json) {
            console.log(JSON.stringify(rows.map((r) => ({
              nodeId: r.latsNodeId,
              agent: r.agentId,
              qualityScore: r.qualityScore,
              qualityBand: r.qualityBand,
              filesCritiqued: r.filesCritiqued,
              summary: r.summary,
              at: r.createdAt,
            }))));
          } else {
            console.log(`\nAgent Q History (${rows.length} assessments):\n`);
            if (rows.length === 0) {
              console.log('  No assessments yet. Run `lats assess --node <uuid>` after an agent completes.');
            } else {
              const avgScore = rows.reduce((s, r) => s + r.qualityScore, 0) / rows.length;
              console.log(`  Overall avg quality: ${avgScore.toFixed(3)}\n`);
              for (const r of rows) {
                const band = { excellent: '✦', good: '✓', acceptable: '~', poor: '✗' }[r.qualityBand] ?? '?';
                console.log(`  ${band} [${r.qualityBand.padEnd(10)}] score=${r.qualityScore.toFixed(3)}` +
                  (r.agentId ? `  agent=${r.agentId}` : ''));
                console.log(`    task: ${r.taskDescription.substring(0, 70)}`);
                console.log(`    files: ${r.filesCritiqued}  at: ${r.createdAt}`);
                console.log();
              }
            }
          }
        }
        break;
      }

      case 'pipeline': {
        const sub = args.subcommand;
        if (!sub) {
          console.error('Error: pipeline requires a subcommand: start|stage|finish|stats|suggest|history|blame');
          process.exit(1);
        }

        const pipeline = args.pipelineName ?? 'ralph-wiggum';

        switch (sub) {
          case 'start': {
            const runId = startRun(db, { pipelineName: pipeline, notes: args.task });
            if (args.json) {
              console.log(JSON.stringify({ runId, pipeline }));
            } else {
              console.log(`Pipeline run started: ${runId}`);
              console.log(`  Pipeline: ${pipeline}`);
              console.log(`  Default ordering: ${DEFAULT_ORDERING.join(' → ')}`);
              console.log(`\nUse --run ${runId} for subsequent stage/finish calls.`);
            }
            break;
          }

          case 'stage': {
            if (!args.runId) { console.error('Error: --run <id> required'); process.exit(1); }
            if (!args.stage) { console.error('Error: --stage <name> required'); process.exit(1); }
            if (args.success === undefined) { console.error('Error: --success true|false required'); process.exit(1); }
            if (args.position === undefined) { console.error('Error: --position <n> required'); process.exit(1); }
            recordStage(db, args.runId, {
              stageName: args.stage as StageName,
              position: args.position,
              success: args.success,
              durationMs: args.durationMs,
              inputCritiqueScore: args.inputScore,
              outputCritiqueScore: args.outputScore,
              errorMessage: args.errorMessage,
            });
            if (!args.json) {
              const icon = args.success ? '✓' : '✗';
              console.log(`${icon} Stage recorded: ${args.stage} [pos=${args.position}] success=${args.success}`);
            }
            break;
          }

          case 'finish': {
            if (!args.runId) { console.error('Error: --run <id> required'); process.exit(1); }
            if (args.success === undefined) { console.error('Error: --success true|false required'); process.exit(1); }
            finishRun(db, args.runId, args.success, args.stage);
            if (args.json) {
              console.log(JSON.stringify({ finalized: true, runId: args.runId, success: args.success }));
            } else {
              console.log(`Pipeline run ${args.success ? 'SUCCEEDED' : 'FAILED'}: ${args.runId}`);
              if (!args.success && args.stage) {
                console.log(`  Failed at: ${args.stage}`);
                console.log('  Blame scores computed. Run `lats pipeline stats` to review.');
              }
            }
            break;
          }

          case 'stats': {
            const stats = getStageStats(db, pipeline);
            if (args.json) {
              console.log(JSON.stringify(stats, null, 2));
            } else {
              console.log(`\nPipeline Stage Stats: ${pipeline}\n`);
              if (stats.length === 0) {
                console.log('  No pipeline run data yet. Use `lats pipeline start` to begin tracking.');
              } else {
                console.log('  Stage              Runs  Success  Blame    Avg-ms');
                console.log('  ─────────────────────────────────────────────────');
                for (const s of stats) {
                  const blame = s.blameFrequency > 0.1 ? `⚠ ${(s.blameFrequency * 100).toFixed(0)}%` : `  ${(s.blameFrequency * 100).toFixed(0)}%`;
                  const ms = s.avgDurationMs ? `${Math.round(s.avgDurationMs)}ms` : 'n/a';
                  console.log(
                    `  ${s.stageName.padEnd(18)} ${String(s.runs).padEnd(5)} ${(s.successRate * 100).toFixed(0).padEnd(8)} ${blame.padEnd(9)} ${ms}`,
                  );
                }
              }
            }
            break;
          }

          case 'suggest': {
            const suggestions = suggestOrderings(db, pipeline, args.limit ?? 3);
            if (args.json) {
              console.log(JSON.stringify(suggestions, null, 2));
            } else {
              console.log(`\nOrdering Suggestions for: ${pipeline}\n`);
              if (suggestions.length === 0) {
                console.log('  Not enough pipeline run data to suggest alternatives.');
                console.log('  Run at least 5 pipeline iterations to build up statistics.');
              } else {
                for (let i = 0; i < suggestions.length; i++) {
                  const s = suggestions[i];
                  if (!s) continue;
                  const deltaStr = s.delta >= 0 ? `+${(s.delta * 100).toFixed(1)}%` : `${(s.delta * 100).toFixed(1)}%`;
                  console.log(`  Option ${i + 1}: expected=${(s.expectedSuccessRate * 100).toFixed(1)}% (${deltaStr})`);
                  console.log(`    ${s.ordering.join(' → ')}`);
                  console.log(`    ${s.rationale}`);
                  console.log();
                }
              }
            }
            break;
          }

          case 'history': {
            const runs = getRunHistory(db, pipeline, args.limit ?? 10);
            if (args.json) {
              console.log(JSON.stringify(runs, null, 2));
            } else {
              console.log(`\nPipeline Run History: ${pipeline} (${runs.length} runs)\n`);
              for (const r of runs) {
                const outcome = r.success === null ? 'running' : r.success ? 'SUCCESS' : 'FAILED';
                const ms = r.durationMs ? `${Math.round(r.durationMs / 1000)}s` : '—';
                console.log(`  [${outcome}] ${r.id.substring(0, 8)}… ${r.completedStages}/${r.totalStages} stages ${ms}`);
                if (r.failedAtStage) console.log(`    failed at: ${r.failedAtStage}`);
                console.log(`    at: ${r.createdAt}`);
                console.log();
              }
              if (runs.length === 0) {
                console.log('  No runs yet. Use `lats pipeline start` to begin tracking.');
              }
            }
            break;
          }

          case 'blame': {
            const count = recomputeAllBlame(db);
            if (!args.json) {
              console.log(`Recomputed blame for ${count} failed run(s).`);
              console.log('Run `lats pipeline stats` to see blame frequencies per stage.');
            } else {
              console.log(JSON.stringify({ recomputed: count }));
            }
            break;
          }

          default:
            console.error(`Unknown pipeline subcommand: ${sub}`);
            console.error('Valid: start|stage|finish|stats|suggest|history|blame');
            process.exit(1);
        }
        break;
      }
    }
  } finally {
    closeDb();
  }
}

main().catch((err) => {
  console.error('Fatal:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
