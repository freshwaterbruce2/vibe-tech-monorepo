/**
 * Enhanced Agent Mode Component
 * Multi-agent coordination interface with real-time feedback and performance monitoring
 */
import { AnimatePresence } from 'framer-motion';
import { Activity, Play, Square, Zap } from 'lucide-react';
import React, { useState } from 'react';

import {
  ActionButton,
  ActionButtonGroup,
  AgentCountText,
  Backdrop,
  Container,
  Footer,
  Header,
  MainContent,
  ProgressIndicator,
  Sidebar,
  StatusIndicator,
  StatusSection,
  TaskInput,
  TaskSection,
  TaskTextarea,
  Title,
} from './styled';
import type { EnhancedAgentModeProps } from './types';
import { useAgentTask } from './useAgentTask';
import { AgentPanel, ContextPanel, ExecutionLog, PerformancePanel, StatusIcon } from './components';

export function EnhancedAgentMode({
  isOpen,
  onClose,
  onComplete,
  orchestrator,
  performanceOptimizer,
  workspaceContext,
  currentModel,
}: EnhancedAgentModeProps): React.ReactElement | null {
  const {
    task,
    setTask,
    status,
    logs,
    activeAgents,
    agentProfiles,
    expandedSections,
    currentProgress,
    logEndRef,
    executeTask,
    retryTask,
    canRetry,
    handleStop,
    resetTask,
    toggleSection,
    formatTimestamp,
    availableAgents,
    performanceReport,
  } = useAgentTask({
    orchestrator,
    performanceOptimizer,
    workspaceContext,
    onComplete,
  });

  // Selected log entry for the detail view (toggled by clicking a log row)
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const selectedLog = logs.find(entry => entry.id === selectedLogId) ?? null;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <Backdrop
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={e => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <Container
          initial={{ opacity: 0, scale: 0.9, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 50 }}
          transition={{ duration: 0.3, type: 'spring', damping: 25 }}
          onClick={e => e.stopPropagation()}
        >
          <Header>
            <Title>
              <Zap />
              Enhanced Multi-Agent Mode
            </Title>
            <StatusSection>
              <StatusIndicator $status={status}>
                <StatusIcon status={status} />
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </StatusIndicator>
              <AgentCountText>{availableAgents.length} agents available</AgentCountText>
              <AgentCountText>Model: {currentModel || 'Settings selection'}</AgentCountText>
            </StatusSection>
          </Header>

          <MainContent>
            <TaskSection>
              <TaskInput>
                <TaskTextarea
                  value={task}
                  onChange={e => setTask(e.target.value)}
                  placeholder="Describe what you want the multi-agent system to analyze, build, or optimize..."
                  disabled={status !== 'idle'}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      executeTask();
                    }
                  }}
                  aria-label="Task input"
                  aria-describedby="task-help"
                />
                <span id="task-help" className="sr-only">
                  Press Ctrl+Enter or Cmd+Enter to execute the task
                </span>
                {currentProgress && (
                  <ProgressIndicator>
                    <Activity size={16} className="progress-icon" />
                    <div>
                      <div className="progress-text">{currentProgress}</div>
                      <div className="progress-detail">Multi-agent coordination in progress</div>
                    </div>
                  </ProgressIndicator>
                )}
              </TaskInput>

              <ExecutionLog
                logs={logs}
                formatTimestamp={formatTimestamp}
                height={400}
                onLogClick={log => setSelectedLogId(prev => (prev === log.id ? null : log.id))}
              />
              <div ref={logEndRef} />

              {selectedLog && (
                <div
                  role="region"
                  aria-label="Selected log detail"
                  style={{
                    marginTop: 8,
                    padding: '10px 12px',
                    border: '1px solid #3c3c3c',
                    borderRadius: 6,
                    background: '#1e1e1e',
                    color: '#cccccc',
                    fontSize: 12,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 6,
                    }}
                  >
                    <strong style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {selectedLog.type}
                      {selectedLog.agentName ? ` · ${selectedLog.agentName}` : ''}
                    </strong>
                    <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ opacity: 0.7 }}>{formatTimestamp(selectedLog.timestamp)}</span>
                      <button
                        type="button"
                        onClick={() => {
                          void navigator.clipboard?.writeText(selectedLog.content);
                        }}
                        aria-label="Copy log message"
                        style={{
                          background: 'transparent',
                          border: '1px solid #3c3c3c',
                          borderRadius: 4,
                          color: '#cccccc',
                          cursor: 'pointer',
                          fontSize: 11,
                          padding: '2px 8px',
                        }}
                      >
                        Copy
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedLogId(null)}
                        aria-label="Close log detail"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#cccccc',
                          cursor: 'pointer',
                          fontSize: 14,
                          lineHeight: 1,
                        }}
                      >
                        ×
                      </button>
                    </span>
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      fontFamily: 'inherit',
                    }}
                  >
                    {selectedLog.content}
                  </pre>
                  {selectedLog.metrics && (
                    <div style={{ marginTop: 6, opacity: 0.8 }}>
                      {selectedLog.metrics.confidence != null &&
                        `${Math.round(selectedLog.metrics.confidence * 100)}% confidence`}
                      {selectedLog.metrics.processingTime != null &&
                        ` · ${selectedLog.metrics.processingTime}ms`}
                      {selectedLog.metrics.suggestions != null &&
                        ` · ${selectedLog.metrics.suggestions} suggestions`}
                    </div>
                  )}
                </div>
              )}
            </TaskSection>

            <Sidebar>
              <AgentPanel
                availableAgents={availableAgents}
                activeAgents={activeAgents}
                agentProfiles={agentProfiles}
                isExpanded={expandedSections.includes('agents')}
                onToggle={() => toggleSection('agents')}
              />

              <PerformancePanel
                performanceReport={performanceReport}
                isExpanded={expandedSections.includes('performance')}
                onToggle={() => toggleSection('performance')}
              />

              {workspaceContext && (
                <ContextPanel
                  workspaceContext={workspaceContext}
                  isExpanded={expandedSections.includes('context')}
                  onToggle={() => toggleSection('context')}
                />
              )}
            </Sidebar>
          </MainContent>

          <Footer>
            <ActionButtonGroup>
              {status === 'idle' && (
                <ActionButton
                  $variant="primary"
                  onClick={executeTask}
                  disabled={!task.trim()}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  aria-label="Execute multi-agent task"
                >
                  <Play size={16} /> Execute Multi-Agent Task
                </ActionButton>
              )}

              {['analyzing', 'coordinating', 'executing'].includes(status) && (
                <ActionButton
                  $variant="danger"
                  onClick={handleStop}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  aria-label="Stop execution"
                >
                  <Square size={16} /> Stop Execution
                </ActionButton>
              )}

              {status === 'error' && canRetry && (
                <ActionButton
                  $variant="warning"
                  onClick={retryTask}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  aria-label="Retry failed task"
                >
                  <Zap size={16} /> Retry Task
                </ActionButton>
              )}

              {['completed', 'error'].includes(status) && (
                <ActionButton
                  $variant="primary"
                  onClick={resetTask}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  aria-label="Start new task"
                >
                  <Zap size={16} /> New Task
                </ActionButton>
              )}
            </ActionButtonGroup>

            <ActionButton
              onClick={onClose}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              aria-label="Close agent mode"
            >
              Close
            </ActionButton>
          </Footer>
        </Container>
      </Backdrop>
    </AnimatePresence>
  );
}

export default EnhancedAgentMode;
