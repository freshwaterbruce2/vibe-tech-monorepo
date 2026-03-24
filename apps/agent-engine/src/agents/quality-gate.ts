import type { CommandResult } from '../types.js';
import { BenchmarkService } from '../services/benchmark-service.js';
import { EvaluationService } from '../services/evaluation-service.js';
import { nxAffected, nxRun } from '../tools/nx-tools.js';

export async function runQualityGate(target = 'affected'): Promise<void> {
  const checks: Array<[string, CommandResult]> =
    target === 'affected'
      ? [
          ['lint', nxAffected('lint')],
          ['typecheck', nxAffected('typecheck')],
          ['test', nxAffected('test')],
        ]
      : [
          ['lint', nxRun(target, 'lint')],
          ['typecheck', nxRun(target, 'typecheck')],
          ['test', nxRun(target, 'test')],
        ];

  for (const [name, result] of checks) {
    console.log(`[${result.success ? 'PASS' : 'FAIL'}] ${name}`);
    if (!result.success) {
      console.log(result.stderr || result.stdout);
    }
  }

  const evaluation = new EvaluationService('C:\\dev', 'scripted');
  const suites = await evaluation.runRepoLocalSuites();
  const benchmark = new BenchmarkService().createReport(suites);

  console.log(`\nRepo-local eval score: ${evaluation.summarizeScore(suites).toFixed(2)}`);
  console.log(`Benchmark score: ${benchmark.score.toFixed(2)}`);
}

if (process.argv[1]?.endsWith('quality-gate.ts')) {
  runQualityGate(process.argv[2]).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
