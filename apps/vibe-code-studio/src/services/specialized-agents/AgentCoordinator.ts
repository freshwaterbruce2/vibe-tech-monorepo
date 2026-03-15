import { logger } from '../../utils/logger';
import type { AgentContext, AgentResponse, BaseSpecializedAgent } from './BaseSpecializedAgent';

export class AgentCoordinator {
  constructor(private agents: Map<string, BaseSpecializedAgent>) {}

  /**
   * Execute coordination strategy with optimized performance
   */
  async executeCoordination(
    agentKeys: string[],
    request: string,
    context: AgentContext,
    strategy: string
  ): Promise<Record<string, AgentResponse>> {
    switch (strategy) {
      case 'sequential':
        return this.executeSequential(agentKeys, request, context);
      
      case 'parallel':
        return this.executeParallel(agentKeys, request, context);
      
      case 'hierarchical':
        return this.executeHierarchical(agentKeys, request, context);
      
      case 'collaborative':
        return this.executeCollaborative(agentKeys, request, context);
      
      default:
        return this.executeParallel(agentKeys, request, context);
    }
  }

  /**
   * Sequential execution for dependent tasks
   */
  private async executeSequential(
    agentKeys: string[],
    request: string,
    context: AgentContext
  ): Promise<Record<string, AgentResponse>> {
    const responses: Record<string, AgentResponse> = {};
    const enhancedContext = { ...context };

    for (const agentKey of agentKeys) {
      const agent = this.agents.get(agentKey);
      if (agent) {
        try {
          const response = await agent.process(request, enhancedContext);
          responses[agentKey] = response;
          
          // Enhance context with previous agent's insights
          if (response.suggestions) {
            enhancedContext.userPreferences = {
              ...enhancedContext.userPreferences,
              previousSuggestions: response.suggestions
            };
          }
        } catch (error) {
          logger.error(`Agent ${agentKey} failed in sequential execution:`, error);
        }
      }
    }

    return responses;
  }

  /**
   * Parallel execution for independent tasks
   */
  private async executeParallel(
    agentKeys: string[],
    request: string,
    context: AgentContext
  ): Promise<Record<string, AgentResponse>> {
    const promises = agentKeys.map(async (agentKey) => {
      const agent = this.agents.get(agentKey);
      if (!agent) { return null; }

      try {
        const response = await agent.process(request, context);
        return { agentKey, response };
      } catch (error) {
        logger.error(`Agent ${agentKey} failed in parallel execution:`, error);
        return null;
      }
    });

    const results = await Promise.allSettled(promises);
    const responses: Record<string, AgentResponse> = {};

    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        const { agentKey, response } = result.value;
        responses[agentKey] = response;
      }
    });

    return responses;
  }

  /**
   * Hierarchical execution with technical lead coordination
   */
  private async executeHierarchical(
    agentKeys: string[],
    request: string,
    context: AgentContext
  ): Promise<Record<string, AgentResponse>> {
    const responses: Record<string, AgentResponse> = {};
    
    // Technical lead provides initial analysis
    const techLeadKey = 'technical_lead';
    const techLead = this.agents.get(techLeadKey);
    
    if (techLead && agentKeys.includes(techLeadKey)) {
      try {
        const techLeadResponse = await techLead.process(request, context);
        responses[techLeadKey] = techLeadResponse;
        
        // Enhance context with technical lead's guidance
        const enhancedContext = {
          ...context,
          userPreferences: {
            ...context.userPreferences,
            technicalGuidance: techLeadResponse.suggestions ?? [],
            architecturalContext: techLeadResponse.content
          }
        };

        // Execute other agents in parallel with enhanced context
        const remainingAgents = agentKeys.filter(key => key !== techLeadKey);
        const remainingResponses = await this.executeParallel(remainingAgents, request, enhancedContext);
        
        Object.assign(responses, remainingResponses);
      } catch (error) {
        logger.error('Technical lead failed in hierarchical execution:', error);
        // Fallback to parallel execution
        return this.executeParallel(agentKeys, request, context);
      }
    } else {
        return this.executeParallel(agentKeys, request, context);
    }

    return responses;
  }

  /**
   * Collaborative execution with cross-agent communication
   */
  private async executeCollaborative(
    agentKeys: string[],
    request: string,
    context: AgentContext
  ): Promise<Record<string, AgentResponse>> {
    const responses: Record<string, AgentResponse> = {};
    
    // First round: parallel initial responses
    const initialResponses = await this.executeParallel(agentKeys, request, context);
    
    // Second round: agents review each other's responses
    const collaborativeContext = {
      ...context,
      userPreferences: {
        ...context.userPreferences,
        peerResponses: Object.entries(initialResponses).map(([agent, response]) => ({
          agent,
          insights: response.content.substring(0, 500),
          suggestions: response.suggestions ?? []
        }))
      }
    };

    // Refined responses based on collaboration
    const refinedPromises = agentKeys.map(async (agentKey) => {
      const agent = this.agents.get(agentKey);
      if (!agent) { return null; }

      try {
        const refinedRequest = `${request}\n\nPlease refine your response considering peer insights and ensure coordination with other specialists.`;
        const response = await agent.process(refinedRequest, collaborativeContext);
        return { agentKey, response };
      } catch (error) {
        logger.error(`Agent ${agentKey} failed in collaborative refinement:`, error);
        // Fallback to initial response
        return { agentKey, response: initialResponses[agentKey] };
      }
    });

    const results = await Promise.allSettled(refinedPromises);

    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value?.response) {
        const { agentKey, response } = result.value;
        responses[agentKey] = response;
      }
    });

    return responses;
  }
}
