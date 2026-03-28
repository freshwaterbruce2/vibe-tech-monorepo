/**
 * Test Generator
 * Generates test templates for different frameworks
 */

/** Browser-safe path helpers (avoids Node.js 'path' module externalization in Vite) */
function getExtname(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot > 0 ? filename.slice(dot) : '';
}
function getBasename(filename: string, ext?: string): string {
  const name = filename.replace(/\\/g, '/').split('/').pop() ?? filename;
  return ext && name.endsWith(ext) ? name.slice(0, -ext.length) : name;
}
import { FrameworkDetector } from './FrameworkDetector';
import type { LoggerFunction, TestRunnerOptions } from './types';

export class TestGenerator {
  private readonly workspaceRoot: string;
  private readonly logger: LoggerFunction;
  private readonly frameworkDetector: FrameworkDetector;

  constructor(workspaceRoot: string, logger: LoggerFunction) {
    this.workspaceRoot = workspaceRoot;
    this.logger = logger;
    this.frameworkDetector = new FrameworkDetector(workspaceRoot, logger);
  }

  /**
   * Generate test for a given code snippet
   */
  async generateTest(
    code: string,
    filename: string,
    options: TestRunnerOptions = {}
  ): Promise<string> {
    try {
      const frameworks = await this.frameworkDetector.detectFrameworks();
      const framework = this.frameworkDetector.selectFramework(options.testFramework, frameworks);

      if (!framework) {
        throw new Error('No test framework detected for test generation');
      }

      const ext = getExtname(filename);
      const baseName = getBasename(filename, ext);
      const isTypeScript = ext === '.ts' || ext === '.tsx';
      const isReact = ext === '.jsx' || ext === '.tsx';

      let template = '';

      if (framework.name === 'vitest') {
        template = this.generateVitestTemplate(code, baseName, isReact);
      } else if (framework.name === 'jest') {
        template = this.generateJestTemplate(code, baseName, isReact);
      } else if (framework.name === 'mocha') {
        template = this.generateMochaTemplate(code, baseName);
      } else {
        // Generic template
        template = this.generateGenericTemplate(code, baseName, isReact);
      }

      this.logger(`Generated test template for ${filename} using ${framework.name}`);
      return template;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger(`Failed to generate test: ${errorMessage}`, 'error');
      throw new Error(`Failed to generate test: ${errorMessage}`);
    }
  }

  // Framework-specific templates
  private generateVitestTemplate(code: string, baseName: string, isReact: boolean): string {
    const imports = [
      "import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';"
    ];

    if (isReact) {
      imports.push("import { render, screen, fireEvent, cleanup } from '@testing-library/react';");
      imports.push("import { userEvent } from '@testing-library/user-event';");
    }

    imports.push(`import { ${this.extractExports(code).join(', ')} } from './${baseName}';`);

    const tests = this.generateTestCases(code, baseName, isReact);

    return `${imports.join('\n')}\n\n${tests}`;
  }

  private generateJestTemplate(code: string, baseName: string, isReact: boolean): string {
    const imports = [];

    if (isReact) {
      imports.push("import { render, screen, fireEvent, cleanup } from '@testing-library/react';");
      imports.push("import userEvent from '@testing-library/user-event';");
    }

    imports.push(`import { ${this.extractExports(code).join(', ')} } from './${baseName}';`);

    const tests = this.generateTestCases(code, baseName, isReact);

    return `${imports.join('\n')}\n\n${tests}`;
  }

  private generateMochaTemplate(code: string, baseName: string): string {
    const imports = [
      "import { expect } from 'chai';",
      `import { ${this.extractExports(code).join(', ')} } from './${baseName}';`
    ];

    const tests = this.generateTestCases(code, baseName, false, 'mocha');

    return `${imports.join('\n')}\n\n${tests}`;
  }

  private generateGenericTemplate(code: string, baseName: string, isReact: boolean): string {
    const imports = [
      `import { ${this.extractExports(code).join(', ')} } from './${baseName}';`
    ];

    const tests = this.generateTestCases(code, baseName, isReact);

    return `${imports.join('\n')}\n\n${tests}`;
  }

