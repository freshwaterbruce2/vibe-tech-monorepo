import type { AICodeCompletion, AICodeGenerationRequest, AICodeGenerationResponse } from '../../../types';

export class CodeGenerationDemoProvider {
  static getCompletion(
    code: string,
    _language: string,
    position: { line: number; column: number }
  ): AICodeCompletion[] {
    // Simple demo completions based on common patterns
    if (code.includes('console.')) {
      return [
        {
          text: 'log()',
          range: {
            startLineNumber: position.line,
            startColumn: position.column,
            endLineNumber: position.line,
            endColumn: position.column,
          },
          confidence: 0.9,
        },
      ];
    }

    if (code.includes('useState')) {
      return [
        {
          text: '(initialValue)',
          range: {
            startLineNumber: position.line,
            startColumn: position.column,
            endLineNumber: position.line,
            endColumn: position.column,
          },
          confidence: 0.85,
        },
      ];
    }

    if (code.includes('function ') || code.includes('const ')) {
      return [
        {
          text: '() => {\n  // Implementation here\n  return null\n}',
          range: {
            startLineNumber: position.line,
            startColumn: position.column,
            endLineNumber: position.line,
            endColumn: position.column,
          },
          confidence: 0.8,
        },
      ];
    }

    return [
      {
        text: '// Add your code here',
        range: {
          startLineNumber: position.line,
          startColumn: position.column,
          endLineNumber: position.line,
          endColumn: position.column,
        },
        confidence: 0.5,
      },
    ];
  }

  static getGenerationResponse(request: AICodeGenerationRequest): AICodeGenerationResponse {
    return {
      code: `// Generated code based on: ${request.prompt}
const generatedFunction = () => {
  // Implementation here
  return 'Generated result'
}

export default generatedFunction`,
      language: 'typescript',
      explanation: `This is a demo implementation for "${request.prompt}". In a real scenario, I would analyze your requirements and generate appropriate code.`,
    };
  }
}
