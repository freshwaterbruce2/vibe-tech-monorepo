/**
 * Advanced Agent Orchestrator with intelligent coordination and optimization
 * Manages multiple specialized agents and coordinates their collaboration
 */
import { isCodeCorrectionRouteEnabled } from '../../config/aiRolloutFlags';
import { logger } from '../../utils/logger';
import { telemetry } from '../TelemetryService';

import { BackendEngineerAgent } from './BackendEngineerAgent';
import type { AgentCapability,AgentContext, AgentResponse, BaseSpecializedAgent } from './BaseSpecializedAgent';
import { CodeCorrectionAgent } from './CodeCorrectionAgent';
import { FrontendEngineerAgent } from './FrontendEngineerAgent';
import { PerformanceAgent } from './PerformanceAgent';
import { SecurityAgent } from './SecurityAgent';
import { SuperCodingAgent } from './SuperCodingAgent';
import { TechnicalLeadAgent } from './TechnicalLeadAgent';

export interface OrchestratorTask {
  id: string;
  title?: string;
  description: string;
  context?: AgentContext;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  deadline?: Date;
  requiredCapabilities?: AgentCapability[];
  status?: 'pending' | 'in_progress' | 'completed' | 'failed';
  assignedAgents?: string[];
  progress?: number;
  results?: Record<string, AgentResponse>;
}

export interface CoordinatedTask extends OrchestratorTask {
  id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  requiredAgents: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentInfo {
  name: string;
  role: string;
  capabilities: string[];
  specialization: string;
  performance: {
    avgResponseTime: number;
    successRate: number;
    confidence: number;
  };
  workload: number;
}

export interface OrchestratorResponse {
  response: string;
  agentResponses: Record<string, AgentResponse>;
  recommendations?: string[];
  coordination?: {
    strategy: string;
    reasoning: string;
    confidence: number;
  };
  performance?: {
    totalTime: number;
    agentTimes: Record<string, number>;
    parallelism: number;
  };
}

type CoordinationStrategy = 'sequential' | 'parallel' | 'hierarchical' | 'collaborative';

interface CoordinationPlan {
  agents: string[];
  strategy: CoordinationStrategy;
  reasoning: string;
  confidence: number;
  parallelism: number;
}

interface AgentScores {
  technical_lead: number;
  frontend_engineer: number;
  backend_engineer: number;
  security_specialist: number;
  performance_specialist: number;
  code_corrector: number;
  super_coder: number;
}

/**
 * Intelligent Agent Orchestrator with advanced coordination capabilities
 */
export class AgentOrchestrator {
  private agents: Map<string, BaseSpecializedAgent> = new Map();
  private activeTasks: Map<string, CoordinatedTask> = new Map();
  private performanceHistory: Array<{
    timestamp: Date;
    taskType: string;
    agents: string[];
    duration: number;
    success: boolean;
  }> = [];

  constructor() {
    this.initializeAgents();
  }

  /**
   * Initialize all specialized agents with error handling
   */
  private initializeAgents(): void {
    const agentConfigs = [
      { key: 'technical_lead', AgentClass: TechnicalLeadAgent },
      { key: 'frontend_engineer', AgentClass: FrontendEngineerAgent },
      { key: 'backend_engineer', AgentClass: BackendEngineerAgent },
      { key: 'performance_specialist', AgentClass: PerformanceAgent },
      { key: 'security_specialist', AgentClass: SecurityAgent },
      { key: 'code_corrector', AgentClass: CodeCorrectionAgent },
      { key: 'super_coder', AgentClass: SuperCodingAgent }
    ];

    agentConfigs.forEach(({ key, AgentClass }) => {
      try {
        const agent = new AgentClass();
        this.agents.set(key, agent);
        logger.info(`Initialized agent: ${key}`);
      } catch (error) {
        logger.error(`Failed to initialize agent ${key}:`, error);
      }
    });

    logger.info(`Orchestrator initialized with ${this.agents.size} agents`);
  }

