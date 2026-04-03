import type { AgentContext, BaseSpecializedAgent } from './BaseSpecializedAgent';

export class AgentAnalyzer {
  constructor(private agents: Map<string, BaseSpecializedAgent>) {}

  /**
   * Advanced request analysis and coordination planning
   */
  async analyzeAndCoordinate(
    request: string,
    context: AgentContext
  ): Promise<{
    agents: string[];
    strategy: 'sequential' | 'parallel' | 'hierarchical' | 'collaborative';
    reasoning: string;
    confidence: number;
    parallelism: number;
  }> {
    const requestLower = request.toLowerCase();
    const agents: string[] = [];
    let strategy: 'sequential' | 'parallel' | 'hierarchical' | 'collaborative' = 'parallel';
    let reasoning = '';
    let confidence = 0.8;
    let parallelism = 1;

    // Complex pattern matching for agent selection
    const patterns = {
      architecture: /\b(architecture|design|structure|pattern|scalability|system)\b/g,
      frontend: /\b(react|ui|component|interface|frontend|client|user|css|html|styling)\b/g,
      backend: /\b(api|server|backend|database|endpoint|service|microservice)\b/g,
      security: /\b(security|auth|authentication|vulnerability|secure|protection)\b/g,
      performance: /\b(performance|optimization|speed|memory|efficiency|profiling)\b/g,
      general: /\b(code|function|method|class|implementation|development)\b/g
    };

    // Score each agent type
    const scores = {
      technical_lead: (requestLower.match(patterns.architecture)?.length ?? 0) * 2,
      frontend_engineer: (requestLower.match(patterns.frontend)?.length ?? 0) * 2,
      backend_engineer: (requestLower.match(patterns.backend)?.length ?? 0) * 2,
      security_specialist: (requestLower.match(patterns.security)?.length ?? 0) * 3,
      performance_specialist: (requestLower.match(patterns.performance)?.length ?? 0) * 3,
      super_coder: (requestLower.match(patterns.general)?.length ?? 0) * 1
    };

    // Add context-based scoring
    if (context.currentFile) {
      if (context.currentFile.includes('.tsx') || context.currentFile.includes('.jsx')) {
        scores.frontend_engineer += 2;
      }
      if (context.currentFile.includes('api') || context.currentFile.includes('service')) {
        scores.backend_engineer += 2;
      }
      if (context.currentFile.includes('test')) {
        scores.super_coder += 1;
      }
    }

    // Select agents based on scores
    const sortedAgents = Object.entries(scores)
      .filter(([_, score]) => score > 0)
      .sort(([_, a], [__, b]) => b - a)
      .map(([agent, _]) => agent);

    if (sortedAgents.length === 0) {
      // Default to technical lead for unclear requests
      agents.push('technical_lead');
      reasoning = 'Request pattern unclear, defaulting to technical leadership';
      confidence = 0.6;
    } else if (sortedAgents.length === 1) {
      const selectedAgent = sortedAgents[0]!; // Length check guarantees existence
      agents.push(selectedAgent);
      reasoning = `Single specialized agent selected: ${selectedAgent}`;
      strategy = 'sequential';
    } else {
      // Multi-agent coordination
      agents.push(...sortedAgents.slice(0, 3)); // Limit to top 3 for efficiency
      
      // Determine coordination strategy
      if (agents.includes('technical_lead') && agents.length > 2) {
        strategy = 'hierarchical';
        reasoning = 'Hierarchical coordination with technical lead oversight';
        parallelism = Math.min(agents.length - 1, 2);
      } else if (agents.length <= 2) {
        strategy = 'collaborative';
        reasoning = 'Collaborative approach between complementary specialists';
        parallelism = agents.length;
      } else {
        strategy = 'parallel';
        reasoning = 'Parallel processing by multiple specialists';
        parallelism = Math.min(agents.length, 3);
      }
      
      confidence = Math.min(0.9, 0.7 + (Math.max(...Object.values(scores)) / 10));
    }

    // Always include technical lead for complex multi-agent tasks
    if (agents.length > 2 && !agents.includes('technical_lead')) {
      agents.unshift('technical_lead');
      strategy = 'hierarchical';
    }

    return {
      agents: agents.filter(agent => this.agents.has(agent)),
      strategy,
      reasoning,
      confidence,
      parallelism
    };
  }
}
