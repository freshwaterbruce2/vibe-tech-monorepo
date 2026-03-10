/**
 * AI Cache Metrics Component
 * Displays real-time cache statistics and cost savings
 */

import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { Database, TrendingUp, Zap, HardDrive } from 'lucide-react';
import { vibeTheme } from '../styles/theme';
import type { CacheMetrics } from '../services/ai/AIResponseCache';

const MetricsContainer = styled.div`
  display: flex;
  gap: ${vibeTheme.spacing.md};
  padding: ${vibeTheme.spacing.md};
  background: rgba(139, 92, 246, 0.05);
  border-radius: ${vibeTheme.borderRadius.medium};
  border: 1px solid rgba(139, 92, 246, 0.2);
  flex-wrap: wrap;
`;

const MetricCard = styled.div`
  flex: 1;
  min-width: 150px;
  display: flex;
  flex-direction: column;
  gap: ${vibeTheme.spacing.xs};
`;

const MetricHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing.xs};
  color: ${vibeTheme.colors.textSecondary};
  font-size: ${vibeTheme.typography.fontSize.xs};
  text-transform: uppercase;
  letter-spacing: 0.5px;

  svg {
    width: 14px;
    height: 14px;
    opacity: 0.7;
  }
`;

const MetricValue = styled.div<{ highlight?: boolean }>`
  font-size: ${vibeTheme.typography.fontSize.lg};
  font-weight: ${vibeTheme.typography.fontWeight.bold};
  color: ${props => props.highlight ? vibeTheme.colors.accent : vibeTheme.colors.text};
  font-variant-numeric: tabular-nums;
`;

const MetricSubtext = styled.div`
  font-size: ${vibeTheme.typography.fontSize.xs};
  color: ${vibeTheme.colors.textMuted};
`;

interface AICacheMetricsProps {
  metrics: CacheMetrics;
  refreshInterval?: number; // ms
}

export const AICacheMetrics = ({
  metrics: initialMetrics,
  refreshInterval: _refreshInterval = 5000
}: AICacheMetricsProps) => {
  const [metrics, setMetrics] = useState(initialMetrics);

  useEffect(() => {
    // Update metrics from parent component
    setMetrics(initialMetrics);
  }, [initialMetrics]);

  const hitRatePercent = (metrics.hitRate * 100).toFixed(1);
  const costSavingsPercent = metrics.totalRequests > 0
    ? ((metrics.costSavings / metrics.totalRequests) * 100).toFixed(1)
    : '0.0';

  return (
    <MetricsContainer>
      <MetricCard>
        <MetricHeader>
          <TrendingUp />
          Hit Rate
        </MetricHeader>
        <MetricValue highlight={metrics.hitRate >= 0.3}>
          {hitRatePercent}%
        </MetricValue>
        <MetricSubtext>
          {metrics.hits} hits / {metrics.totalRequests} requests
        </MetricSubtext>
      </MetricCard>

      <MetricCard>
        <MetricHeader>
          <Zap />
          Cost Savings
        </MetricHeader>
        <MetricValue highlight={metrics.costSavings > 0}>
          {metrics.costSavings}
        </MetricValue>
        <MetricSubtext>
          {costSavingsPercent}% API calls saved
        </MetricSubtext>
      </MetricCard>

      <MetricCard>
        <MetricHeader>
          <HardDrive />
          Cache Size
        </MetricHeader>
        <MetricValue>
          {metrics.cacheSize}
        </MetricValue>
        <MetricSubtext>
          Cached responses
        </MetricSubtext>
      </MetricCard>

      <MetricCard>
        <MetricHeader>
          <Database />
          Total Requests
        </MetricHeader>
        <MetricValue>
          {metrics.totalRequests}
        </MetricValue>
        <MetricSubtext>
          Since session start
        </MetricSubtext>
      </MetricCard>
    </MetricsContainer>
  );
};

/**
 * Compact version for status bar or smaller spaces
 */
export const CompactCacheMetrics = ({ metrics }: { metrics: CacheMetrics }) => {
  const hitRatePercent = (metrics.hitRate * 100).toFixed(0);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      fontSize: '12px',
      color: vibeTheme.colors.textSecondary
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <Database size={14} />
        <span>{metrics.cacheSize}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <TrendingUp size={14} />
        <span style={{ color: metrics.hitRate >= 0.3 ? vibeTheme.colors.accent : 'inherit' }}>
          {hitRatePercent}%
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <Zap size={14} />
        <span>-{metrics.costSavings}</span>
      </div>
    </div>
  );
};
