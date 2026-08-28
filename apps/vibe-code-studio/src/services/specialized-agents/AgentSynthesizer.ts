import type { AgentResponse, BaseSpecializedAgent } from './BaseSpecializedAgent';

export class AgentSynthesizer {
  constructor(private agents: Map<string, BaseSpecializedAgent>) {}

  /**
   * Synthesize multiple agent responses into coherent output
   */
  synthesizeResponse(
    _request: string,
    agentResponses: Record<string, AgentResponse>,
    coordination: { strategy: string; reasoning: string; confidence: number; parallelism?: number }
  ): { content: string; recommendations: string[] } {
    const agentKeys = Object.keys(agentResponses);
    
    if (agentKeys.length === 1) {
      const firstKey = agentKeys[0]!; // Length check guarantees existence
      const response = agentResponses[firstKey]!;
      return {
        content: response.content,
        recommendations: response.suggestions ?? []
      };
    }

    // Multi-agent synthesis
    let content = `## Multi-Agent Analysis\n\n`;
    const allRecommendations: string[] = [];

    // Add individual agent perspectives
    agentKeys.forEach(agentKey => {
      const response = agentResponses[agentKey];
      const agent = this.agents.get(agentKey);
      
      if (agent && response) {
        const agentName = agent.getName();
        const role = agent.getRole();
        
        content += `### ${agentName} Perspective\n`;
        content += `*${role}*\n\n`;
        content += `${response.content}\n\n`;
        
        if (response.suggestions && response.suggestions.length > 0) {
          content += `**Key Recommendations:**\n`;
          response.suggestions.forEach(suggestion => {
            content += `- ${suggestion}\n`;
            allRecommendations.push(`[${agentName}] ${suggestion}`);
          });
          content += `\n`;
        }
      }
    });

    // Add coordination summary
    content += `### Coordination Summary\n\n`;
    content += `**Strategy Used:** ${coordination.strategy}\n`;
    content += `**Reasoning:** ${coordination.reasoning}\n`;
    content += `**Confidence:** ${Math.round(coordination.confidence * 100)}%\n\n`;

    // Synthesize key agreements and conflicts
    content += this.generateCoordinationSummary(agentResponses);

    return {
      content,
      recommendations: [...new Set(allRecommendations)] // Remove duplicates
    };
  }

  /**
   * Generate coordination summary analyzing agreements and conflicts
   */
  private generateCoordinationSummary(agentResponses: Record<string, AgentResponse>): string {
    const responses = Object.values(agentResponses);

    if (responses.length <= 1) {
      return '';
    }

    let summary = `#### Key Points of Agreement\n\n`;
    
    // Simple keyword analysis for common themes
    const allSuggestions = responses.flatMap(r => r.suggestions ?? []);
    const suggestionCounts = new Map<string, number>();
    
    allSuggestions.forEach(suggestion => {
      const key = suggestion.toLowerCase();
      suggestionCounts.set(key, (suggestionCounts.get(key) ?? 0) + 1);
    });
    
    const commonSuggestions = Array.from(suggestionCounts.entries())
      .filter(([_, count]) => count > 1)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 3);
    
    if (commonSuggestions.length > 0) {
      commonSuggestions.forEach(([suggestion, count]) => {
        summary += `- ${suggestion} (mentioned by ${count} agents)\n`;
      });
    } else {
      summary += `- All agents provided complementary perspectives\n`;
    }
    
    summary += `\n#### Areas Requiring Coordination\n\n`;
    
    // Identify potential conflicts based on confidence levels
    const lowConfidenceResponses = responses.filter(r => r.confidence < 0.7);
    if (lowConfidenceResponses.length > 0) {
      summary += `- ${lowConfidenceResponses.length} agents expressed lower confidence, requiring additional verification\n`;
    }
    
    // Check for conflicting approaches
    const hasCodeChanges = responses.some(r => r.codeChanges && r.codeChanges.length > 0);
    if (hasCodeChanges) {
      summary += `- Multiple agents proposed code changes - ensure compatibility\n`;
    }
    
    summary += `\n#### Recommended Next Steps\n\n`;
    summary += `1. Review all agent recommendations for conflicts\n`;
    summary += `2. Prioritize suggestions based on project constraints\n`;
    summary += `3. Implement changes incrementally with testing\n`;
    
    return summary;
  }
}
