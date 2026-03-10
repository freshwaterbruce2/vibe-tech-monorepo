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
    try {
        if (!params['command']) {
            throw new Error('Missing required parameter: command');
        }

        const command = String(params['command']);

        // Prefer Electron shell IPC when available
        if (typeof window !== 'undefined' && (window as any).electron?.shell?.execute) {
            const result = await (window as any).electron.shell.execute(command, params['cwd'] as string | undefined);
            if (result?.success) {
                return {
                    success: true,
                    data: { stdout: result.stdout, stderr: result.stderr, code: result.code },
                    message: `Command executed: ${command}`,
                };
            }
            return {
                success: false,
                data: { stdout: result?.stdout, stderr: result?.stderr, code: result?.code },
                message: result?.stderr ?? 'Command execution failed',
            };
        }

        logger.warn('[SystemActions] Command execution not available in this environment');
        return {
            success: false,
            message: 'Command execution requires Electron environment',
        };
    } catch (error) {
        throw new Error(`Failed to run command: ${error}`);
    }
}

/**
 * Run tests action executor
 */
export async function executeRunTests(
    _params: Record<string, unknown>,
    _context: ActionContext
): Promise<StepResult> {
    try {
        // Test execution not available in browser mode
        logger.warn('[SystemActions] Test execution not yet available in browser mode');
        return {
            success: false,
            message: 'Test execution is only available in desktop mode',
        };
    } catch (error) {
        throw new Error(`Failed to run tests: ${error}`);
    }
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

${report.filesWithIssues > 0 ? `
Top 5 Files Needing Attention:
${report.fileReports
                    .filter(f => f.issues.length > 0)
                    .sort((a, b) => a.quality - b.quality)
                    .slice(0, 5)
                    .map((f, i) => `${i + 1}. ${f.filePath} (Quality: ${Math.round(f.quality)}, Issues: ${f.issues.length})`)
                    .join('\n')}
` : '✓ No quality issues found!'}
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
 * Custom action executor
 */
export async function executeCustomAction(
    params: Record<string, unknown>,
    _context: ActionContext
): Promise<StepResult> {
    return {
        success: true,
        data: params,
        message: 'Custom action executed',
    };
}
