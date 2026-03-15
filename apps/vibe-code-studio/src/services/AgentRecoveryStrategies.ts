import { logger } from '../utils/logger';
import type { AgentContext, AgentResponse, BaseSpecializedAgent } from './specialized-agents/BaseSpecializedAgent';
import type { AgentCircuitBreaker } from './AgentCircuitBreaker';

export interface RecoveryStrategy {
  type: 'retry' | 'circuit_breaker' | 'fallback' | 'restart' | 'load_balance';
  condition: (error: Error, context: any) => boolean;
  execute: (agent: BaseSpecializedAgent, request: string, context: AgentContext, cb?: AgentCircuitBreaker) => Promise<AgentResponse>;
  maxAttempts: number;
  backoffMs: number;
}

export class AgentRecoveryStrategies {
  private strategies: RecoveryStrategy[] = [];

  constructor() {
    this.initializeDefaultStrategies();
  }

  private initializeDefaultStrategies(): void {
    this.strategies.push({
      type: 'retry',
      condition: (error: Error) => {
        return error.message.includes('timeout') || 
               error.message.includes('network') ||
               error.message.includes('temporary');
      },
      execute: async (agent: BaseSpecializedAgent, request: string, context: AgentContext) => {
        let lastError: Error | null = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
            if (attempt > 1) {
              await new Promise(resolve => setTimeout(resolve, delay));
            }
            return await agent.process(request, context);
          } catch (error) {
            lastError = error as Error;
            logger.warn(`Retry attempt ${attempt} failed for agent ${agent.getName()}: ${error}`);
          }
        }
        throw lastError;
      },
      maxAttempts: 3,
      backoffMs: 1000
    });

    this.strategies.push({
      type: 'circuit_breaker',
      condition: (error: Error) => {
        return error.message.includes('service unavailable') ||
               error.message.includes('connection refused');
      },
      execute: async (agent: BaseSpecializedAgent, request: string, context: AgentContext, cb?: AgentCircuitBreaker) => {
        const agentId = agent.getName();
        
        if (cb?.isCircuitBreakerOpen(agentId)) {
          const halfOpenTime = cb.getHalfOpenTime(agentId);
          if (halfOpenTime && Date.now() > halfOpenTime.getTime()) {
            try {
              const response = await agent.process(request, context);
              cb.resetCircuitBreaker(agentId);
              return response;
            } catch (error) {
              cb.openCircuitBreaker(agentId);
              throw new Error(`Circuit breaker open for agent ${agentId}: ${error}`);
            }
          } else {
            throw new Error(`Circuit breaker open for agent ${agentId}`);
          }
        }

        return await agent.process(request, context);
      },
      maxAttempts: 1,
      backoffMs: 0
    });

    this.strategies.push({
      type: 'fallback',
      condition: (error: Error) => {
        return error.message.includes('complexity') ||
               error.message.includes('resource');
      },
      execute: async (agent: BaseSpecializedAgent, request: string, context: AgentContext) => {
        const simplifiedRequest = request.length > 500 ? `${request.substring(0, 500)  }...` : request;
        const simplifiedContext = {
          ...(context.currentFile && { currentFile: context.currentFile }),
          ...(context.workspaceRoot && { workspaceRoot: context.workspaceRoot })
        };
        
        logger.info(`Using fallback strategy for agent ${agent.getName()}`);
        
        try {
          const response = await agent.process(simplifiedRequest, simplifiedContext);
          return {
            ...response,
            content: `[Simplified Response] ${response.content}`,
            confidence: Math.max(0.3, response.confidence - 0.2)
          };
        } catch (_error) {
          return {
            content: `I apologize, but I'm experiencing technical difficulties. Please try a simpler request or contact support.`,
            confidence: 0.2,
            reasoning: 'Fallback response due to agent failure'
          };
        }
      },
      maxAttempts: 1,
      backoffMs: 0
    });
  }

  getStrategies(): RecoveryStrategy[] {
    return this.strategies;
  }

  addStrategy(strategy: RecoveryStrategy): void {
    this.strategies.push(strategy);
    logger.info(`Added custom recovery strategy: ${strategy.type}`);
  }
}
