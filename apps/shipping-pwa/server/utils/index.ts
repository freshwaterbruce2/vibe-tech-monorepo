import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

export { logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Usage tracking for billing
 */
export interface UsageMetrics {
  tenantId: string;
  period: string;
  doorsProcessed: number;
  palletsTracked: number;
  apiCalls: number;
  storageUsedMB: number;
  lastUpdated: string;
}

const usageMetricsMap = new Map<string, UsageMetrics>();

export async function trackUsageMetrics(
  tenantId: string,
  metrics: { doorsProcessed?: number; palletsTracked?: number; apiCalls?: number; timestamp?: string }
): Promise<void> {
  const period = new Date().toISOString().slice(0, 7);
  const key = `${tenantId}-${period}`;

  const existing = usageMetricsMap.get(key) || {
    tenantId,
    period,
    doorsProcessed: 0,
    palletsTracked: 0,
    apiCalls: 0,
    storageUsedMB: 0,
    lastUpdated: new Date().toISOString()
  };

  const updated = {
    ...existing,
    doorsProcessed: existing.doorsProcessed + (metrics.doorsProcessed || 0),
    palletsTracked: existing.palletsTracked + (metrics.palletsTracked || 0),
    apiCalls: existing.apiCalls + (metrics.apiCalls || 0),
    lastUpdated: new Date().toISOString()
  };

  usageMetricsMap.set(key, updated);

  try {
    const usageDir = path.join(__dirname, '..', '..', 'data', 'usage');
    if (!existsSync(usageDir)) {
      mkdirSync(usageDir, { recursive: true });
    }
    const usageFile = path.join(usageDir, `${key}.json`);
    writeFileSync(usageFile, JSON.stringify(updated, null, 2));
  } catch (error) {
    console.error('Failed to save usage metrics:', error);
  }
}

export function getUsageMetrics(tenantId: string, period?: string): UsageMetrics | undefined {
  const targetPeriod = period || new Date().toISOString().slice(0, 7);
  const key = `${tenantId}-${targetPeriod}`;

  if (usageMetricsMap.has(key)) {
    return usageMetricsMap.get(key);
  }

  try {
    const usageFile = path.join(__dirname, '..', '..', 'data', 'usage', `${key}.json`);
    if (existsSync(usageFile)) {
      const data = JSON.parse(readFileSync(usageFile, 'utf8'));
      usageMetricsMap.set(key, data);
      return data;
    }
  } catch (error) {
    console.error('Failed to load usage metrics:', error);
  }

  return undefined;
}

/**
 * Extract recommendations from AI analysis
 */
export function extractRecommendations(analysis: string): string[] {
  const recommendations: string[] = [];

  const lines = analysis.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.match(/^[0-9]+\./) || trimmed.match(/^[-*]/) || trimmed.toLowerCase().includes('recommend')) {
      recommendations.push(trimmed.replace(/^[0-9]+\.?\s*/, '').replace(/^[-*]\s*/, ''));
    }
  }

  return recommendations.slice(0, 5);
}

/**
 * Fallback recommendations when AI is unavailable
 */
export function getFallbackRecommendations(data: any): string[] {
  const fallbacks = [
    'Optimize door assignments based on destination patterns',
    'Consider consolidating shipments to reduce partial loads',
    'Review pallet counts for efficiency opportunities',
    'Implement sequential door loading for better workflow'
  ];

  const { doorEntries = [] } = data;

  if (doorEntries.length > 10) {
    fallbacks.unshift('High door count detected - consider batch processing');
  }

  if (doorEntries.some((entry: any) => entry.trailerStatus === 'partial')) {
    fallbacks.unshift('Multiple partial loads detected - consolidation opportunity');
  }

  return fallbacks.slice(0, 3);
}
