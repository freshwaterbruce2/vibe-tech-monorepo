import ts from 'typescript';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Get target files
let files = process.argv.slice(2);
const workspaceRoot = path.resolve(path.dirname(import.meta.url.replace('file:///', '')), '..');

if (files.length === 0) {
    try {
        const output = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf8' });
        files = output.split('\n').map(f => f.trim()).filter(f => f && /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(f));
    } catch {
        files = [];
    }
}

if (files.length === 0) {
    process.exit(0);
}

let hasErrors = false;

// Allowed canonical storage directories (outside code workspace)
const ALLOWED_CANONICAL_ROOTS = [
    'D:\\databases',
    'D:\\logs',
    'D:\\learning-system',
    'D:\\data',
    'D:/databases',
    'D:/logs',
    'D:/learning-system',
    'D:/data'
];

function isAllowedCanonicalPath(p) {
    return ALLOWED_CANONICAL_ROOTS.some(root => p.startsWith(root) || p.toLowerCase().startsWith(root.toLowerCase()));
}

// Path-policy tooling scripts intentionally contain absolute path literals
// (deprecated-path detection patterns, Windows SystemRoot fallbacks, allowed
// canonical roots). Exempt them by basename, same rationale as the
// registry.json/.mcp.json exemptions in check-staged-paths.js.
const PATH_POLICY_TOOLING = new Set([
    'monorepo-sync-audit.mjs',
    'check-staged-paths.js',
    'validate-paths-ast.js',
    'check-vibe-paths.js',
]);

for (const file of files) {
    const fullPath = path.resolve(workspaceRoot, file);
    if (!fs.existsSync(fullPath)) {
        continue;
    }

    if (PATH_POLICY_TOOLING.has(path.basename(file))) {
        continue;
    }

    // Skip test files from strict __dirname AST checks, as they can use mock paths
    const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(file);

    const sourceText = fs.readFileSync(fullPath, 'utf8');
    const sourceFile = ts.createSourceFile(
        fullPath,
        sourceText,
        ts.ScriptTarget.Latest,
        true
    );

    function checkNode(node) {
        // 1. Check string/template literals for V: drive or incorrect absolute paths
        if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
            const value = node.text;

            // Check if string contains hardcoded absolute path to V: drive
            if (/^[a-zA-Z]:(\\|\/)/.test(value)) {
                // If it's an absolute path but not in the allowed canonical directories, flag it
                const isAllowed = isAllowedCanonicalPath(value);
                // We also allow mock paths in test files
                if (!isAllowed && !isTestFile && !value.includes('path-segregation-ignore')) {
                    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
                    console.error(`\x1b[31m[ASTPathError]\x1b[0m ${file}:${line + 1}:${character + 1}: Unsafe absolute path literal found: "${value}"`);
                    hasErrors = true;
                }
            }

            // Flag relative path literals that resolve inside the code workspace for db/logs
            if (!isTestFile && (value.includes('/databases/') || value.includes('\\databases\\') || value.includes('/logs/') || value.includes('\\logs\\'))) {
                // If the path contains relative markers and resolves within the code repository
                if (value.startsWith('.') || value.includes('..')) {
                    const resolved = path.resolve(path.dirname(fullPath), value);
                    if (resolved.startsWith(workspaceRoot) && !value.includes('path-segregation-ignore')) {
                        const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
                        console.error(`\x1b[31m[ASTPathError]\x1b[0m ${file}:${line + 1}:${character + 1}: Unsafe relative reference to workspace folder: "${value}"`);
                        hasErrors = true;
                    }
                }
            }
        }

        // 2. Check for __dirname usage in database/log/cache file-system path resolutions
        if (ts.isIdentifier(node) && node.text === '__dirname' && !isTestFile) {
            // Check if __dirname is used in path joining/resolution
            // Walk up to find CallExpression (e.g. path.join or path.resolve)
            let parent = node.parent;
            let isPathResolution = false;
            let args = [];

            while (parent && !ts.isSourceFile(parent)) {
                if (ts.isCallExpression(parent)) {
                    const expression = parent.expression;
                    const isPathJoinOrResolve = ts.isPropertyAccessExpression(expression) &&
                        ts.isIdentifier(expression.expression) &&
                        expression.expression.text === 'path' &&
                        (expression.name.text === 'join' || expression.name.text === 'resolve');
                    
                    if (isPathJoinOrResolve) {
                        isPathResolution = true;
                        args = parent.arguments;
                    }
                    break;
                }
                parent = parent.parent;
            }

            if (isPathResolution) {
                // Check if the joined path arguments target databases, logs, or caches in the repo
                let targetsRepo = false;
                for (const arg of args) {
                    if (ts.isStringLiteral(arg)) {
                        const text = arg.text;
                        if (text.includes('databases') || text.includes('logs') || text.includes('cache') || text.includes('learning')) {
                            targetsRepo = true;
                            break;
                        }
                    }
                }

                if (targetsRepo && !sourceText.includes('path-segregation-ignore')) {
                    const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
                    console.error(`\x1b[31m[ASTPathError]\x1b[0m ${file}:${line + 1}:${character + 1}: Unsafe use of __dirname resolving code-workspace directory paths for databases or logs.`);
                    hasErrors = true;
                }
            }
        }

        ts.forEachChild(node, checkNode);
    }

    checkNode(sourceFile);
}

if (hasErrors) {
    console.error('\x1b[31mPath segregation AST validation failed. Correct absolute/relative paths in JS/TS.\x1b[0m');
    process.exit(1);
} else {
    console.log('\x1b[32mPath segregation AST check passed.\x1b[0m');
    process.exit(0);
}
