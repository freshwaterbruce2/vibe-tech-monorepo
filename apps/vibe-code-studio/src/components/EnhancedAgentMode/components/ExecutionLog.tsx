/**
 * ExecutionLog Component
 * Virtualized log display for performance with large log volumes
 * No manual memoization needed - React 19 handles optimization
 */
import { Users } from 'lucide-react';
import { useEffect, useRef, type CSSProperties } from 'react';
import { LogEntryStyled, ExecutionLog as StyledExecutionLog } from '../styled';
import type { LogEntry } from '../types';

/** Props for the ExecutionLog component */
export interface ExecutionLogProps {
  /** Array of log entries to display */
  readonly logs: readonly LogEntry[];
  /** Function to format timestamps */
  readonly formatTimestamp: (date: Date) => string;
  /** Whether to enable virtualization (default: true for > 100 logs) */
  readonly enableVirtualization?: boolean;
  /** Height for the log container (default: 400) */
  readonly height?: number;
  /** Callback when a log entry is clicked */
  readonly onLogClick?: (log: LogEntry) => void;
}

/** Individual log entry component */
interface LogEntryProps {
  log: LogEntry;
  formatTimestamp: (date: Date) => string;
  onClick?: () => void;
  style?: CSSProperties;
}

/**
 * Renders a single log entry with appropriate styling and animations.
 * Extracted for use in both virtualized and non-virtualized modes.
 */
function LogEntryItem({
  log,
  formatTimestamp,
  onClick,
  style
}: LogEntryProps) {
  return (
    <LogEntryStyled
      $type={log.type}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      style={style}
      role="listitem"
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      <span className="timestamp">{formatTimestamp(log.timestamp)}</span>
      <span className="content">
        {log.agentName && (
          <span className="agent-name">
            <Users size={12} style={{ display: 'inline', marginRight: '4px' }} />
            {log.agentName}:{' '}
          </span>
        )}
        {log.content}
        {log.metrics && (
          <span className="performance-metric">
            (
            {log.metrics.confidence ? `${Math.round(log.metrics.confidence * 100)}% confidence` : ''}
            {log.metrics.processingTime ? `, ${log.metrics.processingTime}ms` : ''}
            {log.metrics.suggestions ? `, ${log.metrics.suggestions} suggestions` : ''}
            )
          </span>
        )}
      </span>
    </LogEntryStyled>
  );
}

/**
 * Displays execution logs with optional virtualization for performance.
 * Note: Virtualization temporarily disabled due to react-window v2 type issues.
 *
 * @param props - Component props
 * @returns Log display component
 */
export function ExecutionLog({
  logs,
  formatTimestamp,
  onLogClick
}: ExecutionLogProps) {
  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs are added
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  return (
    <StyledExecutionLog role="list" aria-label="Execution logs">
      {logs.map((log) => (
        <LogEntryItem
          key={log.id}
          log={log}
          formatTimestamp={formatTimestamp}
          onClick={onLogClick ? () => onLogClick(log) : undefined}
        />
      ))}
      <div ref={logEndRef} />
    </StyledExecutionLog>
  );
}

export default ExecutionLog;
