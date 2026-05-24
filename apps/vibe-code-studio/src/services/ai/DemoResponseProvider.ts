import { logger as _logger } from '../../services/Logger';
import { REACT_COMPONENT_DEMO, TYPESCRIPT_DEMO, TEST_DEMO, REACT_HOOK_DEMO, FUNCTION_DEMO } from './DemoResponseData';
import type {
  AICodeCompletion,
  AICodeGenerationRequest,
  AICodeGenerationResponse,
  AIContextRequest,
  AIResponse,
} from '../../types';

/**
 * Provides demo responses when no real API key is available
 */
export class DemoResponseProvider {
  static getContextualResponse(request: AIContextRequest): AIResponse {
    const query = request.userQuery.toLowerCase();

    // Check if this is a task planning request (expects JSON output)
    if (query.includes('output format (json)') || query.includes('available actions:')) {
      return this.getTaskPlanResponse(request);
    }

    const reactJsonResponse = this.getReActJsonResponse(request);
    if (reactJsonResponse) {
      return reactJsonResponse;
    }

    if (query.includes('react') || query.includes('component')) {
      return this.getReactComponentResponse();
    }

    if (query.includes('typescript') || query.includes('interface')) {
      return this.getTypeScriptResponse();
    }

    if (query.includes('test') || query.includes('jest') || query.includes('vitest')) {
      return this.getTestResponse();
    }

    if (query.includes('hook') || query.includes('usestate') || query.includes('useeffect')) {
      return this.getReactHookResponse();
    }

    if (query.includes('function') || query.includes('arrow')) {
      return this.getFunctionResponse();
    }

    // Default response
    return {
      content: `I understand you're working on: "${request.userQuery}"

Here's a general approach:

1. **Plan your solution** - Break down the problem into smaller steps
2. **Choose the right tools** - Consider the technologies and patterns that fit
3. **Write clean code** - Focus on readability and maintainability
4. **Test your implementation** - Ensure it works as expected

${request.workspaceContext?.languages ? `Based on your project context (${request.workspaceContext.languages.join(', ')}), ` : ''}I'd be happy to help you implement this. Could you provide more specific details about what you'd like to build?`,
      metadata: {
        model: 'demo',
        tokens: 50,
        processing_time: 100,
      },
    };
  }

  private static getReActJsonResponse(request: AIContextRequest): AIResponse | null {
    const lowerQuery = request.userQuery.toLowerCase();
    if (!lowerQuery.includes('response format (json only)')) return null;

    const parseBooleanField = (field: string): boolean | undefined => {
      const match = request.userQuery.match(new RegExp(`"${field}"\\s*:\\s*(true|false)`, 'i'));
      if (!match) return undefined;
      return match[1]?.toLowerCase() === 'true';
    };

    // Phase 1: Thought
    if (lowerQuery.includes('"reasoning"') && lowerQuery.includes('"expectedoutcome"')) {
      return {
        content: JSON.stringify({
          reasoning: 'I will execute the step carefully and validate inputs/outputs before making changes.',
          approach: 'Follow the planned action, then verify results and handle errors gracefully.',
          alternatives: [
            'Inspect the relevant files/config first to confirm assumptions',
            'Run a dry-run or smaller-scope version of the action',
          ],
          confidence: 50,
          risks: [
            'Demo mode response is synthetic',
            'The action may require permissions or missing dependencies',
          ],
          expectedOutcome: 'The action completes and returns a clear success/failure result.',
        }, null, 2),
        metadata: {
          model: 'demo',
          tokens: 120,
          processing_time: 50,
        },
      };
    }

    // Phase 3: Observation
    if (lowerQuery.includes('"actualoutcome"') && lowerQuery.includes('"unexpectedevents"')) {
      const success = parseBooleanField('success') ?? true;

      return {
        content: JSON.stringify({
          actualOutcome: success ? 'The action completed successfully.' : 'The action failed to complete.',
          success,
          differences: [],
          learnings: [
            'Ensure outputs are validated and errors are handled consistently.',
          ],
          unexpectedEvents: [],
        }, null, 2),
        metadata: {
          model: 'demo',
          tokens: 120,
          processing_time: 50,
        },
      };
    }

    // Phase 4: Reflection
    if (lowerQuery.includes('"whatworked"') && lowerQuery.includes('"knowledgegained"')) {
      const shouldRetry = parseBooleanField('shouldRetry') ?? false;

      return {
        content: JSON.stringify({
          whatWorked: ['The step executed without crashing the app.'],
          whatFailed: [],
          rootCause: shouldRetry ? 'The first attempt did not meet expectations.' : undefined,
          shouldRetry,
          suggestedChanges: shouldRetry ? ['Adjust the approach based on observed differences.'] : [],
          knowledgeGained: 'JSON-only responses should be enforced for structured agent phases.',
        }, null, 2),
        metadata: {
          model: 'demo',
          tokens: 120,
          processing_time: 50,
        },
      };
    }

    return null;
  }

