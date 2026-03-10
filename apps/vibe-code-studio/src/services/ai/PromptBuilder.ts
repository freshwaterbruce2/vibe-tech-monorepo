import type { AIContextRequest, WorkspaceContext, UserActivity } from '../../types';
import { FileSystemService } from '../FileSystemService';
import { type Rule, RulesParser } from '../RulesParser';

/**
 * Builds system prompts and context for AI interactions
 * NOW WITH CUSTOM INSTRUCTIONS SUPPORT (.deepcoderules / .cursorrules)
 * UPDATED: Implements 5-Branch Tree-of-Thought (ToT) Methodology for DeepSeek models
 */
export class PromptBuilder {
  private static rulesParser = new RulesParser();
  private static fileSystem = new FileSystemService();
  private static rulesCache: Map<string, Rule[]> = new Map();
  private static cacheExpiry: Map<string, number> = new Map();
  private static readonly CACHE_TTL = 60000; // 1 minute cache

  /**
   * Generates the 5-Branch Tree-of-Thought System Prompt
   * This forces the model to explore multiple reasoning paths before converging.
   */
  private static getTreeOfThoughtPrompt(role: string): string {
    return `${role}` +
`

You MUST use the **5-Branch Tree-of-Thought (ToT)** methodology for every complex request.
Do not skip steps. Your reasoning should be visible and structured.

### 🌳 The 5-Branch Methodology

1.  **Branch 1: Context Analysis** 🔍
    *   Deconstruct the user's request into core components.
    *   Analyze the provided file context, workspace structure, and active open files.
    *   Identify constraints, dependencies, and potential ambiguities.

2.  **Branch 2: Architectural Exploration** 🏗️
    *   Propose at least 2 distinct approaches (e.g., "Modifying existing component" vs "Creating new service").
    *   Consider relevant design patterns (Singleton, Factory, Observer, etc.).
    *   Evaluate library availability (check 'package.json' context).

3.  **Branch 3: Critique & Refinement** ⚖️
    *   Evaluate the pros/cons of each approach from Branch 2.
    *   Check for performance bottlenecks (complexity, rendering).
    *   **Security Audit**: explicitly check for input validation, XSS, and secure IPC.

4.  **Branch 4: Synthesis & Strategy** 🛠️
    *   Select the optimal path based on Branch 3.
    *   Formulate a step-by-step implementation plan.
    *   Define test cases or verification steps.

5.  **Branch 5: Final Output Generation** 🚀
    *   Generate the final code or response.
    *   Ensure strict adherence to project coding standards (linting, types).
    *   Add concise comments explaining *why*, not just *what*.

---
`;
  }

  static buildBaseSystemPrompt(model?: string): string {
    // Optimize prompt based on model
    if (model === 'deepseek/deepseek-v3.2') {
      return this.getTreeOfThoughtPrompt(
        `You are DeepSeek Coder, an elite programming AI in DeepCode Editor. You specialize in generating high-performance, secure, and idiomatic code.`
      ) + `
Your specialized capabilities:
- Advanced code generation with best practices
- Deep understanding of design patterns and architectures
- Performance optimization and algorithms
- Complex refactoring and modernization
- Multi-file code generation and project structure
- Advanced debugging and root cause analysis

Coding guidelines:
- Write production-ready, clean code
- Follow language-specific conventions and idioms
- Include proper error handling and edge cases
- Add helpful inline comments for complex logic
- Optimize for both readability and performance
- Consider security best practices`;
    } else if (model === 'openai/gpt-5.2-codex') {
      // High-end coding models benefit from explicit structured reasoning
      return this.getTreeOfThoughtPrompt(
        `You are GPT-5.2 Codex in DeepCode Editor. You provide deep, multi-step reasoning for complex programming problems.`
      ) + `
Your approach:
- Break down complex problems step-by-step
- Show your reasoning process clearly using the 5 branches
- Consider multiple solutions and trade-offs
- Explain the "why" behind recommendations
- Validate assumptions and edge cases
- Provide comprehensive analysis

When solving problems:
- First understand the requirements fully
- Consider different approaches
- Analyze pros and cons
- Recommend the best solution with justification`;
    }

    // Default prompt for general models
    return this.getTreeOfThoughtPrompt(
      `You are an expert programming assistant built into DeepCode Editor. You help developers write, understand, and improve code using advanced reasoning.`
    ) + `
Your capabilities:
- Code completion and generation
- Code explanation and documentation
- Debugging and error fixing
- Code refactoring and optimization
- Best practices and code review

Guidelines:
- Be concise but thorough
- Provide working, production-ready code
- Explain complex concepts clearly
- Suggest improvements when relevant
- Use markdown formatting for code blocks
- Focus on the specific programming language being used`;
  }

  static async buildContextualSystemPrompt(request: AIContextRequest, model?: string): Promise<string> {
    let prompt = this.buildBaseSystemPrompt(model);

    // INJECT CUSTOM RULES FIRST (highest priority)
    if (request.workspaceContext?.rootPath && request.currentFile?.name) {
      const customRules = await this.loadCustomRules(
        request.workspaceContext.rootPath,
        request.currentFile.name
      );

      if (customRules.length > 0) {
        prompt += this.buildCustomRulesSection(customRules);
      }
    }

    // Add workspace context
    if (request.workspaceContext) {
      prompt += this.buildWorkspaceSection(request.workspaceContext);
    }

    // Add user activity context (NEW!)
    if (request.userActivity) {
      prompt += this.buildUserActivitySection(request.userActivity);
    }

    // Add current file context
    if (request.currentFile) {
      prompt += `

Current File Context:
- File: ${request.currentFile.name}
- Language: ${request.currentFile.language}
- Content: ${request.currentFile.content.substring(0, 1000)}${request.currentFile.content.length > 1000 ? '...' : ''}`;
    }

    // Add related files context
    if (request.relatedFiles && request.relatedFiles.length > 0) {
      prompt += `

Related Files:
${request.relatedFiles
  .slice(0, 3)
  .map(
    (file) =>
      `- ${file.path} (relevance: ${file.relevance}): ${file.content.substring(0, 200)}${file.content.length > 200 ? '...' : ''}`
  )
  .join('\n')}`;
    }

    return prompt;
  }

