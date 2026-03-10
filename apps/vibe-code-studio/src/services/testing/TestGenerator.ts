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
    const testFunction = framework === 'mocha' ? 'it' : 'it';

    let tests = `describe('${baseName}', () => {\n`;

    if (isReact) {
      tests += `  afterEach(() => {\n    cleanup();\n  });\n\n`;
    }

    // Generate tests for functions
    for (const func of functions) {
      tests += this.generateFunctionTest(func, isReact, testFunction);
    }

    // Generate tests for classes
    for (const cls of classes) {
      tests += this.generateClassTest(cls, testFunction);
    }

    // If no functions or classes found, generate a basic test
    if (functions.length === 0 && classes.length === 0) {
      tests += `  ${testFunction}('should be defined', () => {\n`;
      tests += `    expect(true).toBe(true);\n`;
      tests += `    // TODO: Add actual tests\n`;
      tests += `  });\n\n`;
    }

    tests += `});`;

    return tests;
  }

  private generateFunctionTest(func: string, isReact: boolean, testFunction: string): string {
    let test = `  describe('${func}', () => {\n`;
    test += `    ${testFunction}('should be defined', () => {\n`;
    test += `      expect(${func}).toBeDefined();\n`;
    test += `    });\n\n`;

    if (isReact && (func.includes('Component') || func.charAt(0) === func.charAt(0).toUpperCase())) {
      test += `    ${testFunction}('should render without crashing', () => {\n`;
      test += `      render(<${func} />);\n`;
      test += `    });\n\n`;
    } else {
      test += `    ${testFunction}('should work correctly', () => {\n`;
      test += `      // TODO: Add test implementation\n`;
      test += `      // const result = ${func}();\n`;
      test += `      // expect(result).toBe(expected);\n`;
      test += `    });\n\n`;
    }

    test += `  });\n\n`;
    return test;
  }

  private generateClassTest(cls: string, testFunction: string): string {
    let test = `  describe('${cls}', () => {\n`;
    test += `    ${testFunction}('should be instantiable', () => {\n`;
    test += `      const instance = new ${cls}();\n`;
    test += `      expect(instance).toBeInstanceOf(${cls});\n`;
    test += `    });\n\n`;
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
}
