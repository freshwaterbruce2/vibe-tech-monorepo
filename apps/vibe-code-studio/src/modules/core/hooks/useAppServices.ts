import { useEffect, useRef, useState } from 'react';
import { unifiedAI } from '../../../services/ai/UnifiedAIService';
import { logger } from '../../../services/Logger';
import { FileSystemService } from '../../../services/FileSystemService';
import { WorkspaceService } from '../../../services/WorkspaceService';
import { GitService } from '../../../services/GitService';
import { TaskPlanner } from '../../../services/ai/TaskPlanner';
import { ExecutionEngine } from '../../../services/ai/ExecutionEngine';
import { liveEditorStream } from '../../../services/LiveEditorStream';
import type { BackgroundAgentSystem } from '../../../services/BackgroundAgentSystem';
import { AgentOrchestrator } from '../../../services/specialized-agents/AgentOrchestrator';
import { AgentPerformanceOptimizer } from '../../../services/AgentPerformanceOptimizer';

const multiFileEditor: Record<string, never> = {};
const backgroundAgentSystem = {
  on: () => {},
  off: () => {},
  submit: () => "mock-id",
} as unknown as BackgroundAgentSystem;

export function useAppServices() {
  const [isAIReady, setIsAIReady] = useState(false);
  const [serviceError, setServiceError] = useState<string | null>(null);

  // Initialize real service instances
  const fileSystemServiceRef = useRef<FileSystemService | null>(null);
  if (!fileSystemServiceRef.current) {
    fileSystemServiceRef.current = new FileSystemService();
  }

  const workspaceServiceRef = useRef<WorkspaceService | null>(null);
  if (!workspaceServiceRef.current) {
    workspaceServiceRef.current = new WorkspaceService();
  }

  const gitServiceRef = useRef<GitService | null>(null);
  if (!gitServiceRef.current) {
    gitServiceRef.current = new GitService('/');
  }

  const fileSystemService = fileSystemServiceRef.current!;
  const workspaceService = workspaceServiceRef.current!;
  const gitService = gitServiceRef.current!;

  // Initialize agent services (depend on other services)
  const taskPlannerRef = useRef<TaskPlanner | null>(null);
  if (!taskPlannerRef.current) {
    taskPlannerRef.current = new TaskPlanner(unifiedAI, fileSystemService);
  }

  const executionEngineRef = useRef<ExecutionEngine | null>(null);
  if (!executionEngineRef.current) {
    executionEngineRef.current = new ExecutionEngine(fileSystemService, unifiedAI, workspaceService, gitService);
  }

  // Multi-agent orchestrator — agents use UnifiedAIService internally
  const orchestratorRef = useRef<AgentOrchestrator | null>(null);
  if (!orchestratorRef.current) {
    orchestratorRef.current = new AgentOrchestrator();
  }

  const performanceOptimizerRef = useRef<AgentPerformanceOptimizer | null>(null);
  if (!performanceOptimizerRef.current) {
    performanceOptimizerRef.current = new AgentPerformanceOptimizer();
  }

  useEffect(() => {
    const initServices = async () => {
      try {
        await unifiedAI.initialize();
        setIsAIReady(true);
        logger.info('Vibe AI Services Initialized');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to initialize AI services';
        setServiceError(message);
        console.error('AI Init Failed', err);
      }
    };

    initServices();
  }, []);

  return {
    isAIReady,
    serviceError,
    aiService: unifiedAI,
    fileSystemService,
    workspaceService,
    gitService,
    taskPlanner: taskPlannerRef.current!,
    executionEngine: executionEngineRef.current!,
    liveStream: liveEditorStream,
    orchestrator: orchestratorRef.current!,
    performanceOptimizer: performanceOptimizerRef.current!,
    multiFileEditor,
    backgroundAgentSystem,
  };
}
