/**
 * Performance Monitor Component for Vibe Code Studio
 * Displays real-time memory and performance metrics
 * Based on 2025 best practices for Electron monitoring
 */

import { Activity, AlertTriangle, Cpu, HardDrive, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import type { } from '../types/electron.d';
interface MemoryMetrics {
  totalMemoryMB: number;
  workingSetSizeMB: number;
  privateMemoryMB: number;
  sharedMemoryMB: number;
  timestamp: number;
}

interface PerformanceMetrics {
  cpuUsage: { percentCPUUsage: number };
  memoryInfo: { workingSetSize: number };
  frameRate?: number;
  eventLoopLag?: number;
  timestamp: number;
}

interface MemoryStats {
  current: number;
  average: number;
  peak: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

const MonitorContainer = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 320px;
  background: rgba(30, 30, 30, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 12px;
  color: #fff;
  z-index: 10000;
  transition: all 0.3s ease;

  &.minimized {
    width: 60px;
    height: 60px;
    padding: 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const Title = styled.h3`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  padding: 4px;
  font-size: 18px;
  line-height: 1;

  &:hover {
    color: #fff;
  }
`;

const MetricRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;

  &:not(:last-child) {
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  }
`;

const MetricLabel = styled.span`
  color: #999;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const MetricValue = styled.span<{ $warning?: boolean; $critical?: boolean }>`
  font-weight: 600;
  color: ${props =>
    props.$critical ? '#ef4444' :
      props.$warning ? '#f59e0b' :
        '#10b981'};
`;

const TrendIcon = ({ trend }: { trend: string }) => {
  if (trend === 'increasing') return <TrendingUp size={14} color="#ef4444" />;
  if (trend === 'decreasing') return <TrendingDown size={14} color="#10b981" />;
  return <Minus size={14} color="#999" />;
};

const ProgressBar = styled.div<{ $percentage: number; $warning?: boolean; $critical?: boolean }>`
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  margin-top: 4px;
  overflow: hidden;

  &::after {
    content: '';
    display: block;
    width: ${props => props.$percentage}%;
    height: 100%;
    background: ${props =>
    props.$critical ? '#ef4444' :
      props.$warning ? '#f59e0b' :
        '#10b981'};
    transition: width 0.3s ease;
  }
`;

const ActionButton = styled.button`
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid #3b82f6;
  color: #3b82f6;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 11px;
  cursor: pointer;
  margin-top: 12px;
  width: 100%;

  &:hover {
    background: rgba(59, 130, 246, 0.2);
  }
`;

const PerformanceMonitor: React.FC = () => {
  const [minimized, setMinimized] = useState(false);
  const [memoryMetrics, setMemoryMetrics] = useState<MemoryMetrics | null>(null);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [memoryStats, setMemoryStats] = useState<MemoryStats | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    // Listen for memory metrics from main process
    const handleMemoryMetrics = (_: any, metrics: MemoryMetrics) => {
      setMemoryMetrics(metrics);
    };

    const handlePerformanceMetrics = (_: any, metrics: PerformanceMetrics) => {
      setPerformanceMetrics(metrics);
    };

    if ((window.electron as any)?.ipc) {
      (window.electron as any).ipc.on('memory-metrics', handleMemoryMetrics);
      (window.electron as any).ipc.on('performance:metrics', handlePerformanceMetrics);

      // Request initial stats
      (window.electron as any).ipc.invoke('memory:get-stats').then(setMemoryStats);
    }

    return () => {
      if ((window.electron as any)?.ipc) {
        (window.electron as any).ipc.removeAllListeners('memory-metrics');
        (window.electron as any).ipc.removeAllListeners('performance:metrics');
      }
    };
  }, []);

  const handleForceGC = useCallback(() => {
    if ((window.electron as any)?.ipc) {
      (window.electron as any).ipc.invoke('memory:force-gc');
    }
  }, []);

  const handleStartRecording = useCallback(async () => {
    if ((window.electron as any)?.ipc) {
      await (window.electron as any).ipc.invoke('performance:start-recording');
      setIsRecording(true);
    }
  }, []);

  const handleStopRecording = useCallback(async () => {
    if ((window.electron as any)?.ipc) {
      const tracePath = await (window.electron as any).ipc.invoke('performance:stop-recording');
      setIsRecording(false);
      console.log('Performance trace saved:', tracePath);
    }
  }, []);

  if (minimized) {
    return (
      <MonitorContainer className="minimized" onClick={() => setMinimized(false)}>
        <Activity size={24} color="#999" />
      </MonitorContainer>
    );
  }

  const memoryUsagePercentage = memoryMetrics
    ? Math.min(100, (memoryMetrics.workingSetSizeMB / 4096) * 100)
    : 0;

  const isMemoryWarning = memoryMetrics ? memoryMetrics.workingSetSizeMB > 3072 : undefined;
  const isMemoryCritical = memoryMetrics ? memoryMetrics.workingSetSizeMB > 4096 : undefined;

  const cpuUsagePercentage = performanceMetrics?.cpuUsage.percentCPUUsage ?? 0;
  const frameRate = performanceMetrics?.frameRate ?? 0;
  const eventLoopLag = performanceMetrics?.eventLoopLag ?? 0;

  return (
    <MonitorContainer>
      <Header>
        <Title>
          <Activity size={16} />
          Performance Monitor
        </Title>
        <CloseButton onClick={() => setMinimized(true)}>×</CloseButton>
      </Header>

      {memoryMetrics && (
        <>
          <MetricRow>
            <MetricLabel>
              <HardDrive size={14} />
              Memory Usage
            </MetricLabel>
            <MetricValue $warning={isMemoryWarning} $critical={isMemoryCritical}>
              {memoryMetrics.workingSetSizeMB.toFixed(0)} MB
              {isMemoryCritical && <AlertTriangle size={14} style={{ marginLeft: 4 }} />}
            </MetricValue>
          </MetricRow>
          <ProgressBar
            $percentage={memoryUsagePercentage}
            $warning={isMemoryWarning}
            $critical={isMemoryCritical}
          />
        </>
      )}

      {memoryStats && (
        <MetricRow>
          <MetricLabel>Memory Trend</MetricLabel>
          <MetricValue>
            <TrendIcon trend={memoryStats.trend} />
            {memoryStats.trend}
          </MetricValue>
        </MetricRow>
      )}

      {performanceMetrics && (
        <>
          <MetricRow>
            <MetricLabel>
              <Cpu size={14} />
              CPU Usage
            </MetricLabel>
            <MetricValue
              $warning={cpuUsagePercentage > 60}
              $critical={cpuUsagePercentage > 80}
            >
              {cpuUsagePercentage.toFixed(1)}%
            </MetricValue>
          </MetricRow>

          {frameRate > 0 && (
            <MetricRow>
              <MetricLabel>Frame Rate</MetricLabel>
              <MetricValue
                $warning={frameRate < 30}
                $critical={frameRate < 15}
              >
                {frameRate} FPS
              </MetricValue>
            </MetricRow>
          )}

          {eventLoopLag > 0 && (
            <MetricRow>
              <MetricLabel>Event Loop Lag</MetricLabel>
              <MetricValue
                $warning={eventLoopLag > 50}
                $critical={eventLoopLag > 100}
              >
                {eventLoopLag.toFixed(1)}ms
              </MetricValue>
            </MetricRow>
          )}
        </>
      )}

      <ActionButton onClick={handleForceGC}>
        Force Garbage Collection
      </ActionButton>

      <ActionButton onClick={isRecording ? handleStopRecording : handleStartRecording}>
        {isRecording ? 'Stop Recording' : 'Start Performance Recording'}
      </ActionButton>
    </MonitorContainer>
  );
};

export default PerformanceMonitor;
