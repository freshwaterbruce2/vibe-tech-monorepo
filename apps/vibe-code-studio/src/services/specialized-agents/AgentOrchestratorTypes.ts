/**
 * Shared type definitions for AgentOrchestrator and related components
 */
import type { AgentCapability, AgentContext, AgentResponse } from './BaseSpecializedAgent';

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
