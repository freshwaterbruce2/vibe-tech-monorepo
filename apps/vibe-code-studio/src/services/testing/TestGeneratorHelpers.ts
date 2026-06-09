/**
 * TestGenerator Helpers
 * Pure helper functions extracted from TestGenerator: path utils, code analysis utilities.
 */

/** Browser-safe path helpers (avoids Node.js 'path' module externalization in Vite) */
export function getExtname(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot > 0 ? filename.slice(dot) : '';
}

export function getBasename(filename: string, ext?: string): string {
  const name = filename.replace(/\\/g, '/').split('/').pop() ?? filename;
  return ext && name.endsWith(ext) ? name.slice(0, -ext.length) : name;
}

/**
 * Extract exports from code
 */
export function extractExports(code: string): string[] {
  const exports: string[] = [];

  // Extract named exports
  const namedExports = code.match(/export\s+(?:const|let|var|function|class)\s+(\w+)/g);
  if (namedExports) {
    exports.push(...namedExports.map(exp => exp.split(/\s+/).pop()!));
  }

  // Extract default export
  const defaultExport = code.match(/export\s+default\s+(\w+)/);
  if (defaultExport?.[1]) {
    exports.push(defaultExport[1]);
  }

  // Extract export { ... } statements
  const exportStatements = code.match(/export\s*\{([^}]+)\}/g);
  if (exportStatements) {
    for (const statement of exportStatements) {
      const names = statement.match(/\{([^}]+)\}/)?.[1]
        ?.split(',')
        .map(name => name.trim().split(/\s+as\s+/)[0]?.trim())
        .filter((n): n is string => !!n);
      if (names) {
        exports.push(...names);
      }
    }
  }

  return exports.length > 0 ? exports : ['default'];
}

/**
 * Extract function names from code
 */
export function extractFunctions(code: string): string[] {
  const functions: string[] = [];

  // Extract function declarations
  const funcDeclarations = code.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)/g);
  if (funcDeclarations) {
    functions.push(...funcDeclarations.map(func => func.split(/\s+/).pop()!));
  }

  // Extract arrow functions
  const arrowFunctions = code.match(/(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g);
  if (arrowFunctions) {
    functions.push(...arrowFunctions.map(func => func.split(/\s+/)[1]).filter((n): n is string => !!n));
  }

  return functions;
}

/**
 * Extract class names from code
 */
