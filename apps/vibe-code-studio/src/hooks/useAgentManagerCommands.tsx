/**
 * useAgentManagerCommands — palette entries for spec 10 Agent Manager.
 * Consumed by useAICommandPalette.
 * Spec: FEATURE_SPECS/competitive-gaps/10-AGENT-MANAGER-PARALLEL.md
 */
import { Bot } from 'lucide-react';
import type { ReactNode } from 'react';
import { useAgentManagerStore } from '../stores/agentManagerStore';

export interface AgentManagerCommand {
  id: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  shortcut?: string;
  action: () => void;
  category?: string;
  keywords?: string[];
}

export const useAgentManagerCommands = (): AgentManagerCommand[] => [
  {
    id: 'agents-open-manager',
    title: 'Agents: Open Agent Manager',
    description: 'Start, watch, message and cancel background agents',
    icon: <Bot size={18} />,
    action: () => useAgentManagerStore.getState().actions.setPanelOpen(true),
    category: 'Agent',
    keywords: ['agents', 'manager', 'background', 'inbox', 'parallel'],
  },
  {
    id: 'view-toggle-agent-manager',
    title: 'View: Toggle Agent Manager',
    icon: <Bot size={18} />,
    action: () => useAgentManagerStore.getState().actions.togglePanel(),
    category: 'View',
    keywords: ['agents', 'panel', 'toggle'],
  },
];
