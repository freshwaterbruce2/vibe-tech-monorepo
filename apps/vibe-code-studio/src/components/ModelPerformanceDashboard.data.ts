import { vibeTheme } from '../styles/theme';

import type { ModelMetrics, StrategyDistribution, TimeSeriesData } from './ModelPerformanceDashboard.types';

export const MODEL_METRICS: ModelMetrics[] = [
  {
    name: 'liquid/lfm-2.5-1.2b-thinking:free',
    displayName: 'LFM 2.5 Thinking (Free)',
    requests: 214,
    successRate: 96.8,
    avgLatency: 190,
    totalCost: 0.0,
    acceptanceRate: 68.2,
    tokensUsed: 42800
  },
  {
    name: 'deepseek/deepseek-v3.2',
    displayName: 'DeepSeek V3.2',
    requests: 612,
    successRate: 98.6,
    avgLatency: 260,
    totalCost: 0.29,
    acceptanceRate: 74.9,
    tokensUsed: 148900
  },
  {
    name: 'anthropic/claude-sonnet-4.5',
    displayName: 'Claude Sonnet 4.5',
    requests: 233,
    successRate: 99.2,
    avgLatency: 540,
    totalCost: 0.78,
    acceptanceRate: 86.5,
    tokensUsed: 58400
  },
  {
    name: 'openai/gpt-5.2-codex',
    displayName: 'GPT-5.2 Codex',
    requests: 96,
    successRate: 99.6,
    avgLatency: 610,
    totalCost: 0.55,
    acceptanceRate: 91.4,
    tokensUsed: 21000
  }
];

export const LATENCY_DATA: TimeSeriesData[] = [
  { time: '10:00', free: 180, low: 240, mid: 520, high: 600 },
  { time: '10:15', free: 190, low: 255, mid: 560, high: 640 },
  { time: '10:30', free: 185, low: 250, mid: 540, high: 620 },
  { time: '10:45', free: 200, low: 265, mid: 580, high: 660 },
  { time: '11:00', free: 188, low: 245, mid: 550, high: 630 },
  { time: '11:15', free: 195, low: 260, mid: 565, high: 650 },
  { time: '11:30', free: 190, low: 255, mid: 555, high: 635 },
];

export const STRATEGY_DATA: StrategyDistribution[] = [
  { name: 'Fast', value: 45, color: vibeTheme.colors.green },
  { name: 'Balanced', value: 30, color: vibeTheme.colors.cyan },
  { name: 'Accurate', value: 15, color: vibeTheme.colors.purple },
  { name: 'Adaptive', value: 10, color: vibeTheme.colors.orange }
];

export const COST_DATA = [
  { model: 'LFM 2.5 (Free)', cost: 0.0, color: vibeTheme.colors.green },
  { model: 'DeepSeek V3.2', cost: 0.31, color: vibeTheme.colors.cyan },
  { model: 'Claude Sonnet 4.5', cost: 9.0, color: vibeTheme.colors.purple },
  { model: 'GPT-5.2 Codex', cost: 7.88, color: vibeTheme.colors.orange }
];
