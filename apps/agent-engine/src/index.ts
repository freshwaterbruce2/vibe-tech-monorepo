import { randomUUID } from 'crypto';
import { MoonshotProvider } from './providers/moonshot-provider.js';
import { BenchmarkService } from './services/benchmark-service.js';
import { EvaluationService } from './services/evaluation-service.js';
import { ExecutionService } from './services/execution-service.js';
import { RunTraceRepository } from './services/run-trace-repository.js';
import { orchestrateMonorepo } from './agents/monorepo-orchestrator.js';
import type { TaskSpec } from './types.js';

function printHelp(): void {
  console.log(`Agent Engine

Usage:
  tsx src/index.ts help
  tsx src/index.ts benchmark
  tsx src/index.ts self-eval
  tsx src/index.ts behavioral-eval <suite-id> [category-or-case-id]
  tsx src/index.ts create-candidate <trace-id> "<reason>" "<diff-summary>" [file1,file2]
  tsx src/index.ts promote-candidate <candidate-id>
  tsx src/index.ts run-task "<title>" "<objective>"
  tsx src/index.ts orchestrate "<goal>" [project1,project2,...]
`);
}

const nullProvider = {
  name: 'null-provider',
  async generateText() {
    return { text: '' };
  },
};

function printFailingSuites(suites: Array<{ suite: string; details: string[] }>): void {
  const failing = suites.filter((suite) => suite.details.length > 0);
  if (failing.length === 0) {
    return;
  }

  for (const suite of failing) {
    console.error(`[FAIL] ${suite.suite}`);
    for (const detail of suite.details.slice(0, 3)) {
      console.error(`  ${detail}`);
    }
  }
}

async function runBenchmark(): Promise<void> {
  const evaluation = new EvaluationService('C:\\dev', 'scripted');
  const benchmarkService = new BenchmarkService();
  const repoSuites = await evaluation.runRepoLocalSuites();
  const regressionSuites = benchmarkService.runRegressionPackSuites('C:\\dev');
  const external = benchmarkService.runExternalLane();
  const allSuites = [...repoSuites, ...regressionSuites, ...(external ? [external] : [])];
  const report = benchmarkService.createReport(allSuites);

  console.log(JSON.stringify(report, null, 2));

  const failingSuites = allSuites.filter((suite) => !suite.passed);
  if (failingSuites.length > 0) {
    printFailingSuites(failingSuites);
    throw new Error('Benchmark gate failed.');
  }
}

async function runSelfEval(): Promise<void> {
  const evaluation = new EvaluationService('C:\\dev', 'scripted');
  const benchmarkService = new BenchmarkService();
  const suites = [
    ...(await evaluation.runBehavioralSuites()),
    ...benchmarkService.runRegressionPackSuites('C:\\dev'),
  ];
  const score = evaluation.summarizeScore(suites);

  console.log(
    JSON.stringify(
      {
        name: 'agent-engine-self-eval',
        score,
        tasks: benchmarkService.getRegressionPack(),
        suites,
      },
      null,
      2,
    ),
  );

  const failingSuites = suites.filter((suite) => !suite.passed);
  if (failingSuites.length > 0) {
    printFailingSuites(failingSuites);
    throw new Error('Self-eval gate failed.');
  }
}