  /**
   * Extract exports from code
   */
  private extractExports(code: string): string[] {
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
   * Generate test cases from code analysis
   */
  private generateTestCases(
    code: string,
    baseName: string,
    isReact: boolean,
    framework: string = 'vitest'
  ): string {
    const functions = this.extractFunctions(code);
    const classes = this.extractClasses(code);
    const exports = this.extractExports(code);
    const testFunction = framework === 'mocha' ? 'it' : 'it';

    let tests = `describe('${baseName}', () => {\n`;

    if (isReact) {
      tests += `  afterEach(() => {\n    cleanup();\n  });\n\n`;
    }

    // Generate tests for functions
    for (const func of functions) {
      tests += this.generateFunctionTest(func, isReact, testFunction, code);
    }

    // Generate tests for classes
    for (const cls of classes) {
      tests += this.generateClassTest(cls, testFunction, code);
    }

    // If no functions or classes found, generate tests for exports
    if (functions.length === 0 && classes.length === 0) {
      if (exports.length > 0 && exports[0] !== 'default') {
        for (const exp of exports) {
          tests += `  ${testFunction}('should export ${exp}', () => {\n`;
          tests += `    expect(${exp}).toBeDefined();\n`;
          tests += `  });\n\n`;
        }
      } else {
        // Truly empty module — still generate a useful placeholder
        tests += `  ${testFunction}('module should be importable', () => {\n`;
        tests += `    // Module loaded successfully if this test runs\n`;
        tests += `    expect(true).toBe(true);\n`;
        tests += `  });\n\n`;
      }
    }

    tests += `});`;

    return tests;
  }

  private generateFunctionTest(func: string, isReact: boolean, testFunction: string, code?: string): string {
    let test = `  describe('${func}', () => {\n`;
    test += `    ${testFunction}('should be defined', () => {\n`;
    test += `      expect(${func}).toBeDefined();\n`;
    test += `    });\n\n`;

    const isComponent = isReact && (func.charAt(0) === func.charAt(0).toUpperCase());

    if (isComponent) {
      // React component — generate render, snapshot, and interaction tests
      test += `    ${testFunction}('should render without crashing', () => {\n`;
      test += `      render(<${func} />);\n`;
      test += `    });\n\n`;

      test += `    ${testFunction}('should match snapshot', () => {\n`;
      test += `      const { container } = render(<${func} />);\n`;
      test += `      expect(container.firstChild).toMatchSnapshot();\n`;
      test += `    });\n\n`;

      test += `    ${testFunction}('should be accessible', () => {\n`;
      test += `      render(<${func} />);\n`;
      test += `      const element = screen.getByRole('main') ?? document.querySelector('[data-testid]');\n`;
      test += `      if (element) {\n`;
      test += `        expect(element).toBeInTheDocument();\n`;
      test += `      }\n`;
      test += `    });\n\n`;
    } else {
      // Regular function — generate tests based on parameter analysis
      const details = code ? this.extractFunctionDetails(code, func) : { params: [], isAsync: false };

      if (details.params.length === 0) {
        // No-arg function
        if (details.isAsync) {
          test += `    ${testFunction}('should resolve when called', async () => {\n`;
          test += `      const result = await ${func}();\n`;
          test += `      expect(result).toBeDefined();\n`;
          test += `    });\n\n`;
        } else {
          test += `    ${testFunction}('should return a value when called', () => {\n`;
          test += `      const result = ${func}();\n`;
          test += `      expect(result).toBeDefined();\n`;
          test += `    });\n\n`;
        }
      } else {
        // Build sample arguments
        const sampleArgs = details.params
          .filter(p => !p.optional)
          .map(p => this.getSampleValue(p.type, p.name))
          .join(', ');

        if (details.isAsync) {
          test += `    ${testFunction}('should resolve with valid arguments', async () => {\n`;
          test += `      const result = await ${func}(${sampleArgs});\n`;
          test += `      expect(result).toBeDefined();\n`;
          test += `    });\n\n`;
        } else {
          test += `    ${testFunction}('should return expected output with valid arguments', () => {\n`;
          test += `      const result = ${func}(${sampleArgs});\n`;
          test += `      expect(result).toBeDefined();\n`;
          test += `    });\n\n`;
        }

        // Test with edge cases for each parameter type
        for (const param of details.params) {
          if (param.type === 'string' || (!param.type && (param.name.includes('name') || param.name.includes('text') || param.name.includes('str')))) {
            test += `    ${testFunction}('should handle empty string for ${param.name}', ${details.isAsync ? 'async ' : ''}() => {\n`;
            const edgeArgs = details.params.map(p =>
              p.name === param.name ? "''" : this.getSampleValue(p.type, p.name)
            ).join(', ');
            if (details.isAsync) {
              test += `      const result = await ${func}(${edgeArgs});\n`;
            } else {
              test += `      const result = ${func}(${edgeArgs});\n`;
            }
            test += `      expect(result).toBeDefined();\n`;
            test += `    });\n\n`;
          }

          if (param.type === 'number' || (!param.type && (param.name.includes('count') || param.name.includes('num') || param.name.includes('index')))) {
            test += `    ${testFunction}('should handle zero for ${param.name}', ${details.isAsync ? 'async ' : ''}() => {\n`;
            const zeroArgs = details.params.map(p =>
              p.name === param.name ? '0' : this.getSampleValue(p.type, p.name)
            ).join(', ');
            if (details.isAsync) {
              test += `      const result = await ${func}(${zeroArgs});\n`;
            } else {
              test += `      const result = ${func}(${zeroArgs});\n`;
            }
            test += `      expect(result).toBeDefined();\n`;
            test += `    });\n\n`;

            test += `    ${testFunction}('should handle negative number for ${param.name}', ${details.isAsync ? 'async ' : ''}() => {\n`;
            const negArgs = details.params.map(p =>
              p.name === param.name ? '-1' : this.getSampleValue(p.type, p.name)
            ).join(', ');
            if (details.isAsync) {
              test += `      const result = await ${func}(${negArgs});\n`;
            } else {
              test += `      const result = ${func}(${negArgs});\n`;
            }
            test += `      expect(result).toBeDefined();\n`;
            test += `    });\n\n`;
          }
        }

        // Test optional parameters are truly optional
        const requiredParams = details.params.filter(p => !p.optional);
        if (requiredParams.length < details.params.length && requiredParams.length > 0) {
          const requiredArgs = requiredParams.map(p => this.getSampleValue(p.type, p.name)).join(', ');
          test += `    ${testFunction}('should work with only required arguments', ${details.isAsync ? 'async ' : ''}() => {\n`;
          if (details.isAsync) {
            test += `      const result = await ${func}(${requiredArgs});\n`;
          } else {
            test += `      const result = ${func}(${requiredArgs});\n`;
          }
          test += `      expect(result).toBeDefined();\n`;
          test += `    });\n\n`;
        }
      }

      // Type-specific return assertions
      if (details.returnType) {
        const rt = details.returnType.toLowerCase();
        const asyncPrefix = details.isAsync ? 'async ' : '';
        const awaitPrefix = details.isAsync ? 'await ' : '';
        const args = details.params.length > 0
          ? details.params.map(p => this.getSampleValue(p.type, p.name)).join(', ')
          : '';

        if (rt === 'boolean') {
          test += `    ${testFunction}('should return a boolean', ${asyncPrefix}() => {\n`;
          test += `      const result = ${awaitPrefix}${func}(${args});\n`;
          test += `      expect(typeof result).toBe('boolean');\n`;
          test += `    });\n\n`;
        } else if (rt === 'number') {
          test += `    ${testFunction}('should return a number', ${asyncPrefix}() => {\n`;
          test += `      const result = ${awaitPrefix}${func}(${args});\n`;
          test += `      expect(typeof result).toBe('number');\n`;
          test += `    });\n\n`;
        } else if (rt === 'string') {
          test += `    ${testFunction}('should return a string', ${asyncPrefix}() => {\n`;
          test += `      const result = ${awaitPrefix}${func}(${args});\n`;
          test += `      expect(typeof result).toBe('string');\n`;
          test += `    });\n\n`;
        } else if (rt.endsWith('[]') || rt.startsWith('array')) {
          test += `    ${testFunction}('should return an array', ${asyncPrefix}() => {\n`;
          test += `      const result = ${awaitPrefix}${func}(${args});\n`;
          test += `      expect(Array.isArray(result)).toBe(true);\n`;
          test += `    });\n\n`;
        } else if (rt === 'void') {
          test += `    ${testFunction}('should return undefined (void)', ${asyncPrefix}() => {\n`;
          test += `      const result = ${awaitPrefix}${func}(${args});\n`;
          test += `      expect(result).toBeUndefined();\n`;
          test += `    });\n\n`;
        }
      }
    }

    test += `  });\n\n`;
    return test;
  }

  private generateClassTest(cls: string, testFunction: string, code?: string): string {
    let test = `  describe('${cls}', () => {\n`;

    // Extract constructor parameters to generate proper instantiation
    const constructorParams = code ? this.extractConstructorParams(code, cls) : [];
    const methods = code ? this.extractClassMethods(code, cls) : [];

    const constructorArgs = constructorParams.map(p => this.getSampleValue(undefined, p)).join(', ');
    const instanceInit = constructorParams.length > 0
      ? `new ${cls}(${constructorArgs})`
      : `new ${cls}()`;

    // Add a shared instance via beforeEach for method tests
    if (methods.length > 0) {
      test += `    let instance: ${cls};\n\n`;
      test += `    beforeEach(() => {\n`;
      test += `      instance = ${instanceInit};\n`;
      test += `    });\n\n`;
    }

    test += `    ${testFunction}('should be instantiable', () => {\n`;
    test += `      const inst = ${instanceInit};\n`;
    test += `      expect(inst).toBeInstanceOf(${cls});\n`;
    test += `    });\n\n`;

    // Generate test for each public method
    for (const method of methods) {
      const details = code ? this.extractFunctionDetails(code, method) : { params: [], isAsync: false };
      const methodArgs = details.params
        .filter(p => !p.optional)
        .map(p => this.getSampleValue(p.type, p.name))
        .join(', ');

      test += `    describe('${method}', () => {\n`;

      if (details.isAsync) {
        test += `      ${testFunction}('should resolve when called', async () => {\n`;
        test += `        const result = await instance.${method}(${methodArgs});\n`;
        test += `        expect(result).toBeDefined();\n`;
        test += `      });\n`;
      } else {
        test += `      ${testFunction}('should execute without throwing', () => {\n`;
        test += `        expect(() => instance.${method}(${methodArgs})).not.toThrow();\n`;
        test += `      });\n`;
      }

      test += `    });\n\n`;
    }

    test += `  });\n\n`;
    return test;
  }

  /**
   * Extract function names from code
   */
  private extractFunctions(code: string): string[] {
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
  private extractClasses(code: string): string[] {
    const classes: string[] = [];

    const classDeclarations = code.match(/(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/g);
    if (classDeclarations) {
      classes.push(...classDeclarations.map(cls => cls.split(/\s+/).pop()!));
    }

    return classes;
  }

  /**
   * Extract detailed function information including parameters and return hints
   */
  private extractFunctionDetails(code: string, funcName: string): {
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
      const params = this.splitParameters(paramStr);
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
   * Split parameter string respecting nested generics and destructuring
   */
  private splitParameters(paramStr: string): string[] {
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
   * Extract class method names from code
   */
  private extractClassMethods(code: string, className: string): string[] {
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
  private extractConstructorParams(code: string, className: string): string[] {
    const classRegex = new RegExp(`class\\s+${className}[^{]*\\{[\\s\\S]*?constructor\\s*\\(([^)]*)\\)`);
    const match = code.match(classRegex);
    if (!match?.[1]?.trim()) return [];

    return this.splitParameters(match[1]).map(p => p.trim().split(/[?:=]/)[0]?.trim()).filter((n): n is string => !!n);
  }

  /**
   * Generate a sample value for a given type
   */
  private getSampleValue(type?: string, paramName?: string): string {
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
      // Union type — use first concrete type
      const first = type.split('|')[0]?.trim();
      return this.getSampleValue(first, paramName);
    }
    return '{}';
  }
}
