/**
 * SystemPromptBuilder - 2026 Best Practices Implementation
 *
 * Follows Anthropic's recommended 4-5 layer system prompt architecture:
 * 1. ROLE - Define the AI persona
 * 2. CONTEXT - Dynamic project/file context
 * 3. INSTRUCTIONS - Clear rules with structured tags
 * 4. EXAMPLES - Multishot examples for key behaviors (optional)
 * 5. OUTPUT - Expected response format
 *
 * @see https://www.anthropic.com/engineering/claude-code-best-practices
 * @see https://claude.com/blog/best-practices-for-prompt-engineering
 */

import type { WorkspaceContext, UserActivity, AIContextRequest } from '../../types';

export interface SystemPromptConfig {
  role: RoleConfig;
  context?: ContextConfig;
  instructions?: InstructionsConfig;
  examples?: ExampleConfig[];
  outputFormat?: OutputFormatConfig;
}

export interface RoleConfig {
  persona: string;
  expertise: string[];
  tone?: 'concise' | 'balanced' | 'detailed';
}

export interface ContextConfig {
  workspace?: WorkspaceContext;
  currentFile?: {
    name: string;
    language: string;
    content: string;
  };
  userActivity?: UserActivity;
  customRules?: string;
}

export interface InstructionsConfig {
  rules: string[];
  constraints?: string[];
  priorities?: string[];
}

export interface ExampleConfig {
  input: string;
  output: string;
  explanation?: string;
}

export interface OutputFormatConfig {
  format: 'markdown' | 'json' | 'code' | 'plain';
  structure?: string;
  includeReasoning?: boolean;
}

/**
 * SystemPromptBuilder - Creates structured prompts following 2026 best practices
 */
export class SystemPromptBuilder {

  /**
   * Build a complete system prompt from configuration
   */
  static build(config: SystemPromptConfig): string {
    const sections: string[] = [];

    // Layer 1: ROLE
    sections.push(this.buildRoleSection(config.role));

    // Layer 2: CONTEXT (if provided)
    if (config.context) {
      sections.push(this.buildContextSection(config.context));
    }

    // Layer 3: INSTRUCTIONS
    if (config.instructions) {
      sections.push(this.buildInstructionsSection(config.instructions));
    }

    // Layer 4: EXAMPLES (if provided)
    if (config.examples && config.examples.length > 0) {
      sections.push(this.buildExamplesSection(config.examples));
    }

    // Layer 5: OUTPUT FORMAT (if provided)
    if (config.outputFormat) {
      sections.push(this.buildOutputSection(config.outputFormat));
    }

    return sections.join('\n\n');
  }

  /**
   * Layer 1: ROLE - Define the AI persona
   */
  private static buildRoleSection(role: RoleConfig): string {
    const toneInstruction = role.tone === 'concise'
      ? 'Be brief and to the point.'
      : role.tone === 'detailed'
      ? 'Provide thorough explanations when helpful.'
      : 'Balance brevity with clarity.';

    return `<role>
${role.persona}

Expertise: ${role.expertise.join(', ')}

${toneInstruction}
</role>`;
  }

