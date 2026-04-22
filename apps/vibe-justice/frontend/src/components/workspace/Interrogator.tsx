import { Bot, Send, Sparkles, User, Loader2 } from 'lucide-react';
import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { justiceApi } from '../../services/api';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

export function Interrogator() {
  const [inputValue, setInputValue] = useState('');
  const [displayMessages, setDisplayMessages] = useState<Message[]>([
    {
      id: 'init-1',
      sender: 'ai',
      text: "I'm ready to assist with the investigation. DeepSeek AI is online. Upload case files or begin the interrogation.",
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [displayMessages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputValue,
      timestamp: new Date().toLocaleTimeString()
    };

    // Optimistically add user message to display
    setDisplayMessages(prev => [...prev, userMsg]);
    const messageText = inputValue;
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await justiceApi.sendChat(messageText);

      const aiMsg: Message = {
        id: Date.now().toString(),
        sender: 'ai',
        text: response.content || response.message || 'No response received.',
        timestamp: new Date().toLocaleTimeString()
      };

      setDisplayMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error("Chat Error:", error);
      const errorMsg: Message = {
        id: Date.now().toString(),
        sender: 'ai',
        text: `Error: ${error instanceof Error ? error.message : 'Unable to process your request. Please try again.'}`,
        timestamp: new Date().toLocaleTimeString()
      };
      setDisplayMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-vibe-dark relative border-r border-white/5">
      {/* Header */}
      <div className="h-14 border-b border-white/5 flex items-center px-4 bg-vibe-void/50 backdrop-blur-sm">
        <Sparkles className="w-4 h-4 text-neon-purple mr-2" />
        <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wider font-mono">
          The Interrogator
        </h2>
        <span className="ml-auto text-xs text-neon-blue font-mono">v2.0.0 // ONLINE</span>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {displayMessages.map((msg) => (
          <div key={msg.id} className={`flex gap-4 ${msg.sender === 'user' ? 'pl-12 flex-row-reverse' : 'pr-12'}`}>
             <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border shadow-[0_0_10px_rgba(0,0,0,0.1)] ${
               msg.sender === 'ai' 
                 ? 'bg-neon-purple/10 border-neon-purple/20 shadow-[0_0_10px_rgba(189,0,255,0.1)]' 
                 : 'bg-neon-mint/10 border-neon-mint/20 shadow-[0_0_10px_rgba(0,255,159,0.1)]'
             }`}>
               {msg.sender === 'ai' ? <Bot className="w-4 h-4 text-neon-purple" /> : <User className="w-4 h-4 text-neon-mint" />}
             </div>
             <div className={`space-y-1 ${msg.sender === 'user' ? 'flex flex-col items-end' : ''}`}>
               <div className="flex items-baseline gap-2">
                 {msg.sender === 'ai' && <span className="text-xs font-bold text-neon-purple font-mono">SYS.AI_CORE</span>}
                 <span className="text-[10px] text-gray-500 font-mono">{msg.timestamp}</span>
                 {msg.sender === 'user' && <span className="text-xs font-bold text-neon-mint font-mono">OPERATOR</span>}
               </div>
               <div className={`text-sm font-mono leading-relaxed max-w-prose ${
                 msg.sender === 'user' 
                   ? 'p-3 rounded-lg bg-white/5 border border-white/5 text-gray-200' 
                   : 'text-gray-300'
               }`}>
                 <p>{msg.text}</p>
               </div>
             </div>
          </div>
        ))}
        {isLoading && (
           <div className="flex gap-4 pr-12 animate-pulse">
             <div className="w-8 h-8 rounded-full bg-neon-purple/10 flex items-center justify-center shrink-0 border border-neon-purple/20">
               <Loader2 className="w-4 h-4 text-neon-purple animate-spin" />
             </div>
             <div className="space-y-1">
                <span className="text-xs font-bold text-neon-purple font-mono">SYS.AI_CORE</span>
                <div className="text-sm text-gray-500 font-mono">Processing logic...</div>
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-white/10 bg-vibe-dark">
        <div className="relative">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder={isLoading ? "Processing..." : "Input command query..."}
            className="w-full bg-vibe-surface border border-white/10 rounded-md py-3 pl-4 pr-12 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-neon-mint/50 focus:ring-1 focus:ring-neon-mint/20 transition-all font-mono disabled:opacity-50"
            aria-label="Chat input"
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded bg-neon-mint/10 hover:bg-neon-mint/20 text-neon-mint transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Send Message"
            aria-label="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="mt-2 text-[10px] text-center text-neon-blue/50 font-mono tracking-widest uppercase">
           Secure Channel // Encrypted // Level 5
        </div>
      </div>
    </div>
  );
}
