/**
 * Agent Mode - Autonomous coding interface inspired by Cursor's Agent Mode
 */
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence,motion } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle,
  Code,
  FileText,
  Loader2,
  Play,
  Square,
  Zap,
} from 'lucide-react';

interface AgentModeProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (task: string) => void;
  workspaceContext?: {
    workspaceFolder: string;
    currentFile?: string;
    openFiles?: string[];
  };
}

import {
  Backdrop,
  Container,
  Header,
  Title,
  StatusIndicator,
  Content,
  TaskInput,
  TaskTextarea,
  ExecutionLog,
  LogEntry,
  StepIndicator,
  Footer,
  ActionButton,
  ContextInfo
} from './AgentMode.styles';

interface LogEntry {
  id: string;
  type: 'info' | 'action' | 'success' | 'error';
  timestamp: Date;
  content: string;
}

const AgentMode = ({
  isOpen,
  onClose,
  onComplete,
  workspaceContext,
}: AgentModeProps) => {
  const [task, setTask] = useState('');
  const [status, setStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (type: LogEntry['type'], content: string) => {
    setLogs(prev => [...prev, {
      id: Date.now().toString(),
      type,
      timestamp: new Date(),
      content,
    }]);
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const executeTask = async () => {
    if (!task.trim()) {return;}

    setStatus('running');
    setLogs([]);
    setCurrentStep(0);
    setTotalSteps(0);

    addLog('info', `Starting autonomous task: "${task}"`);
    addLog('info', `Workspace: ${workspaceContext?.workspaceFolder ?? 'No workspace'}`);

    try {
      // Simulate task analysis
      await new Promise(resolve => setTimeout(resolve, 1000));
      addLog('action', '🔍 Analyzing task requirements...');
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      setTotalSteps(5);
      addLog('info', 'Task breakdown: 5 steps identified');

      // Simulate step execution
      const steps = [
        'Setting up environment',
        'Analyzing code structure',
        'Implementing changes',
        'Running tests',
        'Finalizing and cleanup',
      ];

      for (let i = 0; i < steps.length; i++) {
        setCurrentStep(i + 1);
        await new Promise(resolve => setTimeout(resolve, 2000));
        addLog('action', `Step ${i + 1}/${steps.length}: ${steps[i]}`);
        
        // Simulate sub-actions
        if (i === 2) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          addLog('info', '  → Created new component structure');
          await new Promise(resolve => setTimeout(resolve, 1000));
          addLog('info', '  → Updated imports and exports');
        }
      }

      setStatus('completed');
      addLog('success', '✅ Task completed successfully!');
      
      // Call onComplete callback
      setTimeout(() => {
        onComplete(task);
      }, 1500);

    } catch (error) {
      setStatus('error');
      addLog('error', `❌ Task failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleStop = () => {
    setStatus('idle');
    addLog('info', 'Task execution stopped by user');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Backdrop
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
        >
          <Container
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
          <Header>
            <Title>
              <Zap />
              Agent Mode
            </Title>
            <StatusIndicator $status={status}>
              {status === 'running' && (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Loader2 size={14} />
                  </motion.div>
                  Running
                </>
              )}
              {status === 'completed' && (
                <>
                  <CheckCircle size={14} />
                  Completed
                </>
              )}
              {status === 'error' && (
                <>
                  <AlertCircle size={14} />
                  Error
                </>
              )}
              {status === 'idle' && 'Ready'}
            </StatusIndicator>
          </Header>

          <Content>
            <TaskInput>
              <TaskTextarea
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="Describe what you want me to build or fix..."
                disabled={status === 'running'}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    executeTask();
                  }
                }}
              />
            </TaskInput>

            {workspaceContext && (
              <ContextInfo>
                <div className="context-item">
                  <FileText />
                  {workspaceContext.workspaceFolder}
                </div>
                {workspaceContext.currentFile && (
                  <div className="context-item">
                    <Code />
                    {workspaceContext.currentFile}
                  </div>
                )}
              </ContextInfo>
            )}

            <ExecutionLog>
              {logs.map((log, index) => (
                <LogEntry
                  key={log.id}
                  $type={log.type}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <span className="timestamp">{formatTimestamp(log.timestamp)}</span>
                  <span className="content">{log.content}</span>
                </LogEntry>
              ))}
              
              {status === 'running' && totalSteps > 0 && (
                <StepIndicator>
                  <div className="step-number">{currentStep}</div>
                  <div className="step-description">
                    Processing step {currentStep} of {totalSteps}
                  </div>
                  <div className="step-status">
                    {Math.round((currentStep / totalSteps) * 100)}% complete
                  </div>
                </StepIndicator>
              )}
              
              <div ref={logEndRef} />
            </ExecutionLog>
          </Content>

          <Footer>
            <div style={{ display: 'flex', gap: '8px' }}>
              {status === 'idle' && (
                <ActionButton
                  $variant="primary"
                  onClick={executeTask}
                  disabled={!task.trim()}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Play size={16} />
                  Start Task
                </ActionButton>
              )}
              
              {status === 'running' && (
                <ActionButton
                  $variant="danger"
                  onClick={handleStop}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Square size={16} />
                  Stop
                </ActionButton>
              )}
              
              {(status === 'completed' || status === 'error') && (
                <ActionButton
                  $variant="primary"
                  onClick={() => {
                    setStatus('idle');
                    setLogs([]);
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Reset
                </ActionButton>
              )}
            </div>
            
            <ActionButton
              onClick={onClose}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Close
            </ActionButton>
          </Footer>
          </Container>
        </Backdrop>
      )}
    </AnimatePresence>
  );
};

export default AgentMode;