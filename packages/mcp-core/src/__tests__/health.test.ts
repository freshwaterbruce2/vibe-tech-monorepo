import { describe, it, expect } from 'vitest';
import {
  createHealthyStatus,
  createUnhealthyStatus,
  getSystemMetrics,
  aggregateHealthStatuses,
} from '../types/health.js';

describe('createHealthyStatus', () => {
  it('should create healthy status with defaults', () => {
    const status = createHealthyStatus();
    
    expect(status.healthy).toBe(true);
    expect(status.message).toBe('OK');
    expect(status.timestamp).toBeInstanceOf(Date);
  });

  it('should accept custom message and details', () => {
    const status = createHealthyStatus('All systems go', { uptime: 3600 });
    
    expect(status.message).toBe('All systems go');
    expect(status.details).toEqual({ uptime: 3600 });
  });
});

describe('createUnhealthyStatus', () => {
  it('should create unhealthy status', () => {
    const status = createUnhealthyStatus('Connection failed');
    
    expect(status.healthy).toBe(false);
    expect(status.message).toBe('Connection failed');
    expect(status.timestamp).toBeInstanceOf(Date);
  });

  it('should include details', () => {
    const status = createUnhealthyStatus('Timeout', { after: 5000 });
    expect(status.details).toEqual({ after: 5000 });
  });
});

describe('getSystemMetrics', () => {
  it('should return memory usage metrics', () => {
    const metrics = getSystemMetrics();
    
    expect(metrics.memoryUsage).toBeDefined();
    expect(typeof metrics.memoryUsage.heapUsed).toBe('number');
    expect(typeof metrics.memoryUsage.heapTotal).toBe('number');
    expect(typeof metrics.memoryUsage.external).toBe('number');
    expect(typeof metrics.memoryUsage.rss).toBe('number');
  });

  it('should return positive values', () => {
    const metrics = getSystemMetrics();
    
    expect(metrics.memoryUsage.heapUsed).toBeGreaterThan(0);
    expect(metrics.memoryUsage.rss).toBeGreaterThan(0);
  });
});

describe('aggregateHealthStatuses', () => {
  it('should return healthy when all statuses are healthy', () => {
    const statuses = [
      createHealthyStatus('OK'),
      createHealthyStatus('OK'),
      createHealthyStatus('OK'),
    ];
    
    const result = aggregateHealthStatuses(statuses);
    
    expect(result.healthy).toBe(true);
    expect(result.message).toBe('All checks passed');
    expect(result.details?.totalChecks).toBe(3);
  });

  it('should return unhealthy when any status is unhealthy', () => {
    const statuses = [
      createHealthyStatus('OK'),
      createUnhealthyStatus('Database down'),
      createHealthyStatus('OK'),
    ];
    
    const result = aggregateHealthStatuses(statuses);
    
    expect(result.healthy).toBe(false);
    expect(result.message).toContain('1/3');
    expect(result.details?.failedChecks).toContain('Database down');
  });

  it('should handle all unhealthy', () => {
    const statuses = [
      createUnhealthyStatus('Error 1'),
      createUnhealthyStatus('Error 2'),
    ];
    
    const result = aggregateHealthStatuses(statuses);
    
    expect(result.healthy).toBe(false);
    expect(result.message).toContain('2/2');
  });

  it('should handle empty array', () => {
    const result = aggregateHealthStatuses([]);
    expect(result.healthy).toBe(true);
  });
});
