/**
 * Line Count Indicator Component
 * Real-time display of file line count with 500-line standard enforcement
 *
 * Color-coded warnings:
 * - Green (0-450): Good
 * - Yellow (451-500): Approaching limit
 * - Orange (501-550): Exceeds recommended
 * - Red (551+): Exceeds hard limit
 */

import styled from 'styled-components';
import { FileText, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { vibeTheme } from '../styles/theme';

const IndicatorContainer = styled.div<{ severity: 'good' | 'approaching' | 'warning' | 'error' }>`
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing.xs};
  padding: ${vibeTheme.spacing.xs} ${vibeTheme.spacing.sm};
  border-radius: ${vibeTheme.borderRadius.small};
  font-size: ${vibeTheme.typography.fontSize.sm};
  font-weight: ${vibeTheme.typography.fontWeight.medium};
  font-variant-numeric: tabular-nums;
  transition: all 0.2s ease;

  background: ${props => {
    switch (props.severity) {
      case 'good': return 'rgba(16, 185, 129, 0.1)';
      case 'approaching': return 'rgba(245, 158, 11, 0.1)';
      case 'warning': return 'rgba(251, 146, 60, 0.1)';
      case 'error': return 'rgba(239, 68, 68, 0.1)';
    }
  }};

  color: ${props => {
    switch (props.severity) {
      case 'good': return '#10b981';
      case 'approaching': return '#f59e0b';
      case 'warning': return '#fb923c';
      case 'error': return '#ef4444';
    }
  }};

  border: 1px solid ${props => {
    switch (props.severity) {
      case 'good': return 'rgba(16, 185, 129, 0.2)';
      case 'approaching': return 'rgba(245, 158, 11, 0.3)';
      case 'warning': return 'rgba(251, 146, 60, 0.3)';
      case 'error': return 'rgba(239, 68, 68, 0.3)';
    }
  }};

  svg {
    width: 14px;
    height: 14px;
  }
`;

const LineCount = styled.span`
  font-weight: ${vibeTheme.typography.fontWeight.bold};
`;

const Separator = styled.span`
  opacity: 0.5;
`;

const Message = styled.span`
  font-size: ${vibeTheme.typography.fontSize.xs};
  opacity: 0.9;
`;

interface LineCountIndicatorProps {
  lineCount: number;
  showDetails?: boolean;
}

export const LineCountIndicator = ({
  lineCount,
  showDetails = true
}: LineCountIndicatorProps) => {
  const getSeverity = (count: number): 'good' | 'approaching' | 'warning' | 'error' => {
    if (count > 550) return 'error';
    if (count > 500) return 'warning';
    if (count > 450) return 'approaching';
    return 'good';
  };

  const getIcon = (severity: 'good' | 'approaching' | 'warning' | 'error') => {
    switch (severity) {
      case 'good':
        return <CheckCircle />;
      case 'approaching':
        return <FileText />;
      case 'warning':
        return <AlertTriangle />;
      case 'error':
        return <AlertCircle />;
    }
  };

  const getMessage = (count: number): string => {
    if (count > 550) return `HARD LIMIT EXCEEDED (+${count - 550})`;
    if (count > 500) return `Exceeds recommended (+${count - 500})`;
    if (count > 450) return `Approaching limit (${500 - count} remaining)`;
    return `Good size`;
  };

  const severity = getSeverity(lineCount);

  return (
    <IndicatorContainer severity={severity}>
      {getIcon(severity)}
      <LineCount>{lineCount}</LineCount>
      <Separator>/</Separator>
      <span>500 lines</span>
      {showDetails && (
        <>
          <Separator>•</Separator>
          <Message>{getMessage(lineCount)}</Message>
        </>
      )}
    </IndicatorContainer>
  );
};

/**
 * Compact version for status bar
 */
export const CompactLineCountIndicator = ({ lineCount }: { lineCount: number }) => {
  const getColor = (count: number): string => {
    if (count > 550) return '#ef4444';
    if (count > 500) return '#fb923c';
    if (count > 450) return '#f59e0b';
    return '#10b981';
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '12px',
      color: getColor(lineCount),
      fontVariantNumeric: 'tabular-nums'
    }}>
      <FileText size={14} />
      <span>{lineCount}/500</span>
    </div>
  );
};

/**
 * Progress bar version showing visual progress toward limit
 */
export const LineCountProgressBar = ({ lineCount }: { lineCount: number }) => {
  const percentage = Math.min((lineCount / 500) * 100, 100);
  const overLimit = lineCount > 500;

  const getBarColor = (): string => {
    if (lineCount > 550) return '#ef4444';
    if (lineCount > 500) return '#fb923c';
    if (lineCount > 450) return '#f59e0b';
    return '#10b981';
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      width: '100%'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '11px',
        color: vibeTheme.colors.textSecondary
      }}>
        <span>Lines: {lineCount}</span>
        <span>Target: 500</span>
      </div>
      <div style={{
        width: '100%',
        height: '6px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '3px',
        overflow: 'hidden',
        position: 'relative'
      }}>
        <div style={{
          width: `${percentage}%`,
          height: '100%',
          background: getBarColor(),
          transition: 'all 0.3s ease'
        }} />
        {overLimit && (
          <div style={{
            position: 'absolute',
            left: '100%',
            transform: 'translateX(-50%) translateY(-50%)',
            top: '50%',
            width: '2px',
            height: '10px',
            background: '#fff',
            opacity: 0.5
          }} />
        )}
      </div>
    </div>
  );
};
