/**
 * System Action Executors
 *
 * Handles system operations: run commands, tests, git, project review
 */
import { logger } from '../../../../services/Logger';
import { CodeQualityAnalyzer } from '../../../CodeQualityAnalyzer';
import type { ActionContext, StepResult } from '../types';

/**
 * Run command action executor
 */
export async function executeRunCommand(
  params: Record<string, unknown>,
  _context: ActionContext
): Promise<StepResult> {
  void params;
  return {
    success: false,
    message:
      'Generic shell commands are disabled because they can bypass exact mutation approval. ' +
      'Use run_tests with an Nx project and an allowed validation target.',
  };
}

/**
 * Run tests action executor
 */
export async function executeRunTests(
  params: Record<string, unknown>,
  context: ActionContext
): Promise<StepResult> {
  try {
    // No shell in web/dev-web mode — skip cleanly rather than hard-fail the task.
    if (typeof window === 'undefined' || !window.electron?.shell?.execute) {
      logger.warn('[SystemActions] Test execution requires the desktop app (no shell in web mode)');
      return {
        success: false,
        skipped: true,
        message: 'Test execution requires the desktop app (no shell in web mode).',
      };
    }

    const projectName = requireNxIdentifier(params['projectName'], 'projectName');
    const targets = parseValidationTargets(params['targets'] ?? params['target']);
    const command =
      targets.length === 1
        ? `pnpm nx run ${projectName}:${targets[0]}`
        : `pnpm nx run-many -t ${targets.join(' ')} --projects=${projectName} --parallel=1`;
    const cwd = context.taskState.workspaceRoot;

    const result = await window.electron.shell.execute(command, cwd);
    if (!result) {
      return { success: false, message: `Test runner could not be started: ${command}` };
    }

    const exitCode = typeof result.code === 'number' ? result.code : result.success ? 0 : 1;
    const passed = result.success === true && exitCode === 0;
    const stdout = boundCommandOutput(result.stdout);
    const stderr = boundCommandOutput(result.stderr);
    return {
      success: passed,
      data: {
        passed,
        projectName,
        targets,
        command,
        stdout,
        stderr,
        code: exitCode,
      },
      message: passed
        ? `Nx validation passed for ${projectName}: ${targets.join(', ')}`
        : `Nx validation failed for ${projectName} (exit ${exitCode}): ${stderr || stdout || command}`,
    };
  } catch (error) {
    throw new Error(`Failed to run tests: ${error}`);
  }
}

const NX_PROJECT_NAME = /^@?[a-zA-Z0-9][a-zA-Z0-9._-]*(?:\/[a-zA-Z0-9][a-zA-Z0-9._-]*)?$/;
const SAFE_VALIDATION_TARGETS = new Set(['typecheck', 'lint', 'test', 'build']);
const MAX_VALIDATION_OUTPUT = 40_000;

function requireNxIdentifier(value: unknown, name: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`run_tests requires a safe Nx ${name}`);
  }
  const identifier = value.trim();
  const valid =
    name === 'projectName'
      ? NX_PROJECT_NAME.test(identifier)
      : SAFE_VALIDATION_TARGETS.has(identifier);
  if (!valid) throw new Error(`run_tests requires a safe Nx ${name}`);
  return identifier;
}

function parseValidationTargets(value: unknown): string[] {
  const candidates = Array.isArray(value) ? value : value === undefined ? ['test'] : [value];
  const targets = candidates.map(target => requireNxIdentifier(target, 'target'));
  if (targets.length === 0 || targets.length > 5) {
    throw new Error('run_tests requires between one and five Nx targets');
  }
  return [...new Set(targets)];
}

function boundCommandOutput(value: unknown): string {
  const output = typeof value === 'string' ? value : '';
  return output.length <= MAX_VALIDATION_OUTPUT
    ? output
    : `${output.slice(0, MAX_VALIDATION_OUTPUT)}\n...[output truncated]`;
}

/**
 * Git commit action executor
 */
export async function executeGitCommit(
  params: Record<string, unknown>,
  context: ActionContext
): Promise<StepResult> {
  try {
    await context.gitService.commit(params['message'] as string);
    return {
      success: true,
      message: `Created git commit: ${params['message']}`,
    };
  } catch (error) {
    throw new Error(`Failed to create git commit: ${error}`);
  }
}

/**
 * Review project action executor
 */
export async function executeReviewProject(
  params: Record<string, unknown>,
  context: ActionContext
): Promise<StepResult> {
  try {
    if (!params['workspaceRoot']) {
      throw new Error('Missing required parameter: workspaceRoot');
    }

    const codeQualityAnalyzer = new CodeQualityAnalyzer(context.fileSystemService);
    logger.debug(`[SystemActions] Analyzing project quality for: ${params['workspaceRoot']}`);
    const report = await codeQualityAnalyzer.analyzeProject(params['workspaceRoot'] as string);

    const summary = `
Project Quality Report:
- Total Files: ${report.totalFiles}
- Total Lines of Code: ${report.totalLinesOfCode.toLocaleString()}
- Average Quality Score: ${Math.round(report.averageQuality)}/100
- Average Complexity: ${report.averageComplexity.toFixed(1)}
- Files with Issues: ${report.filesWithIssues}

${
  report.filesWithIssues > 0
    ? `
Top 5 Files Needing Attention:
${report.fileReports
  .filter(f => f.issues.length > 0)
  .sort((a, b) => a.quality - b.quality)
  .slice(0, 5)
  .map(
    (f, i) =>
      `${i + 1}. ${f.filePath} (Quality: ${Math.round(f.quality)}, Issues: ${f.issues.length})`
  )
  .join('\n')}
`
    : '✓ No quality issues found!'
}
    `.trim();

    return {
      success: true,
      data: { report, summary },
      message: `Analyzed ${report.totalFiles} files. Average quality: ${Math.round(report.averageQuality)}/100`,
    };
  } catch (error) {
    throw new Error(`Failed to review project: ${error}`);
  }
}

/**
 * Custom action executor.
 *
 * A `custom` step is a catch-all with no concrete operation — it is emitted when
 * the planner could not decompose the request into a real action (the fallback
 * task) or when metacognition proposes a free-text approach. It has no way to
 * actually perform work, so it must NOT report success: doing so made Agent Mode
 * claim "Task completed" while doing nothing. Returning success:false routes it
 * through self-correction (which can propose a concrete action) and, failing
 * that, an honest, actionable failure.
 */
export async function executeCustomAction(
  params: Record<string, unknown>,
  _context: ActionContext
): Promise<StepResult> {
  const request =
    (typeof params['userRequest'] === 'string' && params['userRequest']) ||
    (typeof params['approach'] === 'string' && params['approach']) ||
    '';
  const detail = request ? ` for: "${request}"` : '';
  return {
    success: false,
    data: params,
    message:
      `No concrete action was planned${detail}. Rephrase with a specific ` +
      `operation (e.g., "create file X with ...", "edit Y to ...", or "read Z").`,
  };
}
