/**
 * useAgentsMdCommands — command-palette entries for AGENTS.md "Commands"
 * fenced blocks (spec 03 AC #11): run/cancel each parsed command through the
 * spec-02 task runner, mirroring useTaskCommands. Reloads when the workspace
 * changes or the standards settings toggles flip (AC #10). Consumed by
 * useAICommandPalette.
 * Spec: FEATURE_SPECS/competitive-gaps/03-OPEN-AGENT-STANDARDS.md
 */
import { Play, Square } from 'lucide-react';
import { useEffect, useState } from 'react';
import { subscribeStandardsSettings } from '../services/ai/standards/standardsSettings';
import { type AgentsMdCommand, agentsMdCommandLabel } from '../services/tasks/agentsMdCommands';
import {
  cancelWorkspaceTask,
  loadAgentsMdCommands,
  runAgentsMdCommand,
} from '../services/tasks/taskRunnerIntegration';
import { useEditorStore } from '../stores/useEditorStore';
import { useTasksStore } from '../stores/tasksStore';
import { type TaskCommand, startTaskSafely } from './useTaskCommands';

export const useAgentsMdCommands = (): TaskCommand[] => {
  const workspaceFolder = useEditorStore(state => state.workspaceFolder);
  const running = useTasksStore(state => state.running);
  const [commands, setCommands] = useState<AgentsMdCommand[]>([]);

  useEffect(() => {
    if (!workspaceFolder) {
      // No sync setState here (react-hooks/set-state-in-effect): the render
      // path below already returns [] whenever workspaceFolder is null.
      return;
    }
    let cancelled = false;
    const reload = (): void => {
      void loadAgentsMdCommands(workspaceFolder).then(loaded => {
        if (!cancelled) {
          setCommands(loaded);
        }
      });
    };
    reload();
    const unsubscribe = subscribeStandardsSettings(reload);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [workspaceFolder]);

  if (!workspaceFolder) {
    return [];
  }

  return commands.map(command => {
    const label = agentsMdCommandLabel(command);
    if (running[label]) {
      return {
        id: `agents-md-cancel-${command.id}`,
        title: `AGENTS.md: Cancel "${command.command}"`,
        description: 'Stop the running command',
        icon: <Square size={18} />,
        action: () => {
          cancelWorkspaceTask(label);
        },
        category: 'Tasks',
        keywords: ['agents.md', 'command', 'cancel', 'stop', command.command],
      };
    }
    return {
      id: `agents-md-run-${command.id}`,
      title: `AGENTS.md: Run "${command.command}"`,
      description: `From ${command.sourcePath}`,
      icon: <Play size={18} />,
      action: () => startTaskSafely(() => runAgentsMdCommand(command, workspaceFolder), label),
      category: 'Tasks',
      keywords: ['agents.md', 'command', 'run', command.command],
    };
  });
};
