/**
 * Pure scoring/categorization heuristics used by the AgentOrchestrator, split
 * into a sibling module to keep the orchestrator under the 1000-line file cap.
 * Stateless string/record helpers only — fully unit-testable in isolation.
 */
import type { AgentContext, AgentResponse } from './BaseSpecializedAgent';

export interface AgentScores {
  technical_lead: number;
  frontend_engineer: number;
  backend_engineer: number;
  security_specialist: number;
  performance_specialist: number;
  code_corrector: number;
  super_coder: number;
}

export function buildAgentScores(requestLower: string): AgentScores {
  const patterns = {
    architecture: /\b(architecture|design|structure|pattern|scalability|system)\b/g,
    frontend: /\b(react|ui|component|interface|frontend|client|user|css|html|styling)\b/g,
    backend: /\b(api|server|backend|database|endpoint|service|microservice)\b/g,
    security: /\b(security|auth|authentication|vulnerability|secure|protection)\b/g,
    performance: /\b(performance|optimization|speed|memory|efficiency|profiling)\b/g,
    correction:
      /\b(fix|bug|debug|error|issue|regression|failing|broken|crash|exception|patch|correct)\b/g,
    general: /\b(code|function|method|class|implementation|development)\b/g,
  };

  return {
    technical_lead: (requestLower.match(patterns.architecture)?.length ?? 0) * 2,
    frontend_engineer: (requestLower.match(patterns.frontend)?.length ?? 0) * 2,
    backend_engineer: (requestLower.match(patterns.backend)?.length ?? 0) * 2,
    security_specialist: (requestLower.match(patterns.security)?.length ?? 0) * 3,
    performance_specialist: (requestLower.match(patterns.performance)?.length ?? 0) * 3,
    code_corrector: (requestLower.match(patterns.correction)?.length ?? 0) * 4,
    super_coder: requestLower.match(patterns.general)?.length ?? 0,
  };
}

export function applyContextScoreAdjustments(scores: AgentScores, context: AgentContext): void {
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

export function getEligibleSortedAgents(
  scores: AgentScores,
  correctionRouteEnabled: boolean
): string[] {
  const sortedAgents = Object.entries(scores)
    .filter(([_, score]) => score > 0)
    .sort(([_, a], [__, b]) => b - a)
    .map(([agent]) => agent);
  return sortedAgents.filter(agentKey => correctionRouteEnabled || agentKey !== 'code_corrector');
}

export function categorizeRequest(request: string): string {
  const requestLower = request.toLowerCase();

  if (/\b(fix|bug|debug|error|regression|failing|broken|patch|correct)\b/.test(requestLower)) {
    return 'code-correction';
  }
  if (requestLower.includes('component') || requestLower.includes('ui')) {
    return 'ui-development';
  }
  if (requestLower.includes('api') || requestLower.includes('backend')) {
    return 'api-development';
  }
  if (requestLower.includes('security') || requestLower.includes('auth')) {
    return 'security';
  }
  if (requestLower.includes('performance') || requestLower.includes('optimization')) {
    return 'optimization';
  }
  if (requestLower.includes('test') || requestLower.includes('testing')) {
    return 'testing';
  }
  if (requestLower.includes('architecture') || requestLower.includes('design')) {
    return 'architecture';
  }

  return 'general';
}

export function extractFileType(currentFile?: string): string {
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

export function calculateAgentTimes(
  agentResponses: Record<string, AgentResponse>
): Record<string, number> {
  const times: Record<string, number> = {};

  Object.entries(agentResponses).forEach(([agentKey, response]) => {
    times[agentKey] = response.performance?.processingTime ?? 0;
  });

  return times;
}
