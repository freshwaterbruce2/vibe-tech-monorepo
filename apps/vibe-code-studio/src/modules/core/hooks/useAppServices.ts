import { useEffect, useMemo, useState } from 'react';
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
import { MultiFileEditor } from '../../../services/MultiFileEditor';

const backgroundAgentSystem = {
  on: () => {},
  off: () => {},
  submit: () => "mock-id",
} as unknown as BackgroundAgentSystem;

export function useAppServices() {
  const [isAIReady, setIsAIReady] = useState(false);
  const [serviceError, setServiceError] = useState<string | null>(null);

  // Stable service singletons — useMemo keeps each instance render-safe (no ref
  // `.current` access during render) while creating it exactly once per hook lifetime.
  const fileSystemService = useMemo(() => new FileSystemService(), []);
  const workspaceService = useMemo(() => new WorkspaceService(), []);
  const gitService = useMemo(() => new GitService('/'), []);

  // Agent services depend on the base services above.
  const taskPlanner = useMemo(
    () => new TaskPlanner(unifiedAI, fileSystemService),
    [fileSystemService]
  );
  const executionEngine = useMemo(
    () => new ExecutionEngine(fileSystemService, unifiedAI, workspaceService, gitService),
    [fileSystemService, workspaceService, gitService]
  );

  // Multi-agent orchestrator — agents use UnifiedAIService internally.
  const orchestrator = useMemo(() => new AgentOrchestrator(), []);
  const performanceOptimizer = useMemo(() => new AgentPerformanceOptimizer(), []);

  // Multi-file editor — coordinates atomic multi-file changes with backup/rollback.
  const multiFileEditor = useMemo(
    () => new MultiFileEditor(unifiedAI, fileSystemService),
    [fileSystemService]
  );

  useEffect(() => {
    const initServices = async () => {
      try {
        await unifiedAI.initialize();
        setIsAIReady(true);
        logger.info('Vibe AI Services Initialized');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to initialize AI services';
        setServiceError(message);
        logger.error('AI Init Failed', err);
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
    taskPlanner,
    executionEngine,
    liveStream: liveEditorStream,
    orchestrator,
    performanceOptimizer,
    multiFileEditor,
    backgroundAgentSystem,
  };
}
