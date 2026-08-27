/**
 * useScheduleCommands — command-palette entries for agent scheduling: the
 * /schedule entry point (opens the Schedule panel) and a panel toggle.
 * Consumed by useAICommandPalette, same pattern as useTaskCommands.
 * Spec: FEATURE_SPECS/competitive-gaps/16-AGENT-SCHEDULING.md
 */
import { CalendarClock } from 'lucide-react';
import type { ReactNode } from 'react';
import { useSchedulesStore } from '../stores/schedulesStore';

export interface ScheduleCommand {
  id: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  shortcut?: string;
  action: () => void;
  category?: string;
  keywords?: string[];
}

export const useScheduleCommands = (): ScheduleCommand[] => [
  {
    id: 'schedule-agent-task',
    title: 'Schedule: New Agent Task (/schedule)',
    description: 'Run an agent task later or on a recurring cadence',
    icon: <CalendarClock size={18} />,
    action: () => useSchedulesStore.getState().actions.setPanelOpen(true),
    category: 'Agent',
    keywords: ['schedule', 'cron', 'recurring', 'later', 'agent', 'task'],
  },
  {
    id: 'view-toggle-schedules',
    title: 'View: Toggle Scheduled Tasks',
    description: 'Show/hide the Schedule panel',
    icon: <CalendarClock size={18} />,
    action: () => useSchedulesStore.getState().actions.togglePanel(),
    category: 'View',
    keywords: ['schedules', 'scheduled', 'panel', 'agenda'],
  },
];
