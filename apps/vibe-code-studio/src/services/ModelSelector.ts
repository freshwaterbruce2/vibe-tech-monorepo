/**
 * Model Selector Service
 *
 * Intelligent model selection based on task type (Cursor-style)
 * - Chat/Completion: Fast, cost-effective (deepseek/deepseek-v3.2)
 * - Agent/Reasoning: Best coding accuracy (openai/gpt-5.2-codex)
 */

export type TaskMode = 'chat' | 'completion' | 'agent' | 'reasoning' | 'code-review' | 'debug';

export class ModelSelector {
  /**
   * Select optimal model for the given task mode
   *
   * @param mode - The type of task being performed
   * @returns Optimal model ID for the task
   */
  selectForMode(mode: TaskMode): string {
    switch (mode) {
      case 'chat':
      case 'completion':
        // Fast, general-purpose interactions
        return 'deepseek/deepseek-v3.2';

      case 'agent':
      case 'reasoning':
      case 'code-review':
      case 'debug':
        // Complex multi-step tasks requiring chain-of-thought
        return 'openai/gpt-5.2-codex';

      default:
        return 'deepseek/deepseek-v3.2';
    }
  }

  /**
   * Get model capabilities description
   */
  getModelDescription(modelId: string): string {
    switch (modelId) {
      case 'deepseek/deepseek-v3.2':
        return 'Fast, low-cost general model with strong coding performance';
      case 'openai/gpt-5.2-codex':
        return 'Best-in-class coding model for complex reasoning and reviews';
      default:
        return 'Unknown model';
    }
  }

  /**
   * Check if model is suitable for agentic tasks
   */
  isAgenticModel(modelId: string): boolean {
    return modelId === 'openai/gpt-5.2-codex';
  }

  /**
   * Get recommended model for a task description
   */
  recommendModel(taskDescription: string): string {
    const lowerDesc = taskDescription.toLowerCase();

    // Keywords indicating complex reasoning needed
    const reasoningKeywords = [
      'agent', 'multi-step', 'complex', 'debug', 'analyze',
      'refactor', 'review', 'plan', 'architecture', 'fix bug'
    ];

    const needsReasoning = reasoningKeywords.some(keyword =>
      lowerDesc.includes(keyword)
    );

    return needsReasoning ? 'openai/gpt-5.2-codex' : 'deepseek/deepseek-v3.2';
  }
}

// Singleton instance
export const modelSelector = new ModelSelector();
