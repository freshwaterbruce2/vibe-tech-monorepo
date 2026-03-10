import type { SystemMetrics } from '@/hooks/dashboard/types';
import { Activity, Clock, MemoryStick } from 'lucide-react';
import DashboardMetricCard from './DashboardMetricCard';

export interface DashboardMetricsProps {
  metrics: SystemMetrics;
}

const DashboardMetrics = ({ metrics }: DashboardMetricsProps) => {
  return (
    <>
      <DashboardMetricCard
        title="Active Contexts"
        value={metrics.activeContexts}
        description="contexts loaded"
        icon={Activity}
      />
      <DashboardMetricCard
        title="Tasks Completed"
        value={metrics.tasksCompleted}
        description="total tasks"
        icon={Activity}
      />
      <DashboardMetricCard
        title="System Uptime"
        value={metrics.uptime}
        description="running time"
        icon={Clock}
      />
      <DashboardMetricCard
        title="Memory Usage"
        value={metrics.memoryUsage}
        description={`CPU: ${metrics.cpuUsage}`}
        icon={MemoryStick}
      />
    </>
  );
};

export default DashboardMetrics;
