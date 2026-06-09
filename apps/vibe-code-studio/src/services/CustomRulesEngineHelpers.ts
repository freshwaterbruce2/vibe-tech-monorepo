/**
 * CustomRulesEngineHelpers - Pure helper functions for CustomRulesEngine
 */
import type {
  CodingConventions,
  NamingConventions,
  StylePreferences,
} from '../types/customInstructions';

/**
 * Generate style instructions for AI
 */
export function generateStyleInstructions(style: StylePreferences): string {
  let instructions = '\n\nStyle Preferences:\n';

  if (style.indentation) {
    instructions += `- Use ${style.indentation} for indentation (${style.indentSize ?? 2} ${style.indentation === 'spaces' ? 'spaces' : 'tab'})\n`;
  }

  if (style.quotes) {
    instructions += `- Use ${style.quotes} quotes\n`;
  }

  if (style.semicolons !== undefined) {
    instructions += `- ${style.semicolons ? 'Always use' : 'Never use'} semicolons\n`;
  }

  if (style.lineLength) {
    instructions += `- Keep lines under ${style.lineLength} characters\n`;
  }

  return instructions;
}

/**
 * Generate naming convention instructions
 */
export function generateNamingInstructions(naming: NamingConventions): string {
  let instructions = '\n\nNaming Conventions:\n';

  if (naming.variables) {instructions += `- Variables: ${naming.variables}\n`;}
  if (naming.functions) {instructions += `- Functions: ${naming.functions}\n`;}
  if (naming.classes) {instructions += `- Classes: ${naming.classes}\n`;}
  if (naming.constants) {instructions += `- Constants: ${naming.constants}\n`;}

  return instructions;
}

/**
 * Generate coding convention instructions
 */
export function generateConventionInstructions(conventions: CodingConventions): string {
  let instructions = '\n\nCoding Conventions:\n';

  if (conventions.errorHandling) {
    instructions += `- Error handling: Use ${conventions.errorHandling}\n`;
  }

  if (conventions.asyncPattern) {
    instructions += `- Async pattern: Use ${conventions.asyncPattern}\n`;
  }

  if (conventions.stateManagement) {
    instructions += `- State management: ${conventions.stateManagement}\n`;
  }

  return instructions;
}

/**
 * Extract functions from code for validation
 */
export function extractFunctions(code: string): Array<{ name: string; lines: number }> {
  const functions: Array<{ name: string; lines: number }> = [];

  // Simple regex to find functions (not perfect, but works for validation)
  const functionRegex = /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>)\s*\{/g;

  let match;
  while ((match = functionRegex.exec(code)) !== null) {
    const name = match[1] ?? match[2] ?? 'anonymous';
    const start = match.index;

    // Find matching closing brace (simplified)
    let braceCount = 1;
    let end = start + match[0].length;

    while (braceCount > 0 && end < code.length) {
      if (code[end] === '{') {braceCount++;}
      if (code[end] === '}') {braceCount--;}
      end++;
    }

    const functionCode = code.substring(start, end);
    const lines = functionCode.split('\n').length;

    functions.push({ name, lines });
  }

  return functions;
}
