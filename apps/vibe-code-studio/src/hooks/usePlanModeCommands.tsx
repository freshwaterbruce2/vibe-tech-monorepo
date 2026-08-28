/**
 * usePlanModeCommands — command-palette entries for spec 05 Plan Mode:
 * open the plan dialog and jump to recorded plans (Artifacts panel).
 * Consumed by useAICommandPalette, same pattern as useScheduleCommands.
 * Spec: FEATURE_SPECS/competitive-gaps/05-PLAN-MODE.md
 */
import { ClipboardList, Map as MapIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useArtifactsStore } from '../stores/artifactsStore';
import { usePlanModeStore } from '../stores/planModeStore';

export interface PlanModeCommand {
  id: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  shortcut?: string;
  action: () => void;
  category?: string;
  keywords?: string[];
}

export const usePlanModeCommands = (): PlanModeCommand[] => [
  {
    id: 'plan-mode-create',
    title: 'Plan: Create Plan (/plan)',
    description: 'Research the workspace and write a reviewable plan before any edits',
    icon: <MapIcon size={18} />,
    action: () => usePlanModeStore.getState().actions.setDialogOpen(true),
    category: 'Agent',
    keywords: ['plan', 'planning', 'research', 'blueprint', 'design'],
  },
  {
    id: 'plan-mode-view-plans',
    title: 'Plan: View Plans',
    description: 'Open the Artifacts panel where plan documents are recorded',
    icon: <ClipboardList size={18} />,
    action: () => useArtifactsStore.getState().actions.setPanelOpen(true),
    category: 'Agent',
    keywords: ['plans', 'artifacts', 'history', 'review'],
  },
];
