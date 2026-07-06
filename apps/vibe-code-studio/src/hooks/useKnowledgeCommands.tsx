/**
 * useKnowledgeCommands — palette entries for spec 04 Knowledge Items.
 * Consumed by useAICommandPalette.
 * Spec: FEATURE_SPECS/competitive-gaps/04-AGENT-MEMORY-KNOWLEDGE.md
 */
import { BookOpen } from 'lucide-react';
import type { ReactNode } from 'react';
import { useKnowledgeStore } from '../stores/knowledgeStore';

export interface KnowledgeCommand {
  id: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  shortcut?: string;
  action: () => void;
  category?: string;
  keywords?: string[];
}

export const useKnowledgeCommands = (): KnowledgeCommand[] => [
  {
    id: 'knowledge-open-panel',
    title: 'Knowledge: Open Panel',
    description: 'Durable workspace facts injected into agent prompts by relevance',
    icon: <BookOpen size={18} />,
    action: () => useKnowledgeStore.getState().actions.setPanelOpen(true),
    category: 'Agent',
    keywords: ['knowledge', 'memory', 'facts', 'notes', 'items'],
  },
  {
    id: 'knowledge-toggle-panel',
    title: 'View: Toggle Knowledge Panel',
    icon: <BookOpen size={18} />,
    action: () => useKnowledgeStore.getState().actions.togglePanel(),
    category: 'View',
    keywords: ['knowledge', 'panel', 'toggle'],
  },
];