export function extractClasses(code: string): string[] {
  const classes: string[] = [];

  const classDeclarations = code.match(/(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/g);
  if (classDeclarations) {
    classes.push(...classDeclarations.map(cls => cls.split(/\s+/).pop()!));
  }

  return classes;
}

/**
 * Split parameter string respecting nested generics and destructuring
 */
export function splitParameters(paramStr: string): string[] {
  const params: string[] = [];
  let depth = 0;
  let current = '';

  for (const char of paramStr) {
    if (char === '<' || char === '(' || char === '{' || char === '[') {
      depth++;
      current += char;
    } else if (char === '>' || char === ')' || char === '}' || char === ']') {
      depth--;
      current += char;
    } else if (char === ',' && depth === 0) {
      params.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    params.push(current);
  }

  return params;
}

/**
 * Extract detailed function information including parameters and return hints
 */
export function extractFunctionDetails(code: string, funcName: string): {
  params: Array<{ name: string; type?: string; optional?: boolean; defaultValue?: string }>;
  isAsync: boolean;
  returnType?: string;
} {
  const details: {
    params: Array<{ name: string; type?: string; optional?: boolean; defaultValue?: string }>;
    isAsync: boolean;
    returnType?: string;
  } = { params: [], isAsync: false };

  // Match function declaration: (async) function name(params): ReturnType
  const funcDeclRegex = new RegExp(
    `(?:async\\s+)?function\\s+${funcName}\\s*\\(([^)]*)\\)(?:\\s*:\\s*([\\w<>\\[\\]|& ]+))?`,
  );
  // Match arrow function: const name = (async) (params): ReturnType =>
  const arrowRegex = new RegExp(
    `(?:const|let|var)\\s+${funcName}\\s*=\\s*(async\\s+)?\\(([^)]*)\\)(?:\\s*:\\s*([\\w<>\\[\\]|& ]+))?\\s*=>`,
  );
  // Match class method: (async) name(params): ReturnType {
  const methodRegex = new RegExp(
    `(?:async\\s+)?${funcName}\\s*\\(([^)]*)\\)(?:\\s*:\\s*([\\w<>\\[\\]|& ]+))?\\s*\\{`,
  );

  let paramStr = '';
  let returnType: string | undefined;

  const funcMatch = code.match(funcDeclRegex);
  const arrowMatch = code.match(arrowRegex);
  const methodMatch = code.match(methodRegex);

  if (funcMatch) {
    details.isAsync = code.includes(`async function ${funcName}`) || code.includes(`async\nfunction ${funcName}`);
    paramStr = funcMatch[1] ?? '';
    returnType = funcMatch[2]?.trim();
  } else if (arrowMatch) {
    details.isAsync = !!arrowMatch[1];
    paramStr = arrowMatch[2] ?? '';
    returnType = arrowMatch[3]?.trim();
  } else if (methodMatch) {
    details.isAsync = code.includes(`async ${funcName}`);
    paramStr = methodMatch[1] ?? '';
    returnType = methodMatch[2]?.trim();
  }

  if (returnType) {
    details.returnType = returnType;
  }

  // Parse parameter string into structured data
  if (paramStr.trim()) {
    const params = splitParameters(paramStr);
    for (const param of params) {
      const trimmed = param.trim();
      if (!trimmed) continue;

      // Handle destructured params like { a, b }: Type
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        details.params.push({ name: trimmed.split(':')[0]?.trim() ?? trimmed, type: 'object' });
        continue;
      }

      // Parse name?: Type = default
      const paramMatch = trimmed.match(/^(\w+)(\?)?\s*(?::\s*([\w<>\[\]|& ]+))?\s*(?:=\s*(.+))?$/);
      if (paramMatch) {
        details.params.push({
          name: paramMatch[1]!,
          optional: !!paramMatch[2] || !!paramMatch[4],
          type: paramMatch[3]?.trim(),
          defaultValue: paramMatch[4]?.trim(),
        });
      }
    }
  }

  return details;
}

/**
 * Extract class method names from code
 */
export function extractClassMethods(code: string, className: string): string[] {
  const methods: string[] = [];

  // Find the class body
  const classRegex = new RegExp(`class\\s+${className}[^{]*\\{([\\s\\S]*?)\\n\\}`);
  const classMatch = code.match(classRegex);
  if (!classMatch) return methods;

  const classBody = classMatch[1] ?? '';

  // Match method declarations (not constructor, not private with #)
  const methodRegex = /(?:public\s+|protected\s+|private\s+)?(?:static\s+)?(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*[\w<>\[\]| ]+)?\s*\{/g;
  let match;
  while ((match = methodRegex.exec(classBody)) !== null) {
    const name = match[1]!;
    if (name !== 'constructor' && !name.startsWith('_')) {
      methods.push(name);
    }
  }

  return methods;
}

/**
 * Extract constructor parameters for a class
 */
export function extractConstructorParams(code: string, className: string): string[] {
  const classRegex = new RegExp(`class\\s+${className}[^{]*\\{[\\s\\S]*?constructor\\s*\\(([^)]*)\\)`);
  const match = code.match(classRegex);
  if (!match?.[1]?.trim()) return [];

  return splitParameters(match[1]).map(p => p.trim().split(/[?:=]/)[0]?.trim()).filter((n): n is string => !!n);
}

/**
 * Generate a sample value for a given type
 */
export function getSampleValue(type?: string, paramName?: string): string {
  if (!type) {
    // Infer from parameter name
    const name = paramName?.toLowerCase() ?? '';
    if (name.includes('id')) return "'test-id-1'";
    if (name.includes('name') || name.includes('title') || name.includes('label')) return "'test-name'";
    if (name.includes('email')) return "'test@example.com'";
    if (name.includes('password') || name.includes('secret')) return "'test-password'";
    if (name.includes('url') || name.includes('path')) return "'https://example.com'";
    if (name.includes('count') || name.includes('num') || name.includes('index') || name.includes('size') || name.includes('limit')) return '1';
    if (name.includes('flag') || name.includes('enabled') || name.includes('active') || name.includes('visible') || name.includes('is')) return 'true';
    if (name.includes('items') || name.includes('list') || name.includes('array') || name.includes('data')) return '[]';
    if (name.includes('options') || name.includes('config') || name.includes('settings')) return '{}';
    if (name.includes('callback') || name.includes('handler') || name.includes('fn')) return '() => {}';
    return "'test-value'";
  }

  const t = type.toLowerCase().replace(/\s/g, '');
  if (t === 'string') return "'test-value'";
  if (t === 'number') return '42';
  if (t === 'boolean') return 'true';
  if (t === 'null') return 'null';
  if (t === 'undefined') return 'undefined';
  if (t === 'void') return 'undefined';
  if (t === 'date') return 'new Date()';
  if (t.startsWith('array') || t.endsWith('[]')) return '[]';
  if (t.startsWith('map')) return 'new Map()';
  if (t.startsWith('set')) return 'new Set()';
  if (t.startsWith('promise')) return "Promise.resolve('test')";
  if (t.startsWith('record') || t === 'object') return '{}';
  if (t.includes('|')) {
    // Union type - use first concrete type
    const first = type.split('|')[0]?.trim();
    return getSampleValue(first, paramName);
  }
  return '{}';
}