  /**
   * Main request processing with intelligent agent selection and coordination
   */
  async processRequest(
    request: string,
    context: AgentContext = {}
  ): Promise<OrchestratorResponse> {
    const startTime = Date.now();
    const taskId = this.generateTaskId();
    const task = this.createTrackedTask(taskId, request, context);
    this.activeTasks.set(taskId, task);

    try {
      const coordination = await this.analyzeAndCoordinate(request, context);
      const selectedAgents = coordination.agents;
      task.requiredAgents = selectedAgents;
      task.assignedAgents = selectedAgents;
      logger.info(`Processing request with agents: ${selectedAgents.join(', ')}`);
      const agentResponses = await this.executeCoordination(
        selectedAgents,
        request,
        context,
        coordination.strategy
      );
      const response = this.synthesizeResponse(request, agentResponses, coordination);
      this.markTaskCompleted(task, agentResponses);
      const totalTime = Date.now() - startTime;
      this.recordPerformance(request, selectedAgents, totalTime, true);
      this.activeTasks.delete(taskId);
      return this.buildOrchestratorResponse(response, agentResponses, coordination, totalTime);

    } catch (error) {
      logger.error('Request processing failed:', error);
      this.markTaskFailed(taskId);
      this.recordPerformance(request, [], Date.now() - startTime, false);
      throw error;
    }
  }

