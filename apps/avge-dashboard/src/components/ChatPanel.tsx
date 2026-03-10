import { useEffect, useRef, useState } from 'react';
import { queryNotebook } from '../pipeline/notebook';
import { useAVGEStore } from '../stores/avge-store';
import type { ChatMessage } from '../types';

const SUGGESTIONS = [
  'What are the top hooks from my sources?',
  'Identify retention gap patterns',
  'Generate a 3M anxiety hook',
];

export function ChatPanel() {
  const messages = useAVGEStore((s) => s.chatMessages);
  const chatLoading = useAVGEStore((s) => s.chatLoading);
  const addChatMessage = useAVGEStore((s) => s.addChatMessage);
  const setChatLoading = useAVGEStore((s) => s.setChatLoading);
  const activeProject = useAVGEStore((s) => s.activeProject);
  const chatConversationId = useAVGEStore((s) => s.chatConversationId);
  const setChatConversationId = useAVGEStore((s) => s.setChatConversationId);

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendQuery = async (text: string) => {
    if (!text.trim() || chatLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    };

    addChatMessage(userMessage);
    setInput('');
    setChatLoading(true);

    try {
      const notebookId = activeProject?.notebookId;
      if (!notebookId) {
        // No notebook linked — return helpful stub
        addChatMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content:
            '⚠️ No notebook connected.\n\n' +
            'Launch the BLAST pipeline first to create a NotebookLM project, ' +
            'or authenticate with `notebooklm-mcp-auth`.',
          sources: [],
          timestamp: Date.now(),
        });
        return;
      }

      // Real NLM query with conversation threading
      const result = await queryNotebook(notebookId, text.trim(), chatConversationId ?? undefined);

      // Persist conversation thread ID for follow-ups
      if (result.conversationId) {
        setChatConversationId(result.conversationId);
      }

      addChatMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result.answer,
        sources: result.sources,
        timestamp: Date.now(),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addChatMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `❌ Query failed: ${msg}\n\nCheck NotebookLM auth or try again.`,
        sources: [],
        timestamp: Date.now(),
      });
    } finally {
      setChatLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendQuery(input);
    }
  };

  return (
    <div className="glass-panel panel">
      <div className="panel-header">
        <span className="panel-title">💬 Intel Chat</span>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {activeProject?.notebookId && (
            <span className="mono" style={{ fontSize: '9px', color: 'var(--accent-success)', opacity: 0.7 }}>
              ● linked
            </span>
          )}
          <button
            className="tab-btn"
            onClick={() => useAVGEStore.getState().clearChat()}
          >
            Clear
          </button>
        </div>
      </div>

      <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', padding: 0 }}>
        <div className="chat-messages" style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-3)' }}>
          {messages.length === 0 && (
            <div className="empty-state">
              <span className="icon">🧠</span>
              <p style={{ fontSize: 'var(--text-sm)', maxWidth: '220px', lineHeight: 1.5 }}>
                Ask questions against your intelligence library.
                Source-grounded responses via NotebookLM.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {SUGGESTIONS.map((s) => (
                  <span
                    key={s}
                    className="suggestion"
                    role="button"
                    tabIndex={0}
                    onClick={() => sendQuery(s)}
                    onKeyDown={(e) => e.key === 'Enter' && sendQuery(s)}
                    style={{ cursor: 'pointer' }}
                  >
                    "{s}"
                  </span>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`chat-message ${msg.role}`}>
              <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
              {msg.sources && msg.sources.length > 0 && (
                <div style={{
                  marginTop: 'var(--space-1)',
                  fontSize: '10px',
                  color: 'var(--text-tertiary)',
                }}>
                  📎 {msg.sources.join(', ')}
                </div>
              )}
            </div>
          ))}

          {chatLoading && (
            <div className="chat-message assistant" style={{ opacity: 0.6 }}>
              <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                <span className="status-dot running" />
                <span style={{ fontSize: 'var(--text-xs)' }}>Querying sources...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="chat-input-area">
        <input
          className="chat-input"
          type="text"
          placeholder="Ask your intelligence library..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={chatLoading}
        />
        <button
          className="btn btn-primary"
          onClick={() => sendQuery(input)}
          disabled={chatLoading || !input.trim()}
          style={{ flexShrink: 0, fontSize: 'var(--text-xs)' }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
