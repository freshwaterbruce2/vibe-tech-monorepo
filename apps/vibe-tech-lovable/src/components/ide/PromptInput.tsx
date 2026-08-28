import React, { useState, useRef, useEffect } from 'react';
import { Mic, Paperclip, Settings2, Sparkles, SendHorizontal, AtSign } from 'lucide-react';
import { useIDEStore } from '@/lib/store';
import { toast } from 'sonner';
import { aiService } from '@/services/ai';
import { ContextManager, ContextItem } from '@/lib/context-manager';

export const PromptInput: React.FC = () => {
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeContexts, setActiveContexts] = useState<ContextItem[]>([]);
  
  const { addLog, activeFile, files, setPendingDiff } = useIDEStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-detect context mentions
  useEffect(() => {
    const contexts = ContextManager.parseMentions(input, files);
    setActiveContexts(contexts);
  }, [input, files]);

  const handleSubmit = async () => {
    if (!input.trim() || isGenerating) return;

    setIsGenerating(true);
    addLog('info', `User Prompt: ${input}`);
    
    if (activeContexts.length > 0) {
        addLog('info', `Context: ${activeContexts.map(c => c.name).join(', ')}`);
    }
    
    addLog('warning', 'Connecting to DeepSeek API...');

    try {
      // Build Prompt with Explicit Context + Active File (if not already included)
      let finalInput = ContextManager.buildPrompt(input, activeContexts);
      
      // Implicitly add active file if it's not explicitly mentioned
      if (activeFile?.content && !activeContexts.find(c => c.name === activeFile.name)) {
         finalInput += `\n\n--- Active File Context ---\nFile: ${activeFile.name}\n\
\
${activeFile.content}\n\
\
`;
      }

      const response = await aiService.generateCode(finalInput);

      if (response.error) {
        addLog('error', `Generation Failed: ${response.error}`);
        toast.error("AI Generation Failed");
      } else {
        addLog('success', 'Code generated successfully.');
        
        if (activeFile && response.content) {
            let code = response.content;
            const codeBlockRegex = /```(?:typescript|tsx|jsx|js|css)?\n([\s\S]*?)```/;
            const match = code.match(codeBlockRegex);
            if (match) {
                code = match[1];
            }

            // Trigger Diff View
            setPendingDiff({
                fileName: activeFile.name,
                originalContent: activeFile.content || '',
                modifiedContent: code
            });
            addLog('info', `Review changes for ${activeFile.name}`);
        }
        
        toast.success("AI Generation Complete - Review Changes");
      }
    } catch (err) {
      addLog('error', 'An unexpected error occurred.');
      console.error(err);
    } finally {
      setIsGenerating(false);
      setInput('');
      setActiveContexts([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-50">
      <div className="relative group">
        {/* Glow Effect */}
        <div className={`absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-electric-violet rounded-2xl blur opacity-30 transition duration-1000 ${isGenerating ? 'animate-pulse opacity-75' : 'group-hover:opacity-75 group-hover:duration-200'}`}></div>
        
        <div className="relative bg-zinc-950 border border-white/10 rounded-2xl p-2 shadow-2xl flex flex-col gap-2">
           {/* Context Chips */}
           {activeContexts.length > 0 && (
             <div className="flex flex-wrap gap-2 px-2">
               {activeContexts.map(ctx => (
                 <div key={ctx.id} className="flex items-center gap-1 bg-electric-violet/20 text-electric-violet text-[10px] px-2 py-0.5 rounded-full border border-electric-violet/30">
                   <AtSign className="w-3 h-3" />
                   {ctx.name}
                 </div>
               ))}
             </div>
           )}

           <textarea 
             ref={textareaRef}
             placeholder={isGenerating ? "Generating code..." : "Describe your app... (use @ to mention files)"}
             className="w-full bg-transparent text-white placeholder-zinc-500 text-sm p-3 focus:outline-none resize-none min-h-[48px] max-h-[200px]"
             rows={1}
             value={input}
             onChange={(e) => setInput(e.target.value)}
             onKeyDown={handleKeyDown}
             disabled={isGenerating}
           />
           
           <div className="flex items-center justify-between px-2 pb-1">
              <div className="flex items-center gap-1">
                 <button className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors" title="Attach Image" aria-label="Attach image">
                    <Paperclip className="w-4 h-4" />
                 </button>
                 <button className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors" title="Voice Dictation" aria-label="Voice dictation">
                    <Mic className="w-4 h-4" />
                 </button>
                 <button className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors" title="Settings" aria-label="Settings">
                    <Settings2 className="w-4 h-4" />
                 </button>
              </div>

              <button 
                onClick={handleSubmit}
                disabled={!input.trim() || isGenerating}
                className="flex items-center gap-2 px-4 py-2 bg-white text-zinc-950 rounded-xl text-xs font-bold hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                 {isGenerating ? (
                    <span className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                 ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                 )}
                 <span>{isGenerating ? 'Thinking...' : 'Generate'}</span>
                 {!isGenerating && <SendHorizontal className="w-3.5 h-3.5" />}
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};
