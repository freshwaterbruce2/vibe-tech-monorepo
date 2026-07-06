/**
 * useTestExplorerCommands — palette entries for spec 08 Test Explorer.
 * Consumed by useAICommandPalette.
 * Spec: FEATURE_SPECS/competitive-gaps/08-TEST-EXPLORER.md
 */
import { FlaskConical } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTestExplorerStore } from '../stores/testExplorerStore';

export interface TestExplorerCommand {
  id: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  shortcut?: string;
  action: () => void;
  category?: string;
  keywords?: string[];
}

export const useTestExplorerCommands = (): TestExplorerCommand[] => [
  {
    id: 'tests-open-explorer',
    title: 'Tests: Open Test Explorer',
    description: 'Discover and run workspace tests from a tree view',
    icon: <FlaskConical size={18} />,
    action: () => useTestExplorerStore.getState().actions.setPanelOpen(true),
    category: 'Testing',
    keywords: ['test', 'tests', 'explorer', 'vitest', 'run'],
  },
  {
    id: 'view-toggle-test-explorer',
    title: 'View: Toggle Test Explorer',
    icon: <FlaskConical size={18} />,
    action: () => useTestExplorerStore.getState().actions.togglePanel(),
    category: 'View',
    keywords: ['tests', 'panel', 'toggle'],
  },
];
