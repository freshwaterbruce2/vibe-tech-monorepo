/**
 * AgentReliabilityManagerHelpers - Pure helper functions for AgentReliabilityManager
 */
import type { AgentContext } from './specialized-agents/BaseSpecializedAgent';
import type { HealthIssue } from './AgentReliabilityManagerTypes';

/**
 * Classify an error into a HealthIssue type based on the error message.
 */
export function categorizeError(error: Error): HealthIssue['type'] {
  const message = error.message.toLowerCase();

  if (message.includes('timeout')) { return 'timeout'; }
  if (message.includes('memory') || message.includes('heap')) { return 'memory_leak'; }
  if (message.includes('resource') || message.includes('limit')) { return 'resource_exhaustion'; }
  if (message.includes('connection') || message.includes('network')) { return 'dependency_failure'; }

  return 'high_error_rate';
}

/**
 * Map a HealthIssue type to its default severity level.
 */
export function getSeverityForIssueType(type: HealthIssue['type']): HealthIssue['severity'] {
  switch (type) {
    case 'memory_leak':
    case 'resource_exhaustion':
      return 'critical';
    case 'timeout':
    case 'dependency_failure':
      return 'high';
    case 'high_error_rate':
      return 'medium';
    default:
      return 'low';
  }
}

/**
 * Return true for issue types that can be automatically resolved over time.
 */
export function canAutoResolve(type: HealthIssue['type']): boolean {
  return ['timeout', 'dependency_failure'].includes(type);
}

/**
 * Truncate a request string to a manageable length for the fallback strategy.
 */
export function simplifyRequest(request: string): string {
  return request.length > 500 ? `${request.substring(0, 500)}...` : request;
}

/**
 * Strip heavy context fields so the fallback strategy can attempt a lighter call.
 */
export function simplifyContext(context: AgentContext): AgentContext {
  return {
    ...(context.currentFile && { currentFile: context.currentFile }),
    ...(context.workspaceRoot && { workspaceRoot: context.workspaceRoot }),
  };
}
