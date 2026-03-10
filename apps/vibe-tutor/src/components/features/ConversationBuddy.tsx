import React, { useState, useEffect, useRef } from 'react';
import { Send, Smile, Trash2, MessageSquare } from 'lucide-react';
import { sendMessageToAssistant, getConversationHistory, clearConversationHistory } from '../../services/assistantClient';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

interface ConversationBuddyProps {
  onClose?: () => void;
}

const QUICK_PROMPTS = [
  "Tell me something cool about Roblox!",
  "How can I stay focused on homework?",
  "What's a good morning routine?",
  "Help me understand this assignment",
  "What chores should I do first?",
];

const ConversationBuddy = ({ onClose }: ConversationBuddyProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadHistory = () => {
    const history = getConversationHistory();
    setMessages(history);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    // Add user message immediately
    const userMsg: Message = {
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const response = await sendMessageToAssistant(userMessage);

      const assistantMsg: Message = {
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMsg: Message = {
        role: 'assistant',
        content: "Oops, I had trouble with that. Can you try asking again?",
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
  };

  const handleClearHistory = () => {
    if (confirm('Clear all conversation history?')) {
      clearConversationHistory();
      setMessages([]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 flex flex-col">
      {/* Header */}
      <div className="glass-card p-4 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-purple-500 rounded-full flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Buddy Chat</h2>
            <p className="text-xs text-white/60">Your AI friend</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleClearHistory}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="Clear history"
          >
            <Trash2 className="w-5 h-5 text-white/70" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-colors"
            >
              Back
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <Smile className="w-16 h-16 mx-auto text-cyan-400 mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">Hey! Ready to chat?</h3>
            <p className="text-white/70 mb-6">Pick a topic or ask me anything!</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
              {QUICK_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleQuickPrompt(prompt)}
                  className="glass-button p-3 text-left hover:scale-105 transition-transform"
                >
                  <span className="text-sm text-white">{prompt}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, idx) => (
          <div
            key={idx}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl p-4 ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-cyan-600 to-purple-600 text-white'
                  : 'glass-card bg-white/5'
              }`}
            >
              <p className="text-white whitespace-pre-wrap">{message.content}</p>
              <span className="text-xs text-white/50 mt-1 block">
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="glass-card bg-white/5 rounded-2xl p-4 max-w-[80%]">
              <div className="flex items-center gap-2">
                <div className="animate-bounce text-white">●</div>
                <div className="animate-bounce delay-100 text-white">●</div>
                <div className="animate-bounce delay-200 text-white">●</div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="glass-card p-4 border-t border-white/10">
        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message... (Press Enter to send)"
            className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
            rows={1}
            disabled={loading}
          />
          <button
            onClick={() => { void handleSend(); }}
            disabled={!input.trim() || loading}
            className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-purple-600 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Prompts (show when empty) */}
        {messages.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK_PROMPTS.slice(0, 3).map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickPrompt(prompt)}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-full text-xs text-white/80 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationBuddy;
