import { Activity, Clock, TrendingUp, Users } from 'lucide-react';
import React from 'react';
import { AgentCard } from '../styled';
import { CollapsibleSection } from './CollapsibleSection';

import type { PerformanceProfile } from '../../../services/AgentPerformanceOptimizer';
import type { AgentInfo } from '../types';

interface AgentPanelProps {
  availableAgents: readonly AgentInfo[];
  activeAgents: readonly string[];
  agentProfiles: ReadonlyMap<string, PerformanceProfile>;
  isExpanded: boolean;
  onToggle: () => void;
}

export const AgentPanel = ({
  availableAgents,
  activeAgents,
  agentProfiles,
  isExpanded,
  onToggle,
}: AgentPanelProps) => {
  return (
    <CollapsibleSection
      title="Active Agents"
      icon={<Users />}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      {availableAgents.map((agent) => {
        const isActive = activeAgents.includes(agent.name);
        const profile = agentProfiles.get(agent.name);

        return (
          <AgentCard key={agent.name} $active={isActive}>
            <div className="agent-name">{agent.name}</div>
            <div className="agent-role">{agent.role}</div>
            <div className="agent-metrics">
              <span>
                <Activity size={10} />
                {' '}
                {profile ? Math.round(profile.workloadScore * 100) : 0}%
              </span>
              <span>
                <Clock size={10} />
                {' '}
                {profile ? Math.round(profile.avgResponseTime) : 0}ms
              </span>
              <span>
                <TrendingUp size={10} />
                {' '}
                {profile ? Math.round(profile.cacheHitRate * 100) : 0}%
              </span>
            </div>
          </AgentCard>
        );
      })}
    </CollapsibleSection>
  );
};
