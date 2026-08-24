import { useEffect, useMemo, useState } from 'react';
import { unifiedAI } from '../../../services/ai/UnifiedAIService';
import { useAIStore } from '../../../stores/useAIStore';
import { useEditorStore } from '../../../stores/useEditorStore';
import { logger } from '../../../services/Logger';
import { FileSystemService } from '../../../services/FileSystemService';
import { WorkspaceService } from '../../../services/WorkspaceService';
import { GitService } from '../../../services/GitService';
import { TaskPlanner } from '../../../services/ai/TaskPlanner';
import { TaskPersistence } from '../../../services/ai/TaskPersistence';
import { ExecutionEngine } from '../../../services/ai/ExecutionEngine';
import { AgentRuntime } from '../../../services/agent-runtime/AgentRuntime';
import { liveEditorStream } from '../../../services/LiveEditorStream';
import { BackgroundAgentSystem } from '../../../services/BackgroundAgentSystem';
import { AgentOrchestrator } from '../../../services/specialized-agents/AgentOrchestrator';
import { AgentPerformanceOptimizer } from '../../../services/AgentPerformanceOptimizer';
import { MultiFileEditor } from '../../../services/MultiFileEditor';

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
  const taskPersistence = useMemo(
    () => new TaskPersistence(fileSystemService),
    [fileSystemService]
  );
  const executionEngine = useMemo(
    () =>
      new ExecutionEngine(
        fileSystemService,
        unifiedAI,
        workspaceService,
        gitService,
        taskPersistence
      ),
    [fileSystemService, workspaceService, gitService, taskPersistence]
  );
  const agentRuntime = useMemo(
    () => new AgentRuntime(taskPlanner, executionEngine, taskPersistence),
    [taskPlanner, executionEngine, taskPersistence]
  );

  // Background agent system — runs real agent tasks off the UI thread via the
  // execution engine + task planner. Single stable instance per hook lifetime.
  const backgroundAgentSystem = useMemo(
    () => new BackgroundAgentSystem(executionEngine, taskPlanner),
    [executionEngine, taskPlanner]
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

  // Keep UnifiedAIService aligned with the user's selected model. The selection
  // is owned by the persisted AI store (localStorage via zustand persist).
  // Without this, the service kept its hardcoded default and ignored the user's
  // saved choice. Apply the hydrated selection on mount, then subscribe so later
  // changes (model picker, settings) reach every AI request.
  useEffect(() => {
    unifiedAI.setModel(useAIStore.getState().currentModel);
    unifiedAI.setReasoningEffort(useEditorStore.getState().settings.reasoningEffort ?? 'medium');

    const unsubscribeModel = useAIStore.subscribe((state, prevState) => {
      if (state.currentModel !== prevState.currentModel) {
        unifiedAI.setModel(state.currentModel);
      }
    });
    const unsubscribeEffort = useEditorStore.subscribe((state, prevState) => {
      if (state.settings.reasoningEffort !== prevState.settings.reasoningEffort) {
        unifiedAI.setReasoningEffort(state.settings.reasoningEffort ?? 'medium');
      }
    });
    return () => {
      unsubscribeModel();
      unsubscribeEffort();
    };
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
    agentRuntime,
    liveStream: liveEditorStream,
    orchestrator,
    performanceOptimizer,
    multiFileEditor,
    backgroundAgentSystem,
  };
}
