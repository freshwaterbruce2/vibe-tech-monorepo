import { Send, Sparkles, Terminal } from 'lucide-react';
import React, { useState } from 'react';
import type { LogEntryData } from './ExecutionLog/LogEntry';
import { LogEntry } from './ExecutionLog/LogEntry';
import { AgentPanel } from './Sidebar/AgentPanel';
import { ContextPanel } from './Sidebar/ContextPanel';
import { PerformancePanel } from './Sidebar/PerformancePanel';
import { ErrorBoundary } from './shared/ErrorBoundary';
import type { StatusType } from './shared/StatusIcon';
import { StatusIcon } from './shared/StatusIcon';

// Temporary Mock Data Types (to be replaced with real state/hooks)
const MOCK_AGENTS = [
  { id: '1', name: 'Architect', role: 'System Design', status: 'idle' as StatusType },
  { id: '2', name: 'Builder', role: 'Implementation', status: 'idle' as StatusType },
  { id: '3', name: 'Reviewer', role: 'Quality Assurance', status: 'idle' as StatusType },
];

const MOCK_CONTEXT = [
  { id: 'c1', type: 'file' as const, name: 'EnhancedAgentMode.tsx', isActive: true },
  { id: 'c2', type: 'memory' as const, name: 'Project Requirements', isActive: true },
];

// ... imports
import { useInlineEdit } from '../hooks/useInlineEdit'; // Adjust path
import { InlineEditWidget } from './Editor/InlineEditWidget'; // Adjust path

export const EnhancedAgentMode: React.FC = () => {
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Initialize the hook
  const { isOpen, position, selectedCode, closeWidget } = useInlineEdit(containerRef);

  // Function to handle the AI's replacement (Simple replacement for now)
  const handleApplyEdit = (newCode: string) => {
    // Copy to clipboard as a fallback until Monaco editor integration is wired up
    navigator.clipboard.writeText(newCode);
    alert('Code copied to clipboard! (Integration with specific editor engine needed for auto-replace)');
    closeWidget();
  };

  const [activeAgentId, setActiveAgentId] = useState<string | null>('1');
  const [input, setInput] = useState('');
  const [logs, setLogs] = useState<LogEntryData[]>([
    { id: '1', timestamp: new Date(), level: 'info', message: 'Agent System Initialized', source: 'System' }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Import the new services
  const handleSendMessage = async () => {
    if (!input.trim()) return;

    // Add user log
    const userLog: LogEntryData = {
      id: Date.now().toString(),
      timestamp: new Date(),
      level: 'info',
      message: input,
      source: 'User'
    };

    setLogs(prev => [...prev, userLog]);
    setInput('');
    setIsProcessing(true);

    try {
      // 1. Get Context (RAG)
      // In a real scenario, you'd trigger this via specific intent or always-on
      // Use dynamic import to avoid circular dependencies if any, or just standard import if clean
      const { codebaseAnalyzer } = await import('../services/analysis/CodebaseAnalyzer');
      const { unifiedAI } = await import('../services/ai/UnifiedAIService');

      const context = await codebaseAnalyzer.getContextForQuery(input);

      const systemPrompt = `
        You are an expert AI software engineer.
        Here is the relevant context from the codebase:
        ${context}

        User Question: ${input}
      `;

      // 2. Send to AI
      const response = await unifiedAI.complete({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: input }
        ],
        temperature: 0.3 // Lower temp for factual code answers
      });

      // 3. Update Logs
      setLogs(prev => [...prev, {
        id: Date.now().toString(),
        timestamp: new Date(),
        level: 'success',
        message: response.content,
        source: response.provider || 'AI'
      }]);

    } catch {
      setLogs(prev => [...prev, {
        id: Date.now().toString(),
        timestamp: new Date(),
        level: 'error',
        message: 'Failed to process request.',
        source: 'System'
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ErrorBoundary>
      <div ref={containerRef} className="flex h-full bg-[#0d0d0d] text-gray-300">

        {/* LEFT SIDEBAR - Controls */}
        <div className="w-80 border-r border-white/10 flex flex-col bg-[#111]">
          <div className="p-4 border-b border-white/10">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Sparkles className="text-purple-500" size={18} />
              Vibe Agents
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <AgentPanel
              agents={MOCK_AGENTS}
              activeAgentId={activeAgentId}
              onSelectAgent={setActiveAgentId}
              isProcessing={isProcessing}
            />
            <ContextPanel
              items={MOCK_CONTEXT}
              onToggleItem={(_id) => { /* context item toggling not yet implemented */ }}
              onRefresh={() => { /* context refresh not yet implemented */ }}
            />
            <PerformancePanel
              metrics={{ tokensUsed: 1250, tokensPerSec: 45, latencyMs: 320, costEstimate: 0.02 }}
            />
          </div>
        </div>

        {/* MAIN AREA - Output & Input */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Header */}
          <div className="h-14 border-b border-white/10 flex items-center px-6 justify-between bg-[#111]">
            <div className="flex items-center gap-2 opacity-80">
              <Terminal size={16} />
              <span className="font-mono text-sm">Execution Logs</span>
            </div>
            <div className="text-xs text-gray-500">v2.0.0 Refactor</div>
          </div>

          {/* Logs Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1 font-mono text-sm">
            {logs.map(log => (
              <LogEntry key={log.id} entry={log} />
            ))}
            {isProcessing && (
              <div className="flex items-center gap-2 text-gray-500 p-3 italic">
                <StatusIcon status="thinking" className="w-3 h-3" />
                Processing request...
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-white/10 bg-[#111]">
            <div className="relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={async (e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                placeholder="Instruct the active agent..."
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-lg p-3 pr-12 focus:outline-none focus:border-blue-500/50 resize-none h-24 text-sm"
              />
              <button
                onClick={handleSendMessage}
                disabled={!input.trim() || isProcessing}
                aria-label="Send message"
                className="absolute right-3 bottom-3 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Add the Inline Edit Widget */}
        {isOpen && (
          <InlineEditWidget
            position={position}
            selectedCode={selectedCode}
            onClose={closeWidget}
            onAccept={handleApplyEdit}
          />
        )}

      </div>
    </ErrorBoundary>
  );
};

export default EnhancedAgentMode;
