import { Bot, Settings2 } from 'lucide-react';

import type { StatusType } from '../shared/StatusIcon';
import { StatusIcon } from '../shared/StatusIcon';
import { CollapsibleSection } from './CollapsibleSection';

interface Agent {
  id: string;
  name: string;
  role: string;
  status: StatusType;
}

interface AgentPanelProps {
  agents: Agent[];
  activeAgentId: string | null;
  onSelectAgent: (id: string) => void;
  isProcessing: boolean;
}

export const AgentPanel = ({
  agents,
  activeAgentId,
  onSelectAgent,
  isProcessing
}: AgentPanelProps) => {
  return (
    <CollapsibleSection title="Agent Orchestration" icon={<Bot size={16} />}>
      <div className="space-y-2">
        {agents.map(agent => (
          <div
            key={agent.id}
            onClick={() => onSelectAgent(agent.id)}
            className={`p-3 rounded-lg border cursor-pointer transition-all ${
              activeAgentId === agent.id
                ? 'bg-blue-600/10 border-blue-500/50'
                : 'bg-transparent border-white/5 hover:border-white/20'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-sm text-gray-200">{agent.name}</span>
              <StatusIcon status={agent.status} className="w-4 h-4" />
            </div>
            <p className="text-xs text-gray-500">{agent.role}</p>
          </div>
        ))}

        <div className="flex items-center justify-between mt-4 pt-2 border-t border-white/5 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
            {isProcessing ? 'Agents Active' : 'System Idle'}
          </div>
          <button className="hover:text-white transition-colors" aria-label="Open agent settings">
            <Settings2 size={14} />
          </button>
        </div>
      </div>
    </CollapsibleSection>
  );
};
