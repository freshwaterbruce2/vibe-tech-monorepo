import fs from 'fs/promises';
import path from 'path';

const USAGE_DB_PATH = process.env.USAGE_DB_PATH ?? 'D:\\databases\\openrouter-usage.json';

interface UsageRecord {
  model: string;
  tokens: number;
  cost: number;
  timestamp: string;
}

interface UsageData {
  records: UsageRecord[];
}

export async function trackUsage(record: UsageRecord): Promise<void> {
  try {
    // Ensure directory exists
    const dir = path.dirname(USAGE_DB_PATH);
    await fs.mkdir(dir, { recursive: true });

    // Read existing data
    let data: UsageData = { records: [] };
    try {
      const content = await fs.readFile(USAGE_DB_PATH, 'utf-8');
      data = JSON.parse(content);
    } catch (_error) {
      // File doesn't exist yet, use empty data
    }

    // Add new record
    data.records.push(record);

    // Keep only last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    data.records = data.records.filter(
      r => new Date(r.timestamp) > thirtyDaysAgo
    );

    // Write back
    await fs.writeFile(USAGE_DB_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Failed to track usage:', error);
  }
}

export async function getUsageStats(periodHours: number = 24): Promise<any> {
  try {
    const content = await fs.readFile(USAGE_DB_PATH, 'utf-8');
    const data: UsageData = JSON.parse(content);

    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - periodHours);

    const recentRecords = data.records.filter(
      r => new Date(r.timestamp) > cutoff
    );

    return {
      total_requests: recentRecords.length,
      total_tokens: recentRecords.reduce((sum, r) => sum + r.tokens, 0),
      total_cost: recentRecords.reduce((sum, r) => sum + r.cost, 0),
      by_model: recentRecords.reduce((acc, r) => {
        acc[r.model] = (acc[r.model] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  } catch (_error) {
    return {
      total_requests: 0,
      total_tokens: 0,
      total_cost: 0,
      by_model: {}
    };
  }
}