  static getCodeCompletion(
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

  static getCodeGenerationResponse(request: AICodeGenerationRequest): AICodeGenerationResponse {
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

  private static getReactComponentResponse(): AIResponse {
    return {
      content: REACT_COMPONENT_DEMO,
      metadata: {
        model: 'demo',
        tokens: 150,
        processing_time: 200,
      },
    };
  }

  private static getTypeScriptResponse(): AIResponse {
    return {
      content: TYPESCRIPT_DEMO,
      metadata: {
        model: 'demo',
        tokens: 180,
        processing_time: 250,
      },
    };
  }

  private static getTestResponse(): AIResponse {
    return {
      content: TEST_DEMO,
      metadata: {
        model: 'demo',
        tokens: 120,
        processing_time: 180,
      },
    };
  }

  private static getReactHookResponse(): AIResponse {
    return {
      content: REACT_HOOK_DEMO,
      metadata: {
        model: 'demo',
        tokens: 160,
        processing_time: 220,
      },
    };
  }

  private static getFunctionResponse(): AIResponse {
    return {
      content: FUNCTION_DEMO,
      metadata: {
        model: 'demo',
        tokens: 200,
        processing_time: 300,
      },
    };
  }

  private static getTaskPlanResponse(request: AIContextRequest): AIResponse {
    // Extract the user request from the planning prompt
    const userRequestMatch = request.userQuery.match(/USER REQUEST: (.+?)(?:\n|$)/);
    const userRequest = userRequestMatch?.[1] ?? 'Complete the task';

    // Extract workspace root
    const workspaceRootMatch = request.userQuery.match(/- Root: (.+?)(?:\n|$)/);
    const workspaceRoot = workspaceRootMatch?.[1] ?? '/';

    // Determine appropriate steps based on the request
    let steps = [];

    if (userRequest.toLowerCase().includes('review') || userRequest.toLowerCase().includes('analyze')) {
      steps = [
        {
          order: 1,
          title: 'Read project structure',
          description: `Analyze the directory structure of ${workspaceRoot}`,
          action: {
            type: 'search_codebase',
            params: {
              searchQuery: 'project structure',
              workspaceRoot,
              pattern: '*',
              includeFiles: true,
              includeDirs: true
            }
          },
          requiresApproval: false,
          maxRetries: 3
        },
        {
          order: 2,
          title: 'Analyze key files',
          description: 'Review package.json, tsconfig.json, and main entry points',
          action: {
            type: 'analyze_code',
            params: {
              workspaceRoot,
              files: ['package.json', 'tsconfig.json', 'src/index.tsx', 'src/App.tsx']
            }
          },
          requiresApproval: false,
          maxRetries: 3
        },
        {
          order: 3,
          title: 'Generate analysis report',
          description: 'Create a comprehensive report of findings',
          action: {
            type: 'write_file',
            params: {
              filePath: `${workspaceRoot}/ANALYSIS_REPORT.md`,
              content: '# Project Analysis Report\n\n*Analysis will be generated here*'
            }
          },
          requiresApproval: true,
          maxRetries: 3
        }
      ];
    } else if (userRequest.toLowerCase().includes('create') || userRequest.toLowerCase().includes('new')) {
      steps = [
        {
          order: 1,
          title: 'Create new file',
          description: `Create the requested file in ${workspaceRoot}`,
          action: {
            type: 'write_file',
            params: {
              filePath: `${workspaceRoot}/new-file.tsx`,
              content: '// New file created by Agent Mode'
            }
          },
          requiresApproval: true,
          maxRetries: 3
        }
      ];
    } else if (userRequest.toLowerCase().includes('fix') || userRequest.toLowerCase().includes('bug')) {
      steps = [
        {
          order: 1,
          title: 'Identify the issue',
          description: 'Search codebase for potential issues',
          action: {
            type: 'search_codebase',
            params: {
              searchQuery: 'TODO FIXME BUG ERROR',
              workspaceRoot,
              pattern: 'TODO|FIXME|BUG|ERROR'
            }
          },
          requiresApproval: false,
          maxRetries: 3
        },
        {
          order: 2,
          title: 'Apply fix',
          description: 'Modify the identified files to fix the issue',
          action: {
            type: 'edit_file',
            params: {
              filePath: `${workspaceRoot}/src/buggy-file.tsx`,
              oldText: '// Old code',
              newText: '// Fixed code'
            }
          },
          requiresApproval: true,
          maxRetries: 3
        }
      ];
    } else {
      // Generic task
      steps = [
        {
          order: 1,
          title: 'Execute task',
          description: userRequest,
          action: {
            type: 'custom',
            params: {
              userRequest
            }
          },
          requiresApproval: true,
          maxRetries: 3
        }
      ];
    }

    const taskPlan = {
      title: userRequest,
      description: `Demo mode: Task plan for "${userRequest}"`,
      reasoning: 'This is a demo task plan. In production mode with a real AI API key, the agent would generate context-aware steps based on your actual codebase.',
      steps,
      warnings: [
        'Demo mode active - using simulated task planning',
        'Configure an AI API key in Settings for real autonomous capabilities'
      ]
    };

    return {
      content: JSON.stringify(taskPlan, null, 2),
      metadata: {
        model: 'demo',
        tokens: 100,
        processing_time: 150,
      },
    };
  }
}
