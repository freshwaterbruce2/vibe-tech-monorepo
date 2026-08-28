import type { ReactNode } from 'react';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { Sidebar } from './Sidebar';

interface DashboardLayoutProps {
  children: ReactNode;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

export function DashboardLayout({ children, activeTab, setActiveTab }: DashboardLayoutProps) {
  useKeyboardShortcuts({
    onNewInvestigation: () => setActiveTab?.('investigation'),
    onSettings: () => window.dispatchEvent(new CustomEvent('vibe-toggle-settings')),
  });

  return (
    <div className="flex h-screen w-screen bg-void-black overflow-hidden font-sans text-white">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 h-full relative">
        {children}
      </main>
    </div>
  );
}
