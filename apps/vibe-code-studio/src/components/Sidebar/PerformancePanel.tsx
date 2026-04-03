import { Activity, Cpu, Zap } from 'lucide-react';
import { CollapsibleSection } from './CollapsibleSection';

interface Metrics {
  tokensUsed: number;
  tokensPerSec: number;
  latencyMs: number;
  costEstimate: number;
}

interface PerformancePanelProps {
  metrics: Metrics;
}

export const PerformancePanel = ({ metrics }: PerformancePanelProps) => {
  return (
    <CollapsibleSection title="System Metrics" icon={<Activity size={16} />}>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-white/5 p-2 rounded">
          <div className="text-gray-500 mb-1 flex items-center gap-1">
            <Zap size={10} /> Tokens
          </div>
          <div className="font-mono text-blue-300">{metrics.tokensUsed.toLocaleString()}</div>
        </div>
        <div className="bg-white/5 p-2 rounded">
          <div className="text-gray-500 mb-1 flex items-center gap-1">
            <Cpu size={10} /> Speed
          </div>
          <div className="font-mono text-green-300">{metrics.tokensPerSec} t/s</div>
        </div>
        <div className="bg-white/5 p-2 rounded col-span-2 flex justify-between items-center">
          <span className="text-gray-500">Latency</span>
          <span className="font-mono text-orange-300">{metrics.latencyMs}ms</span>
        </div>
      </div>
    </CollapsibleSection>
  );
};