async function runBehavioralEval(suiteId: string, categoryOrCaseId?: string): Promise<void> {
  const evaluation = new EvaluationService('C:\\dev', 'auto');
  const suites = await evaluation.runBehavioralSuites();
  const selected = suites.find((suite) => suite.suite === suiteId);

  if (!selected) {
    throw new Error(`Unknown behavioral suite: ${suiteId}`);
  }

  if (!categoryOrCaseId) {
    console.log(JSON.stringify(selected, null, 2));
    if (!selected.passed) {
      throw new Error(`Behavioral suite ${suiteId} failed.`);
    }
    return;
  }

  const raw = JSON.parse(selected.rawOutput ?? '{}') as {
    provider?: string;
    cases?: Array<{
      id: string;
      category: string;
      passed?: boolean;
      score?: number;
      name?: string;
    }>;
  };
  const matchingCases = (raw.cases ?? []).filter(
    (entry) => entry.id === categoryOrCaseId || entry.category === categoryOrCaseId,
  );

  if (matchingCases.length === 0) {
    throw new Error(`No behavioral cases matched ${categoryOrCaseId}.`);
  }

  console.log(
    JSON.stringify(
      {
        suite: selected.suite,
        provider: raw.provider,
        cases: matchingCases,
      },
      null,
      2,
    ),
  );

  if (matchingCases.some((entry) => entry.passed === false)) {
    throw new Error(`Behavioral filter ${categoryOrCaseId} failed.`);
  }
}

async function promoteCandidate(candidateId: string): Promise<void> {
  const service = new ExecutionService(nullProvider);
  const result = await service.promoteCandidate(candidateId);
  console.log(JSON.stringify(result, null, 2));

  if (result.promotionDecision?.decision !== 'accepted') {
    throw new Error(`Candidate ${candidateId} rejected.`);
  }
}

async function createCandidate(
  traceId: string,
  reason: string,
  diffSummary: string,
  filesTouchedCsv: string | undefined,
): Promise<void> {
  const trace = new RunTraceRepository().get(traceId);
  const filesTouched = filesTouchedCsv
    ? filesTouchedCsv
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
    : trace.filesTouched;
  const service = new ExecutionService(nullProvider);
  const result = await service.createCandidateFromTrace(trace, filesTouched, diffSummary, reason);
  console.log(JSON.stringify(result, null, 2));
}

async function runOrchestrate(goal: string, projectsCsv?: string): Promise<void> {
  const projects = projectsCsv
    ?.split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  const result = await orchestrateMonorepo(goal, projects);
  console.log(JSON.stringify(result, null, 2));
  if (!result.succeeded) {
    throw new Error(`Orchestration failed. See summary:\n${result.summary}`);
  }
}

async function runTask(title: string, objective: string): Promise<void> {
  const task: TaskSpec = {
    id: randomUUID(),
    title,
    objective,
    constraints: ['Local monorepo only', 'Use Nx-backed validation', 'No destructive git commands'],
    acceptanceCriteria: ['Run trace persisted', 'Plan generated'],
  };

  const service = new ExecutionService(new MoonshotProvider());
  const result = await service.runTask(task);
  console.log(JSON.stringify(result.trace, null, 2));
}

async function main(): Promise<void> {
  const command = process.argv[2] ?? 'help';

  switch (command) {
    case 'help':
      printHelp();
      break;
    case 'benchmark':
      await runBenchmark();
      break;
    case 'self-eval':
      await runSelfEval();
      break;
    case 'behavioral-eval':
      if (!process.argv[3]) {
        throw new Error('Suite id is required.');
      }
      await runBehavioralEval(process.argv[3], process.argv[4]);
      break;
    case 'create-candidate':
      if (!process.argv[3] || !process.argv[4] || !process.argv[5]) {
        throw new Error(
          'create-candidate requires <trace-id> "<reason>" "<diff-summary>" [file1,file2].',
        );
      }
      await createCandidate(process.argv[3], process.argv[4], process.argv[5], process.argv[6]);
      break;
    case 'promote-candidate':
      if (!process.argv[3]) {
        throw new Error('Candidate id is required.');
      }
      await promoteCandidate(process.argv[3]);
      break;
    case 'run-task':
      await runTask(process.argv[3] ?? 'Untitled task', process.argv[4] ?? 'No objective provided');
      break;
    case 'orchestrate':
      if (!process.argv[3]) {
        throw new Error('orchestrate requires a "<goal>" argument.');
      }
      await runOrchestrate(process.argv[3], process.argv[4]);
      break;
    default:
      printHelp();
      throw new Error(`Unknown command: ${command}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
