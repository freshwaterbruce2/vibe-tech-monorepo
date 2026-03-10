import { Activity, BarChart3, Clock, Eye, TrendingUp } from 'lucide-react';
import React from 'react';
import { PerformanceMetric } from '../styled';
import { CollapsibleSection } from './CollapsibleSection';

interface PerformanceReport {
  avgResponseTime: number;
  cacheEfficiency: number;
  activeAlerts: number;
  memoryUsage: number;
}

interface PerformancePanelProps {
  performanceReport: PerformanceReport;
  isExpanded: boolean;
  onToggle: () => void;
}

export const PerformancePanel = ({
  performanceReport,
  isExpanded,
  onToggle,
}: PerformancePanelProps) => {
  return (
    <CollapsibleSection
      title="Performance"
      icon={<BarChart3 />}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <PerformanceMetric>
        <Clock size={12} />
        <span className="metric-label">Avg Response:</span>
        <span className="metric-value">
          {Math.round(performanceReport.avgResponseTime)}ms
        </span>
      </PerformanceMetric>
      <PerformanceMetric>
        <TrendingUp size={12} />
        <span className="metric-label">Cache Hit Rate:</span>
        <span className="metric-value">
          {Math.round(performanceReport.cacheEfficiency * 100)}%
        </span>
      </PerformanceMetric>
      <PerformanceMetric>
        <Eye size={12} />
        <span className="metric-label">Active Alerts:</span>
        <span className="metric-value">{performanceReport.activeAlerts}</span>
      </PerformanceMetric>
      <PerformanceMetric>
        <Activity size={12} />
        <span className="metric-label">Memory Usage:</span>
        <span className="metric-value">
          {Math.round(performanceReport.memoryUsage / 1024 / 1024)}MB
        </span>
      </PerformanceMetric>
    </CollapsibleSection>
  );
};
