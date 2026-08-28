import { useState, useCallback } from 'react';
import { Cpu, MousePointer2, Code2, Check, X, Terminal } from 'lucide-react';
import { useIPC } from '../hooks/useIPC';
import { IPCMessageType, type IPCMessage } from '@vibetech/shared-ipc';

interface NovaIntent {
  id: string;
  type: string;
  title: string;
  description: string;
  action: 'insert' | 'action';
  payload: unknown;
}

export const NovaSidebar = () => {
  const [intents, setIntents] = useState<NovaIntent[]>([]);

  const handleIncomingMessage = useCallback((message: IPCMessage) => {
    const messageType = message.type as string;
    if (message.type === IPCMessageType.COMMAND_REQUEST || messageType === 'code_edit') {
      const payload = message.payload as Record<string, unknown>;
      // Create a unique ID if not present
      const rawIntentId = payload['id'] ?? message.messageId;
      const intentId = (rawIntentId as string | undefined) ?? (() => {
        const now = Date.now();
        return `intent_${now}`;
      })();

      const newIntent: NovaIntent = {
        id: intentId,
        type: messageType,
        title: (payload['title'] as string | undefined) ?? (messageType === 'code_edit' ? 'Code Edit' : 'Command Request'),
        description: (payload['description'] as string | undefined) ?? (payload['text'] as string | undefined) ?? 'Nova wants to perform an action.',
        action: messageType === 'code_edit' ? 'insert' : 'action',
        payload: message.payload
      };

      // Avoid duplicates based on messageId
      setIntents(prev => {
        if (prev.some(i => i.id === intentId)) return prev;
        return [newIntent, ...prev];
      });
    }
  }, []);

  const { lastMessage, sendMessage } = useIPC({ onMessage: handleIncomingMessage });

  const handleApprove = useCallback((intent: NovaIntent) => {
    // If it's a code edit, we might want to trigger the EditorService
    // For now, we send an ACK back to the source
    const now = Date.now();
    sendMessage({
      type: IPCMessageType.ACK,
      source: 'vibe',
      target: 'nova',
      timestamp: now,
      messageId: `ack_${now}`,
      payload: {
        messageId: intent.id,
        status: 'approved',
        type: intent.type
      }
    });

    // If it's a CODE_EDIT, we might also want to locally apply it
    // if the bridge isn't automatically routing it back.
    // However, the "Mission Control" pattern usually means:
    // Nova -> Bridge (Request) -> Sidebar (Approval) -> Bridge (Execute) -> EditorService

    setIntents(prev => prev.filter(i => i.id !== intent.id));
  }, [sendMessage]);

  const handleReject = useCallback((intentId: string) => {
    setIntents(prev => prev.filter(i => i.id !== intentId));
  }, []);

  return (
    <div className="w-80 h-full bg-slate-900 border-l border-slate-800 flex flex-col font-sans text-slate-300">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2 text-blue-400">
          <Cpu size={16} /> Nova Control
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-medium">LIVE</span>
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {intents.map((intent) => (
          <div key={intent.id} className="bg-slate-800 rounded-lg p-3 border border-slate-700 shadow-xl transition-all hover:border-slate-600">
            <div className="flex items-center gap-2 mb-2">
               {intent.action === 'insert' ? 
                <Code2 size={14} className="text-purple-400" /> : 
                <MousePointer2 size={14} className="text-amber-400" />
               }
               <span className="text-xs font-semibold text-slate-100">{intent.title}</span>
            </div>
            <p className="text-[11px] text-slate-400 mb-3 leading-relaxed line-clamp-3">
              {intent.description}
            </p>
            
            <div className="flex gap-2">
              <button 
                onClick={() => handleApprove(intent)}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] py-1.5 rounded font-bold transition-colors flex items-center justify-center gap-1"
              >
                <Check size={12} /> EXECUTE
              </button>
              <button 
                onClick={() => handleReject(intent.id)}
                aria-label="Reject intent"
                className="px-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        ))}
        {intents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-600 space-y-2">
            <div className="p-3 rounded-full bg-slate-800/50">
              <Cpu size={24} className="opacity-20" />
            </div>
            <span className="text-xs italic">Waiting for Nova's next move...</span>
          </div>
        )}
      </div>

      <div className="p-3 bg-slate-950 border-t border-slate-800">
        <div className="flex items-center gap-2 text-[10px] text-slate-500 mb-1 font-bold uppercase tracking-tighter">
          <Terminal size={10} /> CURRENT ACTIVITY
        </div>
        <div className="text-[11px] text-blue-300 truncate font-mono">
          {((lastMessage?.payload as Record<string, unknown>)?.['current_step'] as string | undefined) ?? "Analyzing Monorepo Structure..."}
        </div>
      </div>
    </div>
  );
};
