import { useState } from 'react';
import { LayoutDashboard, ListTree, Users2, DollarSign, PenTool } from 'lucide-react';
import { Overview } from './sections/Overview';
import { CoreFeatures } from './sections/CoreFeatures';
import { TargetAudience } from './sections/TargetAudience';
import { Monetization } from './sections/Monetization';

export function PRDDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'features', label: 'Core Capabilities', icon: <ListTree className="w-4 h-4" /> },
    { id: 'audience', label: 'Market Segments', icon: <Users2 className="w-4 h-4" /> },
    { id: 'monetization', label: 'Monetization', icon: <DollarSign className="w-4 h-4" /> },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'overview': return <Overview />;
      case 'features': return <CoreFeatures />;
      case 'audience': return <TargetAudience />;
      case 'monetization': return <Monetization />;
      default: return <Overview />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F0F0F0] font-sans flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-[#0A0A0A] border-r border-[#333] shrink-0 md:h-screen sticky top-0 flex flex-col">
        <div className="p-6 border-b border-[#333] flex items-center gap-3">
          <div className="w-8 h-8 flex items-center justify-center text-[#CCFF00] border border-[#CCFF00]">
            <PenTool className="w-4 h-4" />
          </div>
          <h1 className="font-black text-xl uppercase italic tracking-tighter">Vector<span className="text-[#CCFF00]">Flow</span>.AI</h1>
        </div>

        <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold uppercase transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-neutral-900 text-[#CCFF00] border-l-2 border-[#CCFF00] italic tracking-widest'
                  : 'text-neutral-500 hover:bg-neutral-900 hover:text-[#CCFF00] border-l-2 border-transparent hover:border-[#CCFF00] tracking-widest'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-[#333]">
           <div className="p-4 border border-[#333] text-center bg-[radial-gradient(#222_1px,transparent_1px)] [background-size:10px_10px]">
              <span className="block text-[#CCFF00] font-mono text-[10px] tracking-widest uppercase mb-1">[ DRAFT V.1.0 ]</span>
              <span className="text-xs uppercase text-neutral-500 font-bold">Confidential</span>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto max-w-5xl">
        {renderContent()}
      </main>
    </div>
  );
}
