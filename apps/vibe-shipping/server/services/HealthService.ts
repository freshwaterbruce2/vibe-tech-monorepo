/**
 * Health Check Service
 * Monitors server health, request counts, and error rates
 */
export class HealthService {
  private startTime = Date.now();
  private requestCount = 0;
  private errorCount = 0;

  incrementRequest() {
    this.requestCount++;
  }

  incrementError() {
    this.errorCount++;
  }

  getHealth() {
    const uptime = Date.now() - this.startTime;
    const errorRate = this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;

    return {
      status: errorRate < 5 ? 'healthy' : 'degraded',
      uptime: Math.floor(uptime / 1000),
      requests: this.requestCount,
      errors: this.errorCount,
      errorRate: `${errorRate.toFixed(2)}%`,
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  }
}

export const healthService = new HealthService();
