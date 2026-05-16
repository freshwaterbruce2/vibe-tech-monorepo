import { Check, RefreshCw, Sparkles, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { inlineEditService, DiffResult } from '../../services/ai/InlineEditService';
import { logger } from '../../services/Logger';
import { DiffView } from './DiffView';

interface InlineEditWidgetProps {
  position: { top: number; left: number } | null;
  selectedCode: string;
  language?: string;
  onClose: () => void;
  onAccept: (newCode: string) => void;
}

export const InlineEditWidget = ({
  position,
  selectedCode,
  language = 'typescript',
  onClose,
  onAccept,
}: InlineEditWidgetProps) => {
  const [instruction, setInstruction] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [diffs, setDiffs] = useState<DiffResult[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when widget appears
  useEffect(() => {
    if (position && inputRef.current) {
      inputRef.current.focus();
    }
  }, [position]);

  if (!position) return null;

  const handleGenerate = async () => {
    if (!instruction.trim()) return;

    setIsThinking(true);
    setError(null);
    try {
      const response = await inlineEditService.generateEdit({
        code: selectedCode,
        instruction,
        language
      });

      setGeneratedCode(response.modifiedCode);
      setDiffs(response.diff);
    } catch (err) {
      logger.error('Inline Edit Failed:', err);
      setError('Failed to generate edit');
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isThinking) {
      if (generatedCode) {
        onAccept(generatedCode);
      } else {
        handleGenerate();
      }
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="fixed z-50 flex flex-col gap-2 w-[500px] bg-[#1e1e1e] border border-white/10 rounded-lg shadow-2xl animate-in fade-in zoom-in-95 duration-100"
      style={{ top: position.top, left: position.left }}
      data-testid="inline-edit-dialog"
    >
      {/* Input Area */}
      <div className="flex items-center p-2 gap-2 border-b border-white/5">
        <div className="flex-none text-purple-400">
          {isThinking ? (
            <RefreshCw className="animate-spin" size={16} />
          ) : (
            <Sparkles size={16} />
          )}
        </div>
        <input
          ref={inputRef}
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Edit selection... (e.g. 'Add error handling')"
          disabled={isThinking || !!generatedCode}
          data-testid="instruction-input"
          aria-label="Edit instruction"
          className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-gray-500"
        />
        {generatedCode && (
          <button
            onClick={() => { setGeneratedCode(null); setDiffs([]); setInstruction(''); }}
            className="text-xs text-gray-500 hover:text-white"
          >
            Retry
          </button>
        )}
      </div>
      
      {error && (
        <div className="px-3 py-2 text-xs text-red-400 bg-red-400/10" data-testid="error-message">
          {error}
          <button className="ml-2 underline" onClick={handleGenerate} data-testid="retry-button">Try again</button>
        </div>
      )}

      {/* Diff / Preview Area */}
      {generatedCode && diffs.length > 0 && (
        <div className="p-2" data-testid="diff-view">
          <DiffView diffs={diffs} />
        </div>
      )}

      {/* Action Footer */}
      {generatedCode && (
        <div className="flex items-center justify-end gap-2 p-2 bg-white/5 rounded-b-lg">
          <span className="text-xs text-gray-500 mr-auto">Enter to accept</span>
          <button
            onClick={onClose}
            data-testid="reject-button"
            className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white flex items-center gap-1 text-xs"
            title="Discard (Esc)"
          >
            <X size={14} /> Reject
          </button>
          <button
            onClick={() => onAccept(generatedCode)}
            data-testid="accept-button"
            className="p-1.5 bg-green-600 hover:bg-green-500 text-white rounded flex items-center gap-1 text-xs font-medium px-3"
            title="Accept (Enter)"
          >
            <Check size={14} /> Accept
          </button>
        </div>
      )}
    </div>
  );
};
