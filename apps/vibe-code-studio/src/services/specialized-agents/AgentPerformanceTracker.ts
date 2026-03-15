export class AgentPerformanceTracker {
  private performanceHistory: Array<{
    timestamp: Date;
    taskType: string;
    agents: string[];
    duration: number;
    success: boolean;
  }> = [];

  recordPerformance(
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
    
    if (requestLower.includes('component') || requestLower.includes('ui')) { return 'ui-development'; }
    if (requestLower.includes('api') || requestLower.includes('backend')) { return 'api-development'; }
    if (requestLower.includes('security') || requestLower.includes('auth')) { return 'security'; }
    if (requestLower.includes('performance') || requestLower.includes('optimization')) { return 'optimization'; }
    if (requestLower.includes('test') || requestLower.includes('testing')) { return 'testing'; }
    if (requestLower.includes('architecture') || requestLower.includes('design')) { return 'architecture'; }
    
    return 'general';
  }

  calculateAgentWorkload(agentKey: string): number {
    const recentTasks = this.performanceHistory
      .filter(h => h.agents.includes(agentKey) && 
                   (Date.now() - h.timestamp.getTime()) < 60 * 60 * 1000) // Last hour
      .length;
    
    return Math.min(recentTasks / 10, 1); // Normalize to 0-1
  }

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
