/**
 * Action Executors Index
 *
 * Centralized action registry for the ExecutionEngine
 */
import type { ActionContext, ActionRegistry, ActionType, StepResult } from '../types';

// Code Actions
import {
    executeAnalyzeCode,
    executeGenerateCode,
    executeRefactorCode,
    executeSearchCodebase,
} from './CodeActions';
// File Actions
import {
    executeCreateDirectory,
    executeDeleteFile,
    executeEditFile,
    executeReadFile,
    executeWriteFile,
} from './FileActions';
// System Actions
import {
    executeCustomAction,
    executeGitCommit,
    executeReviewProject,
    executeRunCommand,
    executeRunTests,
} from './SystemActions';

/**
 * Creates the action registry with all available action executors
 */
export function createActionRegistry(): ActionRegistry {
    const registry: ActionRegistry = new Map();

    // File operations
    registry.set('read_file', executeReadFile);
    registry.set('write_file', executeWriteFile);
    registry.set('edit_file', executeEditFile);
    registry.set('delete_file', executeDeleteFile);
    registry.set('create_directory', executeCreateDirectory);

    // Code operations
    registry.set('search_codebase', executeSearchCodebase);
    registry.set('analyze_code', executeAnalyzeCode);
    registry.set('refactor_code', executeRefactorCode);
    registry.set('generate_code', executeGenerateCode);

    // System operations
    registry.set('run_command', executeRunCommand);
    registry.set('run_tests', executeRunTests);
    registry.set('git_commit', executeGitCommit);
    registry.set('review_project', executeReviewProject);
    registry.set('custom', executeCustomAction);

    return registry;
}

/**
 * Executes an action by type using the registry
 */
export async function executeAction(
    type: ActionType,
    params: Record<string, unknown>,
    context: ActionContext,
    registry: ActionRegistry
): Promise<StepResult> {
    const executor = registry.get(type);

    if (!executor) {
        throw new Error(`Unknown action type: ${type}`);
    }

    return executor(params, context);
}

// Re-export individual action executors for direct use
export {
    executeAnalyzeCode,
    executeCreateDirectory,
    executeCustomAction,
    executeDeleteFile,
    executeEditFile,
    executeGenerateCode,
    executeGitCommit,
    // File
    executeReadFile,
    executeRefactorCode,
    executeReviewProject,
    // System
    executeRunCommand,
    executeRunTests,
    // Code
    executeSearchCodebase,
    executeWriteFile
};
