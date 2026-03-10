/**
 * Prompt Sanitizer
 * Prevents prompt injection attacks by sanitizing user input
 */

export interface SanitizeOptions {
  maxLength?: number;
  removeControlChars?: boolean;
  normalizeWhitespace?: boolean;
  checkInjection?: boolean;
  escapeFormat?: 'xml' | 'json' | 'none';
}

export interface SanitizeResult {
  sanitized: string;
  modified: boolean;
  warnings: string[];
}

/**
 * Sanitize user input before inserting into prompts
 */
export function sanitizeUserInput(
  input: string,
  options: SanitizeOptions = {}
): SanitizeResult {
  const {
    maxLength = 10000,
    removeControlChars = true,
    normalizeWhitespace = true,
    checkInjection = true,
    escapeFormat = 'none',
  } = options;

  const warnings: string[] = [];
  let sanitized = input;
  let modified = false;

  // Type check
  if (typeof input !== 'string') {
    return {
      sanitized: '',
      modified: true,
      warnings: ['Input is not a string'],
    };
  }

  // Remove control characters
  if (removeControlChars) {
    const before = sanitized;
    sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
    if (before !== sanitized) {
      modified = true;
      warnings.push('Removed control characters');
    }
  }

  // Normalize whitespace
  if (normalizeWhitespace) {
    const before = sanitized;
    sanitized = sanitized
      .replace(/\s+/g, ' ') // Multiple spaces → single space
      .replace(/^\s+|\s+$/g, ''); // Trim
    if (before !== sanitized) {
      modified = true;
    }
  }

  // Check for injection patterns
  if (checkInjection) {
    const injectionWarnings = detectInjectionAttempts(sanitized);
    if (injectionWarnings.length > 0) {
      warnings.push(...injectionWarnings);
      modified = true;
    }
  }

  // Length limit
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
    modified = true;
    warnings.push(`Truncated to ${maxLength} characters`);
  }

  // Apply escaping
  if (escapeFormat !== 'none') {
    const before = sanitized;
    sanitized = escapeFormat === 'xml' ? escapeXML(sanitized) : escapeJSON(sanitized);
    if (before !== sanitized) {
      modified = true;
    }
  }

  return {
    sanitized,
    modified,
    warnings,
  };
}

/**
 * Detect prompt injection attempts
 */
export function detectInjectionAttempts(text: string): string[] {
  const warnings: string[] = [];

  const patterns = [
    {
      pattern: /ignore\s+(previous|all|above|prior)\s+(instructions?|prompts?|commands?)/gi,
      message: 'Detected "ignore instructions" pattern',
    },
    {
      pattern: /disregard\s+(previous|all|above|prior)/gi,
      message: 'Detected "disregard" pattern',
    },
    {
      pattern: /system\s*:\s*(you\s+are|new\s+instructions?)/gi,
      message: 'Detected system prompt override attempt',
    },
    {
      pattern: /forget\s+(everything|all|previous|prior)/gi,
      message: 'Detected memory manipulation attempt',
    },
    {
      pattern: /new\s+(instructions?|prompts?|commands?):/gi,
      message: 'Detected instruction injection attempt',
    },
    {
      pattern: /(assistant|user|system)\s*:\s*/gi,
      message: 'Detected role manipulation attempt',
    },
    {
      pattern: /\[INST\]|\[\/INST\]|<\|im_start\|>|<\|im_end\|>/gi,
      message: 'Detected model-specific control tokens',
    },
  ];

  for (const { pattern, message } of patterns) {
    if (pattern.test(text)) {
      warnings.push(message);
    }
  }

  return warnings;
}

/**
 * Check if text contains injection patterns (boolean)
 */
export function containsInjectionPatterns(text: string): boolean {
  return detectInjectionAttempts(text).length > 0;
}

/**
 * Escape XML special characters
 */
export function escapeXML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Escape JSON special characters
 */
export function escapeJSON(text: string): string {
  return JSON.stringify(text).slice(1, -1); // Remove quotes
}

/**
 * Wrap user input in delimiters to prevent injection
 */
export function wrapInDelimiters(
  text: string,
  format: 'xml' | 'json' | 'markdown' = 'xml'
): string {
  switch (format) {
    case 'xml':
      return `<user_input>\n${escapeXML(text)}\n</user_input>`;
    case 'json':
      return JSON.stringify({ user_input: text });
    case 'markdown':
      return `\`\`\`user-input\n${text}\n\`\`\``;
    default:
      return text;
  }
}

/**
 * Create a safe prompt template with user input
 */
export function createSafePrompt(
  systemPrompt: string,
  userInput: string,
  options: SanitizeOptions = {}
): string {
  const { sanitized, warnings } = sanitizeUserInput(userInput, {
    ...options,
    escapeFormat: 'xml', // Always use XML escaping for safety
  });

  if (warnings.length > 0) {
    console.warn('[PromptSanitizer] Warnings:', warnings);
  }

  return `${systemPrompt}

<user_query>
${sanitized}
</user_query>

Please respond to the user's query above. The query has been sanitized and is enclosed in XML tags to prevent injection.`;
}

/**
 * Validate and sanitize file content before including in prompts
 */
export function sanitizeFileContent(
  content: string,
  options: {
    maxLength?: number;
    removeComments?: boolean;
    language?: string;
  } = {}
): string {
  const { maxLength = 50000, removeComments = false, language } = options;

  let sanitized = content;

  // Remove comments if requested
  if (removeComments && language) {
    sanitized = removeCodeComments(sanitized, language);
  }

  // Truncate if needed
  if (sanitized.length > maxLength) {
    const ratio = maxLength / sanitized.length;
    const lines = sanitized.split('\n');
    const keepLines = Math.floor(lines.length * ratio);
    sanitized = lines.slice(0, keepLines).join('\n') + '\n\n// ... truncated';
  }

  return sanitized;
}

/**
 * Remove comments from code (basic implementation)
 */
function removeCodeComments(code: string, language: string): string {
  switch (language) {
    case 'javascript':
    case 'typescript':
    case 'java':
    case 'c':
    case 'cpp':
      return code
        .replace(/\/\*[\s\S]*?\*\//g, '') // Block comments
        .replace(/\/\/.*/g, ''); // Line comments
    case 'python':
      return code
        .replace(/#.*/g, '') // Line comments
        .replace(/"""[\s\S]*?"""/g, '') // Docstrings
        .replace(/'''[\s\S]*?'''/g, '');
    case 'html':
    case 'xml':
      return code.replace(/<!--[\s\S]*?-->/g, '');
    default:
      return code;
  }
}
