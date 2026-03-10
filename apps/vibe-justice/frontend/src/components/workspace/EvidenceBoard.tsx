import { FileText, Globe, LayoutGrid, LucideIcon, MoreHorizontal, Search } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ExportButton } from '../common/ExportButton';
import { EvidenceUpload } from '../tabs/evidence/EvidenceUpload';
import { AnalysisPanel } from './AnalysisPanel';

interface TabButtonProps {
  label: string;
  icon: LucideIcon;
  active?: boolean;
}

function TabButton({ label, icon: Icon, active }: TabButtonProps) {
  return (
    <button
      className={cn(
        "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2",
        active
          ? "text-neon-mint border-neon-mint bg-neon-mint/5"
          : "text-gray-500 border-transparent hover:text-gray-300 hover:bg-white/5"
      )}
      aria-label={`Switch to ${label} tab`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

export function EvidenceBoard() {
  // Mock Data for Export
  const evidenceData = [
    {
      title: "Twitter/X: Account Activity Spike Detected",
      source: "Social Media",
      timestamp: "2m ago",
      content: "User '@shadow_broker' posted 14 times in the last hour. Correlation with keyword 'Project Nova' found in 3 tweets."
    },
    {
      title: "Corporate Filing: Shell Company Match",
      source: "Public Records",
      timestamp: "15m ago",
      content: "A new LLC was registered in Delaware matching the suspect's known alias. Address resolves to a PO Box in Reno, NV."
    }
  ];

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a]">
      {/* Header / Tabs */}
      <div className="flex items-center border-b border-white/10 px-2 bg-void-black/20">
         <TabButton label="Live Results" icon={LayoutGrid} active />
         <TabButton label="Extracted Facts" icon={FileText} />
         <TabButton label="Documents" icon={Globe} />

         <div className="ml-auto flex items-center gap-2 p-2">
           <EvidenceUpload caseId="CASE-2024-001" />
           <div className="h-4 w-px bg-white/10 mx-1" />
           <ExportButton
             title="Vibe Justice Evidence Report"
             data={evidenceData}
             filename="case_evidence"
             caseId="CASE-2024-001"
           />
           <div className="h-4 w-px bg-white/10 mx-1" />
           <button
             className="p-2 text-gray-400 hover:text-white rounded-md hover:bg-white/10"
             title="Search"
             aria-label="Search"
           >
             <Search className="w-4 h-4" />
           </button>
           <button
             className="p-2 text-gray-400 hover:text-white rounded-md hover:bg-white/10"
             title="More Options"
             aria-label="More Options"
           >
             <MoreHorizontal className="w-4 h-4" />
           </button>
         </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1 */}
          <div className="group relative p-4 bg-void-black border border-white/5 hover:border-neon-mint/30 rounded-lg transition-all hover:shadow-[0_0_20px_rgba(0,255,157,0.1)]">
             <div className="flex justify-between items-start mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] bg-electric-violet/10 text-electric-violet font-mono uppercase">
                  Social Media
                </span>
                <span className="text-[10px] text-gray-600 font-mono">2m ago</span>
             </div>
             <h3 className="text-sm font-bold text-gray-200 mb-2 leading-snug group-hover:text-neon-mint transition-colors">
               Twitter/X: Account Activity Spike Detected
             </h3>
             <p className="text-xs text-gray-400 line-clamp-3">
               User '@shadow_broker' posted 14 times in the last hour. Correlation with keyword "Project Nova" found in 3 tweets.
             </p>
             <div className="mt-4 flex items-center gap-2">
               <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
                 <div className="h-full w-3/4 bg-red-500/50" />
               </div>
               <span className="text-[10px] text-red-400 font-mono">HIGH RELEVANCE</span>
             </div>
          </div>

          {/* Card 2 */}
          <div className="group relative p-4 bg-void-black border border-white/5 hover:border-neon-mint/30 rounded-lg transition-all hover:shadow-[0_0_20px_rgba(0,255,157,0.1)]">
             <div className="flex justify-between items-start mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] bg-neon-mint/10 text-neon-mint font-mono uppercase">
                  Public Records
                </span>
                <span className="text-[10px] text-gray-600 font-mono">15m ago</span>
             </div>
             <h3 className="text-sm font-bold text-gray-200 mb-2 leading-snug group-hover:text-neon-mint transition-colors">
               Corporate Filing: Shell Company Match
             </h3>
             <p className="text-xs text-gray-400 line-clamp-3">
               A new LLC was registered in Delaware matching the suspect's known alias. Address resolves to a PO Box in Reno, NV.
             </p>
          </div>

          {/* Card 3 - AI Analysis */}
          <div className="md:col-span-1 min-h-[250px]">
             <AnalysisPanel caseId="CASE-2024-001" />
          </div>
        </div>
      </div>
    </div>
  );
}
