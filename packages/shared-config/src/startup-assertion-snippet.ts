import { resolve, dirname } from 'path';
import { existsSync } from 'fs';

/**
 * Asserts that a stateful database path does not reside inside the code repository workspace.
 * Throws a fatal Error if a path segregation violation is detected.
 */
export function assertSafeDatabasePath(dbPath: string, dbName: string): void {
    if (dbPath === ':memory:') {
        return;
    }

    const resolvedPath = resolve(dbPath);
    const resolvedPathLower = resolvedPath.toLowerCase();

    // 1. Check against WORKSPACE_ROOT env variable if configured
    const workspaceRoot = process.env.WORKSPACE_ROOT ? resolve(process.env.WORKSPACE_ROOT) : null;
    if (workspaceRoot && resolvedPathLower.startsWith(workspaceRoot.toLowerCase())) {
        throw new Error(
            `[PathSegregationViolation] Fatal: Database '${dbName}' path resides inside code workspace root (WORKSPACE_ROOT): ${resolvedPath}`
        );
    }

    // 2. Identify workspace root dynamically by walking up to find pnpm-workspace.yaml or .git
    let currentDir = dirname(resolvedPath);
    let detectedWorkspaceRoot: string | null = null;

    while (currentDir && currentDir !== dirname(currentDir)) {
        if (existsSync(resolve(currentDir, 'pnpm-workspace.yaml')) || existsSync(resolve(currentDir, '.git'))) {
            detectedWorkspaceRoot = currentDir;
            break;
        }
        currentDir = dirname(currentDir);
    }

    if (
        detectedWorkspaceRoot &&
        resolvedPathLower.startsWith(detectedWorkspaceRoot.toLowerCase())
    ) {
        throw new Error(
            `[PathSegregationViolation] Fatal: Database '${dbName}' path resides inside the detected code repository root: ${resolvedPath}\nWorkspace Root: ${detectedWorkspaceRoot}`
        );
    }

    // 3. Fallback: Enforce strict boundaries against V:\monorepo specifically
    if (resolvedPathLower.includes('v:\\monorepo') || resolvedPathLower.includes('v:/monorepo')) {
        throw new Error(
            `[PathSegregationViolation] Fatal: Database '${dbName}' path contains hardcoded 'V:\\monorepo': ${resolvedPath}`
        );
    }
}