  private createTrackedTask(
    taskId: string,
    request: string,
    context: AgentContext,
  ): CoordinatedTask {
    return {
      id: taskId,
      description: request,
      context,
      status: 'in_progress',
      requiredAgents: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private markTaskCompleted(
    task: CoordinatedTask,
    agentResponses: Record<string, AgentResponse>,
  ): void {
    task.status = 'completed';
    task.results = agentResponses;
    task.updatedAt = new Date();
  }

  private markTaskFailed(taskId: string): void {
    const task = this.activeTasks.get(taskId);
    if (!task) {
      return;
    }
    task.status = 'failed';
    task.updatedAt = new Date();
  }

  private buildOrchestratorResponse(
    response: { content: string; recommendations: string[] },
    agentResponses: Record<string, AgentResponse>,
    coordination: CoordinationPlan,
    totalTime: number,
  ): OrchestratorResponse {
    return {
      response: response.content,
      agentResponses,
      recommendations: response.recommendations,
      coordination: {
        strategy: coordination.strategy,
        reasoning: coordination.reasoning,
        confidence: coordination.confidence,
      },
      performance: {
        totalTime,
        agentTimes: this.calculateAgentTimes(agentResponses),
        parallelism: coordination.parallelism,
      },
    };
  }

  /**
   * Advanced request analysis and coordination planning
   */
  private async analyzeAndCoordinate(
    request: string,
    context: AgentContext
  ): Promise<CoordinationPlan> {
    const correctionRouteEnabled = isCodeCorrectionRouteEnabled();
    const scores = this.buildAgentScores(request.toLowerCase());
    this.applyContextScoreAdjustments(scores, context);
    const eligibleSortedAgents = this.getEligibleSortedAgents(scores, correctionRouteEnabled);
    const correctionScore = scores.code_corrector;
    const isCorrectionRequest = correctionScore > 0;
    const correctionRouteSelected = isCorrectionRequest && correctionRouteEnabled;
    const plan = correctionRouteSelected
      ? this.buildCorrectionRoutePlan(eligibleSortedAgents, context, correctionScore)
      : this.buildStandardRoutePlan(
          eligibleSortedAgents,
          scores,
          isCorrectionRequest,
          correctionRouteEnabled,
        );
    this.ensureTechnicalLeadForComplexPlan(plan);
    const selectedAgents = plan.agents.filter((agent) => this.agents.has(agent));
    this.trackCoordinationTelemetry({
      request,
      context,
      selectedAgents,
      correctionRouteSelected,
      isCorrectionRequest,
      correctionRouteEnabled,
      correctionScore,
      strategy: plan.strategy,
      parallelism: plan.parallelism,
      confidence: plan.confidence,
    });
    return { ...plan, agents: selectedAgents };
  }

  private buildAgentScores(requestLower: string): AgentScores {
    const patterns = {
      architecture: /\b(architecture|design|structure|pattern|scalability|system)\b/g,
      frontend: /\b(react|ui|component|interface|frontend|client|user|css|html|styling)\b/g,
      backend: /\b(api|server|backend|database|endpoint|service|microservice)\b/g,
      security: /\b(security|auth|authentication|vulnerability|secure|protection)\b/g,
      performance: /\b(performance|optimization|speed|memory|efficiency|profiling)\b/g,
      correction: /\b(fix|bug|debug|error|issue|regression|failing|broken|crash|exception|patch|correct)\b/g,
      general: /\b(code|function|method|class|implementation|development)\b/g,
    };

    return {
      technical_lead: (requestLower.match(patterns.architecture)?.length ?? 0) * 2,
      frontend_engineer: (requestLower.match(patterns.frontend)?.length ?? 0) * 2,
      backend_engineer: (requestLower.match(patterns.backend)?.length ?? 0) * 2,
      security_specialist: (requestLower.match(patterns.security)?.length ?? 0) * 3,
      performance_specialist: (requestLower.match(patterns.performance)?.length ?? 0) * 3,
      code_corrector: (requestLower.match(patterns.correction)?.length ?? 0) * 4,
      super_coder: (requestLower.match(patterns.general)?.length ?? 0),
    };
  }

  private applyContextScoreAdjustments(scores: AgentScores, context: AgentContext): void {
    if (!context.currentFile) {
      return;
    }

    if (context.currentFile.includes('.tsx') || context.currentFile.includes('.jsx')) {
      scores.frontend_engineer += 2;
    }
    if (context.currentFile.includes('api') || context.currentFile.includes('service')) {
      scores.backend_engineer += 2;
    }
    if (context.currentFile.includes('test')) {
      scores.code_corrector += 2;
      scores.super_coder += 1;
    }
  }

  private getEligibleSortedAgents(
    scores: AgentScores,
    correctionRouteEnabled: boolean,
  ): string[] {
    const sortedAgents = Object.entries(scores)
      .filter(([_, score]) => score > 0)
      .sort(([_, a], [__, b]) => b - a)
      .map(([agent]) => agent);
    return sortedAgents.filter(
      (agentKey) => correctionRouteEnabled || agentKey !== 'code_corrector'
    );
  }

  private buildCorrectionRoutePlan(
    eligibleSortedAgents: string[],
    context: AgentContext,
    correctionScore: number,
  ): CoordinationPlan {
    const agents: string[] = [];
    this.addUniqueAgent(agents, 'code_corrector');
    const contextSpecialist = this.getContextSpecialist(context.currentFile);
    if (contextSpecialist && eligibleSortedAgents.includes(contextSpecialist)) {
      this.addUniqueAgent(agents, contextSpecialist);
    }

    eligibleSortedAgents
      .filter((agentKey) => !['code_corrector', 'super_coder'].includes(agentKey))
      .forEach((agentKey) => this.addUniqueAgent(agents, agentKey));

    const hasCrossCuttingRisk = agents.some((agentKey) =>
      ['security_specialist', 'performance_specialist'].includes(agentKey)
    );
    if (hasCrossCuttingRisk || agents.length > 2) {
      if (!agents.includes('technical_lead')) {
        agents.unshift('technical_lead');
      }
      return {
        agents,
        strategy: 'hierarchical',
        reasoning: 'Code-correction flow with technical lead oversight for cross-cutting risks',
        confidence: Math.min(0.92, 0.72 + (Math.min(correctionScore, 12) / 20)),
        parallelism: Math.min(Math.max(agents.length - 1, 1), 3),
      };
    }
    if (agents.length === 1) {
      return {
        agents,
        strategy: 'sequential',
        reasoning: 'Code-correction flow focused on root-cause analysis and minimal patching',
        confidence: Math.min(0.92, 0.72 + (Math.min(correctionScore, 12) / 20)),
        parallelism: 1,
      };
    }
    return {
      agents,
      strategy: 'collaborative',
      reasoning: 'Code-correction flow with specialist collaboration',
      confidence: Math.min(0.92, 0.72 + (Math.min(correctionScore, 12) / 20)),
      parallelism: Math.min(agents.length, 2),
    };
  }

  private buildStandardRoutePlan(
    eligibleSortedAgents: string[],
    scores: AgentScores,
    isCorrectionRequest: boolean,
    correctionRouteEnabled: boolean,
  ): CoordinationPlan {
    if (eligibleSortedAgents.length === 0) {
      return {
        agents: ['technical_lead'],
        strategy: 'parallel',
        reasoning: isCorrectionRequest && !correctionRouteEnabled
          ? 'Correction intent detected, but code-correction route is disabled by rollout flag'
          : 'Request pattern unclear, defaulting to technical leadership',
        confidence: 0.6,
        parallelism: 1,
      };
    }
    if (eligibleSortedAgents.length === 1) {
      const selectedAgent = eligibleSortedAgents[0]!;
      return {
        agents: [selectedAgent],
        strategy: 'sequential',
        reasoning: `Single specialized agent selected: ${selectedAgent}`,
        confidence: 0.8,
        parallelism: 1,
      };
    }
    return this.buildMultiAgentStandardRoutePlan(eligibleSortedAgents.slice(0, 3), scores);
  }

  private buildMultiAgentStandardRoutePlan(
    agents: string[],
    scores: AgentScores,
  ): CoordinationPlan {
    const confidence = Math.min(0.9, 0.7 + (Math.max(...Object.values(scores)) / 10));
    if (agents.includes('technical_lead') && agents.length > 2) {
      return {
        agents,
        strategy: 'hierarchical',
        reasoning: 'Hierarchical coordination with technical lead oversight',
        confidence,
        parallelism: Math.min(agents.length - 1, 2),
      };
    }
    if (agents.length <= 2) {
      return {
        agents,
        strategy: 'collaborative',
        reasoning: 'Collaborative approach between complementary specialists',
        confidence,
        parallelism: agents.length,
      };
    }
    return {
      agents,
      strategy: 'parallel',
      reasoning: 'Parallel processing by multiple specialists',
      confidence,
      parallelism: Math.min(agents.length, 3),
    };
  }

  private getContextSpecialist(
    currentFile?: string,
  ): 'frontend_engineer' | 'backend_engineer' | undefined {
    if (!currentFile) {
      return undefined;
    }
    if (currentFile.includes('.tsx') || currentFile.includes('.jsx')) {
      return 'frontend_engineer';
    }
    if (currentFile.includes('api') || currentFile.includes('service')) {
      return 'backend_engineer';
    }
    return undefined;
  }

  private ensureTechnicalLeadForComplexPlan(plan: CoordinationPlan): void {
    if (plan.agents.length > 2 && !plan.agents.includes('technical_lead')) {
      plan.agents.unshift('technical_lead');
      plan.strategy = 'hierarchical';
    }
  }

  private addUniqueAgent(agents: string[], agentKey: string): void {
    if (!agents.includes(agentKey)) {
      agents.push(agentKey);
    }
  }

  private trackCoordinationTelemetry(params: {
    request: string;
    context: AgentContext;
    selectedAgents: string[];
    correctionRouteSelected: boolean;
    isCorrectionRequest: boolean;
    correctionRouteEnabled: boolean;
    correctionScore: number;
    strategy: CoordinationStrategy;
    parallelism: number;
    confidence: number;
  }): void {
    const route = params.selectedAgents.includes('code_corrector')
      ? 'code_correction'
      : 'standard';
    if (params.correctionRouteSelected) {
      this.trackOrchestratorTelemetry('orchestrator_code_correction_route_selected', {
        request_mode: 'agent',
        route,
        strategy: params.strategy,
        selected_agent_count: params.selectedAgents.length,
        correction_score: params.correctionScore,
        correction_route_enabled: params.correctionRouteEnabled,
      });
    } else if (params.isCorrectionRequest && !params.correctionRouteEnabled) {
      this.trackOrchestratorTelemetry('orchestrator_code_correction_route_suppressed', {
        request_mode: 'agent',
        route,
        result_status: 'flag_disabled',
        correction_score: params.correctionScore,
        correction_route_enabled: params.correctionRouteEnabled,
      });
    }

    this.trackOrchestratorTelemetry('orchestrator_strategy_selected', {
      request_mode: 'agent',
      route,
      request_category: this.categorizeRequest(params.request),
      strategy: params.strategy,
      selected_agent_count: params.selectedAgents.length,
      parallelism: params.parallelism,
      confidence: Math.round(params.confidence * 100) / 100,
      correction_route_enabled: params.correctionRouteEnabled,
      current_file_type: this.extractFileType(params.context.currentFile),
    });
  }

  /**
   * Execute coordination strategy with optimized performance
   */
  private async executeCoordination(
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
      if (!agent) {return null;}

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

    if (!techLead || !agentKeys.includes(techLeadKey)) {
      logger.warn(
        'Hierarchical execution requested without technical lead; falling back to parallel execution'
      );
      return this.executeParallel(agentKeys, request, context);
    }

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
      const remainingResponses = await this.executeParallel(
        remainingAgents,
        request,
        enhancedContext
      );
      
      Object.assign(responses, remainingResponses);
    } catch (error) {
      logger.error('Technical lead failed in hierarchical execution:', error);
      // Fallback to parallel execution
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
          insights: (response.content ?? '').substring(0, 500),
          suggestions: response.suggestions ?? []
        }))
      }
    };

    // Refined responses based on collaboration
    const refinedPromises = agentKeys.map(async (agentKey) => {
      const agent = this.agents.get(agentKey);
      if (!agent) {return null;}

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

  /**
   * Synthesize multiple agent responses into coherent output
   */
  private synthesizeResponse(
    _request: string,
    agentResponses: Record<string, AgentResponse>,
    coordination: { strategy: string; reasoning: string; confidence: number; parallelism: number }
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

  /**
   * Task delegation for backward compatibility
   */
  async delegateTask(
    task: Pick<OrchestratorTask, 'id' | 'title' | 'description'>,
    context?: AgentContext
  ): Promise<AgentResponse> {
    const request = task.title ? `${task.title}: ${task.description}` : task.description;
    const result = await this.processRequest(request, context);
    
    // Return the primary response (first agent's response)
    const agentKeys = Object.keys(result.agentResponses);
    const firstAgentKey = agentKeys[0];
    if (!firstAgentKey) {
      return {
        content: result.response,
        confidence: 0.8
      };
    }
    return result.agentResponses[firstAgentKey] ?? {
      content: result.response,
      confidence: 0.8
    };
  }

  /**
   * Utility methods
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateAgentTimes(
    agentResponses: Record<string, AgentResponse>
  ): Record<string, number> {
    const times: Record<string, number> = {};
    
    Object.entries(agentResponses).forEach(([agentKey, response]) => {
      times[agentKey] = response.performance?.processingTime ?? 0;
    });
    
    return times;
  }

  private recordPerformance(
    request: string,
    agents: string[],
    duration: number,
    success: boolean
  ): void {
    this.performanceHistory.push({
      timestamp: new Date(),
      taskType: this.categorizeRequest(request),
      agents,
      duration,
      success
    });

    // Keep only recent history
    if (this.performanceHistory.length > 1000) {
      this.performanceHistory = this.performanceHistory.slice(-500);
    }
  }

  private categorizeRequest(request: string): string {
    const requestLower = request.toLowerCase();
    
    if (/\b(fix|bug|debug|error|regression|failing|broken|patch|correct)\b/.test(requestLower)) {
      return 'code-correction';
    }
    if (requestLower.includes('component') || requestLower.includes('ui')) {return 'ui-development';}
    if (requestLower.includes('api') || requestLower.includes('backend')) {return 'api-development';}
    if (requestLower.includes('security') || requestLower.includes('auth')) {return 'security';}
    if (requestLower.includes('performance') || requestLower.includes('optimization')) {return 'optimization';}
    if (requestLower.includes('test') || requestLower.includes('testing')) {return 'testing';}
    if (requestLower.includes('architecture') || requestLower.includes('design')) {return 'architecture';}
    
    return 'general';
  }

  private trackOrchestratorTelemetry(
    event: string,
    properties: Record<string, string | number | boolean | undefined>
  ): void {
    const payload: Record<string, string | number | boolean> = {};
    Object.entries(properties).forEach(([key, value]) => {
      if (value !== undefined) {
        payload[key] = value;
      }
    });
    telemetry.trackEvent(event, payload);
  }

  private extractFileType(currentFile?: string): string {
    if (!currentFile) {
      return 'unknown';
    }
    const normalized = currentFile.trim();
    const extension = normalized.split('.').pop();
    if (!extension || extension === normalized) {
      return 'unknown';
    }
    return extension.toLowerCase();
  }

  /**
   * Public interface methods
   */
  getAvailableAgents(): AgentInfo[] {
    return Array.from(this.agents.entries()).map(([key, agent]) => {
      const stats = agent.getLearningStats();
      
      return {
        name: agent.getName(),
        role: agent.getRole(),
        capabilities: agent.getCapabilities(),
        specialization: (agent as BaseSpecializedAgent & { getSpecialization?: () => string }).getSpecialization?.() ?? 'General',
        performance: {
          avgResponseTime: stats.avgProcessingTime,
          successRate: stats.avgConfidence,
          confidence: stats.avgConfidence
        },
        workload: this.calculateAgentWorkload(key)
      };
    });
  }

  private calculateAgentWorkload(agentKey: string): number {
    const recentTasks = this.performanceHistory
      .filter(h => h.agents.includes(agentKey) && 
                   (Date.now() - h.timestamp.getTime()) < 60 * 60 * 1000) // Last hour
      .length;
    
    return Math.min(recentTasks / 10, 1); // Normalize to 0-1
  }

  getActiveCoordinations(): CoordinatedTask[] {
    return Array.from(this.activeTasks.values());
  }

  getCoordinatedTask(taskId: string): CoordinatedTask | undefined {
    return this.activeTasks.get(taskId);
  }

  cancelCoordination(taskId: string): boolean {
    return this.activeTasks.delete(taskId);
  }

  /**
   * Backward compatibility method
   */
  async coordinateTask(task: {
    id?: string;
    description: string;
    context?: AgentContext;
  }): Promise<CoordinatedTask> {
    const taskId = task.id ?? this.generateTaskId();
    
    const coordinatedTask: CoordinatedTask = {
      id: taskId,
      description: task.description,
      context: task.context,
      status: 'pending',
      requiredAgents: ['technical_lead'], // Default assignment
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return coordinatedTask;
  }

  /**
   * Performance analytics
   */
  getPerformanceAnalytics(): {
    totalTasks: number;
    successRate: number;
    avgResponseTime: number;
    agentUtilization: Record<string, number>;
    topTaskTypes: Array<{ type: string; count: number }>;
  } {
    const recentHistory = this.performanceHistory.slice(-100);
    
    const successRate = recentHistory.length > 0
      ? recentHistory.filter(h => h.success).length / recentHistory.length
      : 0;
    
    const avgResponseTime = recentHistory.length > 0
      ? recentHistory.reduce((sum, h) => sum + h.duration, 0) / recentHistory.length
      : 0;

    const agentUtilization: Record<string, number> = {};
    const taskTypeCounts: Record<string, number> = {};

    recentHistory.forEach(h => {
      h.agents.forEach(agent => {
        agentUtilization[agent] = (agentUtilization[agent] ?? 0) + 1;
      });
      
      taskTypeCounts[h.taskType] = (taskTypeCounts[h.taskType] ?? 0) + 1;
    });

    const topTaskTypes = Object.entries(taskTypeCounts)
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));

    return {
      totalTasks: this.performanceHistory.length,
      successRate,
      avgResponseTime,
      agentUtilization,
      topTaskTypes
    };
  }
}