/**
 * TestGenerator Templates
 * Framework-specific test template generation functions.
 */

import {
  extractExports,
  extractFunctions,
  extractClasses,
  extractFunctionDetails,
  extractClassMethods,
  extractConstructorParams,
  getSampleValue,
} from './TestGeneratorHelpers';

export function generateVitestTemplate(code: string, baseName: string, isReact: boolean): string {
  const imports = [
    "import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';"
  ];

  if (isReact) {
    imports.push("import { render, screen, fireEvent, cleanup } from '@testing-library/react';");
    imports.push("import { userEvent } from '@testing-library/user-event';");
  }

  imports.push(`import { ${extractExports(code).join(', ')} } from './${baseName}';`);

  const tests = generateTestCases(code, baseName, isReact);

  return `${imports.join('\n')}\n\n${tests}`;
}

export function generateJestTemplate(code: string, baseName: string, isReact: boolean): string {
  const imports = [];

  if (isReact) {
    imports.push("import { render, screen, fireEvent, cleanup } from '@testing-library/react';");
    imports.push("import userEvent from '@testing-library/user-event';");
  }

  imports.push(`import { ${extractExports(code).join(', ')} } from './${baseName}';`);

  const tests = generateTestCases(code, baseName, isReact);

  return `${imports.join('\n')}\n\n${tests}`;
}

export function generateMochaTemplate(code: string, baseName: string): string {
  const imports = [
    "import { expect } from 'chai';",
    `import { ${extractExports(code).join(', ')} } from './${baseName}';`
  ];

  const tests = generateTestCases(code, baseName, false, 'mocha');

  return `${imports.join('\n')}\n\n${tests}`;
}

export function generateGenericTemplate(code: string, baseName: string, isReact: boolean): string {
  const imports = [
    `import { ${extractExports(code).join(', ')} } from './${baseName}';`
  ];

  const tests = generateTestCases(code, baseName, isReact);

  return `${imports.join('\n')}\n\n${tests}`;
}

/**
 * Generate test cases from code analysis
 */
export function generateTestCases(
  code: string,
  baseName: string,
  isReact: boolean,
  framework: string = 'vitest'
): string {
  const functions = extractFunctions(code);
  const classes = extractClasses(code);
  const exports = extractExports(code);
  const testFunction = framework === 'mocha' ? 'it' : 'it';

  let tests = `describe('${baseName}', () => {\n`;

  if (isReact) {
    tests += `  afterEach(() => {\n    cleanup();\n  });\n\n`;
  }

  // Generate tests for functions
  for (const func of functions) {
    tests += generateFunctionTest(func, isReact, testFunction, code);
  }

  // Generate tests for classes
  for (const cls of classes) {
    tests += generateClassTest(cls, testFunction, code);
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
      // Truly empty module - still generate a useful placeholder
      tests += `  ${testFunction}('module should be importable', () => {\n`;
      tests += `    // Module loaded successfully if this test runs\n`;
      tests += `    expect(true).toBe(true);\n`;
      tests += `  });\n\n`;
    }
  }

  tests += `});`;

  return tests;
}

export function generateFunctionTest(func: string, isReact: boolean, testFunction: string, code?: string): string {
  let test = `  describe('${func}', () => {\n`;
  test += `    ${testFunction}('should be defined', () => {\n`;
  test += `      expect(${func}).toBeDefined();\n`;
  test += `    });\n\n`;

  const isComponent = isReact && (func.charAt(0) === func.charAt(0).toUpperCase());

  if (isComponent) {
    // React component - generate render, snapshot, and interaction tests
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
    // Regular function - generate tests based on parameter analysis
    const details = code ? extractFunctionDetails(code, func) : { params: [], isAsync: false };

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
        .map(p => getSampleValue(p.type, p.name))
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
            p.name === param.name ? "''" : getSampleValue(p.type, p.name)
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
            p.name === param.name ? '0' : getSampleValue(p.type, p.name)
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
            p.name === param.name ? '-1' : getSampleValue(p.type, p.name)
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
        const requiredArgs = requiredParams.map(p => getSampleValue(p.type, p.name)).join(', ');
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
        ? details.params.map(p => getSampleValue(p.type, p.name)).join(', ')
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

export function generateClassTest(cls: string, testFunction: string, code?: string): string {
  let test = `  describe('${cls}', () => {\n`;

  // Extract constructor parameters to generate proper instantiation
  const constructorParams = code ? extractConstructorParams(code, cls) : [];
  const methods = code ? extractClassMethods(code, cls) : [];

  const constructorArgs = constructorParams.map(p => getSampleValue(undefined, p)).join(', ');
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
    const details = code ? extractFunctionDetails(code, method) : { params: [], isAsync: false };
    const methodArgs = details.params
      .filter(p => !p.optional)
      .map(p => getSampleValue(p.type, p.name))
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
