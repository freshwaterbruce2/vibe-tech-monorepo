/**
 * Performance Agent - Specialized in performance analysis and optimization.
 *
 * All analysis is produced by routing the agent's prompt through the real
 * UnifiedAIService (via the inherited process() pipeline). There is no canned
 * or fabricated metric data: when the AI request fails the base class returns
 * an honest empty result (confidence 0) rather than placeholder analysis.
 */
import type { AgentContext, AgentResponse } from './BaseSpecializedAgent';
import { AgentCapability, BaseSpecializedAgent } from './BaseSpecializedAgent';

const PERFORMANCE_ANALYSIS_REQUEST =
  'Analyze the performance of the current code and context. Identify concrete bottlenecks, ' +
  'their severity, and specific, actionable optimizations grounded in the provided context ' +
  'rather than generic advice.';

const CODE_OPTIMIZATION_REQUEST =
  'Identify concrete performance optimizations for the current code. For each, describe the ' +
  'change, its expected impact and effort, and how to implement it, grounded in the provided ' +
  'context.';

export class PerformanceAgent extends BaseSpecializedAgent {
  constructor() {
    super('PerformanceAgent', [
      AgentCapability.PERFORMANCE_PROFILING,
      AgentCapability.OPTIMIZATION,
      AgentCapability.MONITORING,
      AgentCapability.LOAD_TESTING,
      AgentCapability.CACHING,
      AgentCapability.CODE_ANALYSIS,
    ]);
  }

  getRole(): string {
    return 'Performance Engineer';
  }

  getSpecialization(): string {
    return 'Performance analysis, optimization, and monitoring';
  }

  protected generatePrompt(request: string, context: AgentContext): string {
    return `As a Performance Engineer, analyze the following request:

${request}

Context:
- Current file: ${context.currentFile ?? 'N/A'}
- Project type: ${context.projectType ?? 'Unknown'}
- Selected text: ${context.selectedText ?? 'None'}

Provide performance analysis and optimization recommendations.`;
  }

  protected analyzeResponse(response: string, _context: AgentContext): AgentResponse {
    return {
      content: response,
      confidence: 0.85,
      reasoning: 'Performance analysis based on code patterns and best practices',
    };
  }

  /** Real AI-driven performance analysis routed through UnifiedAIService. */
  async analyzePerformance(context: AgentContext): Promise<AgentResponse> {
    return this.process(PERFORMANCE_ANALYSIS_REQUEST, context);
  }

  /** Real AI-driven optimization pass routed through UnifiedAIService. */
  async optimizeCode(context: AgentContext): Promise<AgentResponse> {
    return this.process(CODE_OPTIMIZATION_REQUEST, context);
  }

  async processRequest(request: string, context: AgentContext): Promise<AgentResponse> {
    const requestLower = request.toLowerCase();

    if (requestLower.includes('optimize') || requestLower.includes('improve')) {
      return this.optimizeCode(context);
    }
    return this.analyzePerformance(context);
  }
}