  static buildWorkspaceSection(context: WorkspaceContext): string {
    return `

Project Context:
- Root: ${context.rootPath}
- Files: ${context.totalFiles} total
- Languages: ${context.languages.join(', ')}
- Test Coverage: ${context.testFiles} test files
${context.summary ? `- Summary: ${context.summary}` : ''}
${Object.keys(context.dependencies).length > 0 ? `- Dependencies: ${Object.keys(context.dependencies).slice(0, 5).join(', ')}` : ''}`;
  }

  static buildUserActivitySection(activity: UserActivity): string {
    return `

User Activity Context:
- Workspace Folder: ${activity.workspaceFolder ?? 'None'}
- Open Files (${activity.openFiles.length} tabs):
${activity.openFiles.map(f => `  • ${f.name}${f.isModified ? ' (modified)' : ''}`).join('\n')}
- Sidebar: ${activity.sidebarOpen ? 'Visible' : 'Hidden'} (file explorer)
- Preview Panel: ${activity.previewOpen ? 'Open' : 'Closed'}
- AI Chat: ${activity.aiChatOpen ? 'Active' : 'Inactive'}
${activity.currentSelection ? `- Current Selection: Lines ${activity.currentSelection.startLine}-${activity.currentSelection.endLine}` : ''}
${activity.recentFiles.length > 0 ? `- Recently Accessed: ${activity.recentFiles.slice(0, 3).join(', ')}` : ''}`;
  }

  static buildCodeCompletionPrompt(
    code: string,
    language: string,
    position: { line: number; column: number }
  ): string {
    return 'Complete the following ' + language + ' code. Only return the completion, no explanations:\n\n' +
    '````' + language + '\n' +
    code + '\n' +
    '````\n\n' +
    'Complete from line ' + position.line + ', column ' + position.column + '.';
  }

  static buildCodeExplanationPrompt(code: string, language: string): string {
    return 'Explain this ' + language + ' code in detail:\n\n' +
    '````' + language + '\n' +
    code + '\n' +
    '````\n\n' +
    'Please provide:\n' +
    '1. What the code does\n' +
    '2. How it works\n' +
    '3. Any potential issues or improvements';
  }

  static buildRefactorPrompt(code: string, language: string): string {
    return 'Refactor this ' + language + ' code to improve readability, performance, and maintainability:\n\n' +
    '````' + language + '\n' +
    code + '\n' +
    '````\n\n' +
    'Provide the refactored code with explanations of the changes made.';
  }

  /**
   * Load custom rules from .deepcoderules or .cursorrules
   * with caching to improve performance
   */
  private static async loadCustomRules(workspaceRoot: string, currentFile: string): Promise<Rule[]> {
    const cacheKey = `${workspaceRoot}:${currentFile}`;

    // Check cache
    const cached = this.rulesCache.get(cacheKey);
    const expiry = this.cacheExpiry.get(cacheKey);

    if (cached && expiry && Date.now() < expiry) {
      return cached;
    }

    try {
      // Try loading .deepcoderules first (modern format)
      const deepcodeRulesPath = `${workspaceRoot}/.deepcoderules`;

      this.rulesParser.setFileReader(async (path) => {
        return await this.fileSystem.readFile(path);
      });

      let parsedRules;
      try {
        parsedRules = await this.rulesParser.loadFromFile(deepcodeRulesPath);
      } catch {
        // If .deepcoderules doesn't exist, try .cursorrules (legacy)
        const cursorrulesPath = `${workspaceRoot}/.cursorrules`;
        parsedRules = await this.rulesParser.loadFromFile(cursorrulesPath);
      }

      // Filter rules that match the current file
      const matchingRules = this.rulesParser.mergeRulesForFile(
        parsedRules.rules,
        currentFile
      );

      // Cache the results
      this.rulesCache.set(cacheKey, matchingRules);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_TTL);

      return matchingRules;
    } catch (_error) {
      // No custom rules file found - that's OK
      return [];
    }
  }

  /**
   * Build custom rules section for prompt injection
   */
  private static buildCustomRulesSection(rules: Rule[]): string {
    if (rules.length === 0) {return '';}

    const rulesContent = rules.map((rule, index) => {
      const header = rule.description ? `### ${rule.description}` : `### Custom Rule ${index + 1}`;
      return `${header}\n${rule.content}`;
    }).join('\n\n');

    return `

PROJECT-SPECIFIC CUSTOM INSTRUCTIONS:
${rulesContent}

IMPORTANT: The above custom instructions have the HIGHEST PRIORITY. Follow them strictly for this project.
`;
  }

  /**
   * Clear rules cache (useful when rules file changes)
   */
  static clearRulesCache(): void {
    this.rulesCache.clear();
    this.cacheExpiry.clear();
  }
}