  /**
   * Layer 2: CONTEXT - Dynamic project/file context
   */
  private static buildContextSection(context: ContextConfig): string {
    const parts: string[] = ['<context>'];

    // Workspace context
    if (context.workspace) {
      parts.push(`Project: ${context.workspace.rootPath}`);
      parts.push(`Languages: ${context.workspace.languages.join(', ')}`);
      parts.push(`Files: ${context.workspace.totalFiles} total`);
      if (context.workspace.summary) {
        parts.push(`Summary: ${context.workspace.summary}`);
      }
    }

    // Current file context
    if (context.currentFile) {
      parts.push('');
      parts.push(`Current File: ${context.currentFile.name}`);
      parts.push(`Language: ${context.currentFile.language}`);

      // Include truncated content for context
      const maxContentLength = 2000;
      const content = context.currentFile.content.length > maxContentLength
        ? context.currentFile.content.substring(0, maxContentLength) + '...(truncated)'
        : context.currentFile.content;
      parts.push(`\`\`\`${context.currentFile.language}\n${content}\n\`\`\``);
    }

    // User activity context
    if (context.userActivity) {
      parts.push('');
      // Include workspace folder - critical for AI to know project context
      if (context.userActivity.workspaceFolder) {
        parts.push(`Workspace Folder: ${context.userActivity.workspaceFolder}`);
      }
      if (context.userActivity.openFiles && context.userActivity.openFiles.length > 0) {
        parts.push(`Open Files: ${context.userActivity.openFiles.map(f => f.name).join(', ')}`);
      }
      if (context.userActivity.recentFiles && context.userActivity.recentFiles.length > 0) {
        parts.push(`Recent Files: ${context.userActivity.recentFiles.join(', ')}`);
      }
      if (context.userActivity.currentSelection) {
        parts.push(`Selection: Lines ${context.userActivity.currentSelection.startLine}-${context.userActivity.currentSelection.endLine}`);
      }
    }

    // Custom rules (highest priority)
    if (context.customRules) {
      parts.push('');
      parts.push('Project-Specific Rules (HIGHEST PRIORITY):');
      parts.push(context.customRules);
    }

    parts.push('</context>');
    return parts.join('\n');
  }

  /**
   * Layer 3: INSTRUCTIONS - Clear rules with structured tags
   */
  private static buildInstructionsSection(instructions: InstructionsConfig): string {
    const parts: string[] = ['<instructions>'];

    // Main rules
    if (instructions.rules.length > 0) {
      parts.push('Rules:');
      instructions.rules.forEach((rule, i) => {
        parts.push(`${i + 1}. ${rule}`);
      });
    }

    // Constraints
    if (instructions.constraints && instructions.constraints.length > 0) {
      parts.push('');
      parts.push('Constraints:');
      instructions.constraints.forEach(c => parts.push(`- ${c}`));
    }

    // Priorities
    if (instructions.priorities && instructions.priorities.length > 0) {
      parts.push('');
      parts.push('Priorities (in order):');
      instructions.priorities.forEach((p, i) => parts.push(`${i + 1}. ${p}`));
    }

    parts.push('</instructions>');
    return parts.join('\n');
  }

  /**
   * Layer 4: EXAMPLES - Multishot examples for key behaviors
   */
  private static buildExamplesSection(examples: ExampleConfig[]): string {
    const parts: string[] = ['<examples>'];

    examples.slice(0, 3).forEach((example, i) => {
      parts.push(`Example ${i + 1}:`);
      parts.push(`Input: ${example.input}`);
      parts.push(`Output: ${example.output}`);
      if (example.explanation) {
        parts.push(`Why: ${example.explanation}`);
      }
      parts.push('');
    });

    parts.push('</examples>');
    return parts.join('\n');
  }

  /**
   * Layer 5: OUTPUT FORMAT - Expected response structure
   */
  private static buildOutputSection(output: OutputFormatConfig): string {
    const parts: string[] = ['<output_format>'];

    parts.push(`Format: ${output.format}`);

    if (output.structure) {
      parts.push(`Structure: ${output.structure}`);
    }

    if (output.includeReasoning) {
      parts.push('Include brief reasoning before the final answer.');
    }

    parts.push('</output_format>');
    return parts.join('\n');
  }

  // ============================================
  // PRE-BUILT PROMPTS FOR COMMON USE CASES
  // ============================================

  /**
   * Code Completion prompt - optimized for inline suggestions
   */
  static buildCodeCompletionPrompt(context?: ContextConfig): string {
    return this.build({
      role: {
        persona: 'You are a high-performance code completion engine for Vibe Code Studio.',
        expertise: ['code completion', 'syntax understanding', 'context-aware suggestions'],
        tone: 'concise'
      },
      context,
      instructions: {
        rules: [
          'Complete the code at the cursor position',
          'Return ONLY the code to insert - no markdown, no explanation',
          'Match the existing code style (indentation, naming conventions)',
          'Prefer shorter completions that are most likely correct'
        ],
        constraints: [
          'Maximum 50 tokens',
          'No markdown code blocks',
          'No comments unless continuing an existing comment'
        ]
      },
      outputFormat: {
        format: 'code',
        structure: 'Raw code only, ready to insert'
      }
    });
  }

