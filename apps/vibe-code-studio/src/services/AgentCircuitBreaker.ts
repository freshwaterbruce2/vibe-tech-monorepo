import { logger } from '../utils/logger';

export class AgentCircuitBreaker {
  private circuitBreakers: Map<string, {
    isOpen: boolean;
    failureCount: number;
    lastFailureTime: Date;
    halfOpenTime?: Date;
  }> = new Map();

  private readonly CIRCUIT_BREAKER_THRESHOLD = 5;
  private readonly CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute

  constructor(private emitFunc: (event: string, data: any) => void) {}

  isCircuitBreakerOpen(agentId: string): boolean {
    const breaker = this.circuitBreakers.get(agentId);
    return breaker?.isOpen ?? false;
  }

  getHalfOpenTime(agentId: string): Date | undefined {
    const breaker = this.circuitBreakers.get(agentId);
    return breaker?.halfOpenTime;
  }

  updateCircuitBreaker(agentId: string, _error: Error): void {
    if (!this.circuitBreakers.has(agentId)) {
      this.circuitBreakers.set(agentId, {
        isOpen: false,
        failureCount: 0,
        lastFailureTime: new Date()
      });
    }

    const breaker = this.circuitBreakers.get(agentId)!;
    breaker.failureCount++;
    breaker.lastFailureTime = new Date();

    if (breaker.failureCount >= this.CIRCUIT_BREAKER_THRESHOLD) {
      this.openCircuitBreaker(agentId);
    }
  }

  openCircuitBreaker(agentId: string): void {
    const breaker = this.circuitBreakers.get(agentId) || {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: new Date()
    };
    
    breaker.isOpen = true;
    breaker.halfOpenTime = new Date(Date.now() + this.CIRCUIT_BREAKER_TIMEOUT);
    
    this.circuitBreakers.set(agentId, breaker);
    
    logger.warn(`Circuit breaker opened for agent ${agentId}`);
    this.emitFunc('circuitBreakerOpened', { agentId });
  }

  resetCircuitBreaker(agentId: string): void {
    const breaker = this.circuitBreakers.get(agentId);
    if (breaker) {
      breaker.isOpen = false;
      breaker.failureCount = 0;
      delete breaker.halfOpenTime;
      
      logger.info(`Circuit breaker reset for agent ${agentId}`);
      this.emitFunc('circuitBreakerReset', { agentId });
    }
  }

  reset(): void {
    this.circuitBreakers.clear();
  }
}
