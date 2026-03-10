import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type AuthStatus,
  chatGemini,
  getAuthStatus,
  logout,
  startOAuth,
} from '../lib/gemini-service';
import { isMemoryAvailable, searchMemory, storeMemory } from '../lib/memory-bridge';

interface Message {
  role: 'user' | 'nova';
  text: string;
}

interface NovaQuickChatProps {
  onClose: () => void;
}

export function NovaQuickChat({ onClose }: NovaQuickChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [memoryOnline, setMemoryOnline] = useState(false);
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Check auth + memory status on mount
  useEffect(() => {
    void isMemoryAvailable().then(setMemoryOnline);
    void getAuthStatus()
      .then(setAuth)
      .catch(() => setAuth({ authenticated: false, email: null, expires_at: null }));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSignIn = useCallback(async () => {
    setAuthLoading(true);
    try {
      const status = await startOAuth();
      setAuth(status);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'nova', text: `Auth error: ${err}` }]);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const handleLogout = useCallback(async () => {
    await logout();
    setAuth({ authenticated: false, email: null, expires_at: null });
  }, []);

  const send = useCallback(async () => {
    if (!input.trim() || loading) return;
    const prompt = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: prompt }]);
    setLoading(true);

    try {
      // Enrich with memory context if available
      let enrichedPrompt = prompt;
      if (memoryOnline) {
        const memories = await searchMemory(prompt, 3);
        if (memories.length > 0) {
          const ctx = memories.map((m) => m.content).join(' | ');
          enrichedPrompt = `[Memory context: ${ctx}]\n\n${prompt}`;
        }
        void storeMemory(`Nova chat: ${prompt}`, 'chat_interaction');
      }

      let reply: string;
      if (auth?.authenticated) {
        // Convert last 10 messages for Gemini conversation context
        const history = messages.slice(-10).map((m) => ({
          role: m.role === 'user' ? 'user' : 'nova',
          text: m.text,
        }));
        reply = await chatGemini(enrichedPrompt, history);
      } else {
        reply = `[Sign in with Google to use Gemini 2.5 Pro]\n\nEcho: ${prompt}`;
      }

      setMessages((prev) => [...prev, { role: 'nova', text: reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: 'nova', text: `Error: ${err}` }]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, memoryOnline, auth, messages]);

  return (
    <div className="nova-chat">
      <div className="nova-chat__header">
        <span className="nova-chat__title">
          🤖 Nova — Alt+Space
          {memoryOnline && <span className="nova-chat__memory-badge">🧠</span>}
        </span>
        <div className="nova-chat__header-actions">
          {auth?.authenticated ? (
            <button
              onClick={() => void handleLogout()}
              className="nova-chat__auth-btn nova-chat__auth-btn--user"
              title={`Signed in as ${auth.email ?? 'Google'}`}
            >
              {auth.email?.split('@')[0] ?? '●'}
            </button>
          ) : (
            <button
              onClick={() => void handleSignIn()}
              className="nova-chat__auth-btn nova-chat__auth-btn--signin"
              disabled={authLoading}
            >
              {authLoading ? '…' : 'Sign in'}
            </button>
          )}
          <button onClick={onClose} className="nova-chat__close">
            ✕
          </button>
        </div>
      </div>

      <div className="nova-chat__messages">
        {!auth?.authenticated && messages.length === 0 && (
          <div className="nova-chat__welcome">
            <p>🔑 Sign in with Google to connect Gemini 2.5 Pro</p>
            <p className="nova-chat__welcome-sub">Your Google One AI Premium powers this chat</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`nova-chat__bubble nova-chat__bubble--${m.role}`}>
            <div className="nova-chat__bubble-content">{m.text}</div>
          </div>
        ))}
        {loading && <div className="nova-chat__loading">Nova is thinking…</div>}
        <div ref={bottomRef} />
      </div>

      <div className="nova-chat__input-area">
        <input
          id="nova-chat-input"
          name="nova-chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void send();
          }}
          placeholder={auth?.authenticated ? 'Ask Nova (Gemini 2.5 Pro)…' : 'Ask Nova…'}
          className="nova-chat__input"
        />
      </div>
    </div>
  );
}
