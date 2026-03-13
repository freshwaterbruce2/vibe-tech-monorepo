import type { AIContextRequest, AIResponse } from '../../../types';

export class TaskPlanDemoProvider {
  static getResponse(request: AIContextRequest): AIResponse {
    // Extract the user request from the planning prompt
    const userRequestMatch = request.userQuery.match(/USER REQUEST: (.+?)(?:\n|$)/);
    const userRequest = userRequestMatch?.[1] ?? 'Complete the task';

    // Extract workspace root
    const workspaceRootMatch = request.userQuery.match(/- Root: (.+?)(?:\n|$)/);
    const workspaceRoot = workspaceRootMatch?.[1] ?? '/';

    // Determine appropriate steps based on the request
    let steps = [];

    if (userRequest.toLowerCase().includes('review') || userRequest.toLowerCase().includes('analyze')) {
      steps = this.getReviewSteps(workspaceRoot);
    } else if (userRequest.toLowerCase().includes('create') || userRequest.toLowerCase().includes('new')) {
      steps = this.getCreateSteps(workspaceRoot);
    } else if (userRequest.toLowerCase().includes('fix') || userRequest.toLowerCase().includes('bug')) {
      steps = this.getFixSteps(workspaceRoot);
    } else {
      steps = this.getGenericSteps(userRequest);
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

  private static getReviewSteps(workspaceRoot: string) {
    return [
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
  }

  private static getCreateSteps(workspaceRoot: string) {
    return [
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
  }

  private static getFixSteps(workspaceRoot: string) {
    return [
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
  }

  private static getGenericSteps(userRequest: string) {
    return [
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
}
