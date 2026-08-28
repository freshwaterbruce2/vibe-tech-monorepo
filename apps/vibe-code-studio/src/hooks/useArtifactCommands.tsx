/**
 * useArtifactCommands — command-palette entries for the Artifacts panel.
 * Consumed by useAICommandPalette, same pattern as useTaskCommands /
 * useScheduleCommands.
 * Spec: FEATURE_SPECS/competitive-gaps/09-VERIFIABLE-ARTIFACTS.md
 */
import { Package } from 'lucide-react';
import type { ReactNode } from 'react';
import { useArtifactsStore } from '../stores/artifactsStore';

export interface ArtifactCommand {
  id: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  shortcut?: string;
  action: () => void;
  category?: string;
  keywords?: string[];
}

export const useArtifactCommands = (): ArtifactCommand[] => [
  {
    id: 'artifacts-open',
    title: 'Artifacts: Open Panel',
    description: 'Review agent task lists, plans, and diffs as artifacts',
    icon: <Package size={18} />,
    action: () => useArtifactsStore.getState().actions.setPanelOpen(true),
    category: 'Agent',
    keywords: ['artifacts', 'review', 'plan', 'diff', 'walkthrough', 'verify'],
  },
  {
    id: 'view-toggle-artifacts',
    title: 'View: Toggle Artifacts',
    description: 'Show/hide the Artifacts panel',
    icon: <Package size={18} />,
    action: () => useArtifactsStore.getState().actions.togglePanel(),
    category: 'View',
    keywords: ['artifacts', 'panel'],
  },
];
