/**
 * AgentReliabilityManagerTypes - Shared interfaces for AgentReliabilityManager
 */
import type { AgentContext, AgentResponse, BaseSpecializedAgent } from './specialized-agents/BaseSpecializedAgent';

export interface AgentHealthStatus {
  agentId: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'offline';
  lastResponseTime: number;
  errorRate: number;
  consecutiveFailures: number;
  lastHealthCheck: Date;
  issues: HealthIssue[];
}

export interface HealthIssue {
  type: 'timeout' | 'memory_leak' | 'high_error_rate' | 'resource_exhaustion' | 'dependency_failure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  firstOccurred: Date;
  lastOccurred: Date;
  occurrenceCount: number;
  autoResolve: boolean;
}

export interface RecoveryStrategy {
  type: 'retry' | 'circuit_breaker' | 'fallback' | 'restart' | 'load_balance';
  condition: (error: Error, context: AgentContext) => boolean;
  execute: (agent: BaseSpecializedAgent, request: string, context: AgentContext) => Promise<AgentResponse>;
  maxAttempts: number;
  backoffMs: number;
}

export interface ReliabilityMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  uptime: number;
  mtbf: number; // Mean Time Between Failures
  mttr: number; // Mean Time To Recovery
}
