/**
 * CodeExecutorHelpers - Pure helper functions for CodeExecutor
 * Security validation, syntax checking, and execution strategy utilities
 */

import type { SecurityPolicy, SupportedLanguage, ExecutionOptions } from './CodeExecutorTypes';

// --- Delimiter balance checker ---

/**
 * Check for unmatched bracket/paren/brace delimiters in code.
 * Strips string literals and comments before scanning.
 */
export function checkMatchedDelimiters(code: string): string[] {
  const errors: string[] = [];
  const stack: { char: string; line: number }[] = [];
  const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
  const closers: Record<string, string> = { ')': '(', ']': '[', '}': '{' };

  // Strip string literals and comments to avoid false positives
  const stripped = code
    .replace(/\/\/.*$/gm, '')                    // single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, '')            // multi-line comments
    .replace(/#.*$/gm, '')                       // Python comments
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')         // double-quoted strings
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")         // single-quoted strings
    .replace(/`(?:[^`\\]|\\.)*`/g, '``');        // template literals

  const lines = stripped.split('\n');
  for (let i = 0; i < lines.length; i++) {
    for (const ch of lines[i] ?? '') {
      if (ch in pairs) {
        stack.push({ char: ch, line: i + 1 });
      } else if (ch in closers) {
        const last = stack.pop();
        if (!last || last.char !== closers[ch]) {
          errors.push(`Line ${i + 1}: Unmatched '${ch}'`);
        }
      }
    }
  }

  for (const unmatched of stack) {
    errors.push(`Line ${unmatched.line}: Unmatched '${unmatched.char}'`);
  }

  return errors;
}

// --- Syntax validators ---

export function validateJavaScriptSyntax(code: string): { valid: boolean; errors: string[] } {
  try {
    // Use Function constructor for syntax checking (safer than eval)
    new Function(code);
    return { valid: true, errors: [] };
  } catch (error) {
    return {
      valid: false,
      errors: [error instanceof Error ? error.message : 'JavaScript syntax error']
    };
  }
}

export async function validatePythonSyntax(code: string): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];
  const lines = code.split('\n');

  // Track indentation consistency (spaces vs tabs)
  let usesSpaces = false;
  let usesTabs = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.trim() === '' || line.trim().startsWith('#')) { continue; }

    const leadingWhitespace = line.match(/^(\s*)/)?.[1] ?? '';
    if (leadingWhitespace.includes(' ') && leadingWhitespace.length > 0) usesSpaces = true;
    if (leadingWhitespace.includes('\t')) usesTabs = true;

    const trimmed = line.trim();

    // Check for block openers that need a colon
    if (/^(def|class|if|elif|else|for|while|try|except|finally|with|async\s+(def|for|with))\b/.test(trimmed)) {
      // Allow multi-line statements (ending with \) and decorators
      if (!trimmed.endsWith(':') && !trimmed.endsWith('\\') && !trimmed.endsWith(',')) {
        // Look ahead for continuation lines
        let continued = false;
        for (let j = i + 1; j < lines.length && j <= i + 5; j++) {
          const nextLine = lines[j]?.trim();
          if (!nextLine || nextLine === '') continue;
          if (nextLine.endsWith(':')) { continued = true; break; }
          if (!nextLine.endsWith('\\') && !nextLine.endsWith(',')) break;
        }
        if (!continued) {
          errors.push(`Line ${i + 1}: Block statement may be missing trailing colon (:)`);
        }
      }
    }
  }

  // Mixed indentation
  if (usesSpaces && usesTabs) {
    errors.push('Mixed spaces and tabs used for indentation');
  }

  // Check for unmatched brackets/parens
  const bracketErrors = checkMatchedDelimiters(code);
  if (bracketErrors.length > 0) {
    errors.push(...bracketErrors);
  }

  // Check for unmatched triple-quoted strings
  const tripleDouble = (code.match(/"""/g) ?? []).length;
  const tripleSingle = (code.match(/'''/g) ?? []).length;
  if (tripleDouble % 2 !== 0) {
    errors.push('Unmatched triple-double-quote string (""")');
  }
  if (tripleSingle % 2 !== 0) {
    errors.push("Unmatched triple-single-quote string (''')");
  }

  return { valid: errors.length === 0, errors };
}

export function validateBashSyntax(code: string): { valid: boolean; errors: string[] } {
  const bashSyntaxIssues: string[] = [];

  // Check for unmatched quotes
  const singleQuotes = (code.match(/'/g) ?? []).length;
  const doubleQuotes = (code.match(/"/g) ?? []).length;

  if (singleQuotes % 2 !== 0) {
    bashSyntaxIssues.push('Unmatched single quotes');
  }

  if (doubleQuotes % 2 !== 0) {
    bashSyntaxIssues.push('Unmatched double quotes');
  }

  return { valid: bashSyntaxIssues.length === 0, errors: bashSyntaxIssues };
}

// --- Security validators ---

export function validateCommandSecurity(
  command: string,
  policy: SecurityPolicy
): { allowed: boolean; reason?: string } {
  const cmd = command.trim().toLowerCase();

  // Check for blocked commands
  for (const blocked of policy.blockedCommands) {
    if (cmd.includes(blocked)) {
      return {
        allowed: false,
        reason: `Command contains blocked operation: ${blocked}`
      };
    }
  }

  // Check for dangerous patterns
  const dangerousPatterns = [
    /\brm\s+-rf\s*\//, // rm -rf /
    />\s*\/dev\//, // redirect to system devices
    /\|\s*sh/, // pipe to shell
    /\$\(.*\)/, // command substitution
    /`.*`/, // backtick command substitution
    /;\s*(rm|del|format)/, // chained dangerous commands
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(cmd)) {
      return {
        allowed: false,
        reason: 'Command contains potentially dangerous pattern'
      };
    }
  }

  return { allowed: true };
}

export function validateCodeSecurity(
  code: string,
  language: SupportedLanguage
): { allowed: boolean; reason?: string } {
  const codeToCheck = code.toLowerCase();

  // Common dangerous patterns across languages
  const dangerousPatterns = [
    /require\s*\(\s*['"]fs['"]/,
    /require\s*\(\s*['"]child_process['"]/,
    /import.*fs.*from/,
    /import.*child_process.*from/,
    /exec\s*\(/,
    /spawn\s*\(/,
    /eval\s*\(/,
    /function\s*\(\s*\)\s*{\s*return\s*this/,
    /__filename/,
    /__dirname/,
    /process\s*\./,
    /global\s*\./,
  ];

  // Language-specific dangerous patterns
  if (language === 'python') {
    dangerousPatterns.push(
      /import\s+os/,
      /import\s+subprocess/,
      /import\s+sys/,
      /exec\s*\(/,
      /eval\s*\(/,
      /__import__\s*\(/,
      /compile\s*\(/
    );
  }

  for (const pattern of dangerousPatterns) {
    if (pattern.test(codeToCheck)) {
      return {
        allowed: false,
        reason: 'Code contains potentially dangerous operations'
      };
    }
  }

  return { allowed: true };
}

// --- Path and strategy helpers ---

export function getSafePathEnvironment(): string {
  // Return a restricted PATH that only includes safe directories
  return '/usr/local/bin:/usr/bin:/bin';
}

export function getExecutionStrategy(language: SupportedLanguage, _code: string, _options: ExecutionOptions) {
  switch (language) {
    case 'javascript':
    case 'node':
      return {
        runtime: 'node',
        args: ['--max-old-space-size=256', '--no-warnings'],
        extension: '.js'
      };

    case 'typescript':
      return {
        runtime: 'tsx',
        args: ['--no-warnings'],
        extension: '.ts',
        fallback: {
          runtime: 'node',
          args: ['-r', 'ts-node/register', '--no-warnings'],
          extension: '.ts'
        }
      };

    case 'python':
      return {
        runtime: 'python3',
        args: ['-u'], // unbuffered output
        extension: '.py'
      };

    case 'bash':
      return {
        runtime: 'bash',
        args: ['-e'], // exit on error
        extension: '.sh'
      };

    case 'deno':
      return {
        runtime: 'deno',
        args: ['run', '--allow-none'],
        extension: '.ts'
      };

    case 'bun':
      return {
        runtime: 'bun',
        args: ['run'],
        extension: '.js'
      };

    default:
      throw new Error(`Unsupported language: ${language}`);
  }
}