  /**
   * Chat Assistant prompt - for conversational AI interactions
   */
  static buildChatAssistantPrompt(context?: ContextConfig): string {
    return this.build({
      role: {
        persona: 'You are an expert programming assistant in Vibe Code Studio, helping developers write, understand, and improve code.',
        expertise: [
          'code generation',
          'debugging',
          'code review',
          'refactoring',
          'architecture design',
          'best practices'
        ],
        tone: 'balanced'
      },
      context,
      instructions: {
        rules: [
          'Analyze code before making suggestions',
          'Provide working, production-ready code',
          'Explain complex concepts clearly',
          'Follow project conventions when visible in context'
        ],
        priorities: [
          'Correctness - code must work',
          'Clarity - code should be readable',
          'Performance - optimize when relevant',
          'Security - follow secure coding practices'
        ]
      },
      outputFormat: {
        format: 'markdown',
        structure: 'Use code blocks with language tags',
        includeReasoning: true
      }
    });
  }

  /**
   * Code Refactoring prompt
   */
  static buildRefactoringPrompt(context?: ContextConfig): string {
    return this.build({
      role: {
        persona: 'You are a code refactoring specialist focused on improving code quality without changing behavior.',
        expertise: ['refactoring patterns', 'clean code', 'SOLID principles', 'performance optimization'],
        tone: 'detailed'
      },
      context,
      instructions: {
        rules: [
          'Preserve existing functionality exactly',
          'Improve readability and maintainability',
          'Apply relevant design patterns',
          'Reduce complexity and duplication'
        ],
        constraints: [
          'Do not change public APIs without explicit request',
          'Keep changes minimal and focused',
          'Maintain backward compatibility'
        ]
      },
      examples: [
        {
          input: 'Refactor this function to be more readable',
          output: 'Here\'s the refactored version with extracted helper functions and clearer variable names...',
          explanation: 'Breaking down complex functions improves testability and comprehension'
        }
      ],
      outputFormat: {
        format: 'markdown',
        structure: 'Show before/after with explanation of changes',
        includeReasoning: true
      }
    });
  }

  /**
   * Code Analysis prompt - for architecture and pattern detection
   */
  static buildAnalysisPrompt(analysisType: 'architecture' | 'patterns' | 'debt' | 'security', context?: ContextConfig): string {
    const analysisConfig: Record<string, { focus: string; aspects: string[] }> = {
      architecture: {
        focus: 'software architecture and system design',
        aspects: ['patterns', 'layers', 'coupling', 'cohesion', 'data flow']
      },
      patterns: {
        focus: 'design patterns and coding patterns',
        aspects: ['design patterns', 'anti-patterns', 'idioms', 'conventions']
      },
      debt: {
        focus: 'technical debt and code quality issues',
        aspects: ['complexity', 'duplication', 'outdated patterns', 'missing tests']
      },
      security: {
        focus: 'security vulnerabilities and best practices',
        aspects: ['input validation', 'authentication', 'authorization', 'data protection']
      }
    };

    const config = analysisConfig[analysisType]!;

    return this.build({
      role: {
        persona: `You are a code analysis expert specializing in ${config.focus}.`,
        expertise: config.aspects,
        tone: 'detailed'
      },
      context,
      instructions: {
        rules: [
          'Analyze the provided code thoroughly',
          'Identify specific issues with file/line references',
          'Prioritize findings by severity',
          'Provide actionable recommendations'
        ]
      },
      outputFormat: {
        format: 'markdown',
        structure: 'Use sections: Summary, Findings, Recommendations',
        includeReasoning: true
      }
    });
  }

  /**
   * Convert legacy AIContextRequest to new SystemPromptConfig
   */
  static fromLegacyRequest(request: AIContextRequest, model?: string): string {
    const context: ContextConfig = {
      workspace: request.workspaceContext,
      currentFile: request.currentFile,
      userActivity: request.userActivity
    };

    // Determine prompt type based on model
    if (model === 'deepseek-coder') {
      return this.buildChatAssistantPrompt(context);
    }

    return this.buildChatAssistantPrompt(context);
  }
}

export default SystemPromptBuilder;
