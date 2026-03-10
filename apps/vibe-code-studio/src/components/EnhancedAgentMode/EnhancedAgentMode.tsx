/**
 * Enhanced Agent Mode Component
 * Multi-agent coordination interface with real-time feedback and performance monitoring
 */
import { AnimatePresence } from 'framer-motion';
import {
    Activity,
    Play,
    Square,
    Zap
} from 'lucide-react';
import React from 'react';

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
    Title
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <Backdrop
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={(e) => {
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
          onClick={(e) => e.stopPropagation()}
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
              <AgentCountText>
                {availableAgents.length} agents available
              </AgentCountText>
            </StatusSection>
          </Header>

          <MainContent>
            <TaskSection>
              <TaskInput>
                <TaskTextarea
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  placeholder="Describe what you want the multi-agent system to analyze, build, or optimize..."
                  disabled={status !== 'idle'}
                  onKeyDown={(e) => {
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
                onLogClick={(log) => {
                  console.log('Log clicked:', log);
                }}
              />
              <div ref={logEndRef} />
            </TaskSection>

            <Sidebar>
              <AgentPanel
                availableAgents={availableAgents}
                activeAgents={activeAgents}
                agentProfiles={agentProfiles}
                isExpanded={expandedSections.has('agents')}
                onToggle={() => toggleSection('agents')}
              />

              <PerformancePanel
                performanceReport={performanceReport}
                isExpanded={expandedSections.has('performance')}
                onToggle={() => toggleSection('performance')}
              />

              {workspaceContext && (
                <ContextPanel
                  workspaceContext={workspaceContext}
                  isExpanded={expandedSections.has('context')}
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
