import React from 'react';
import { Sidebar } from './Sidebar';
import { Preview } from './Preview';
import { Terminal } from './Terminal';
import { CodeEditor } from './CodeEditor';
import { DiffEditor } from './DiffEditor';
import { TabBar } from './TabBar'; // Import TabBar
import { useIDEStore } from '@/lib/store';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

export const Workspace: React.FC = () => {
  const { viewMode } = useIDEStore();

  return (
    <div className="flex h-screen pt-14 bg-zinc-950 text-white overflow-hidden">
       {/* Sidebar Fixed Width */}
       <Sidebar />
       
       {/* Main Content Area */}
       <main className="flex-1 ml-[280px] flex flex-col min-w-0 h-full">
          {/* Tab Bar - Only show in code/diff mode or split mode */}
          {(viewMode === 'code' || viewMode === 'diff' || viewMode === 'split') && (
            <div className="flex-none">
                <TabBar />
            </div>
          )}

          <div className="flex-1 min-h-0 relative">
             {viewMode === 'split' ? (
                <PanelGroup direction="horizontal">
                   <Panel defaultSize={50} minSize={20}>
                      <CodeEditor />
                   </Panel>
                   <PanelResizeHandle className="w-1 bg-zinc-800 hover:bg-electric-violet transition-colors" />
                   <Panel defaultSize={50} minSize={20}>
                      <div className="h-full border-l border-white/5">
                        <Preview />
                      </div>
                   </Panel>
                </PanelGroup>
             ) : viewMode === 'diff' ? (
                <DiffEditor />
             ) : viewMode === 'code' ? (
                <CodeEditor />
             ) : (
                <div className="h-full p-4 pb-0">
                  <Preview />
                </div>
             )}
          </div>
          <div className="flex-none z-10">
             <Terminal />
          </div>
       </main>
    </div>
  );
};