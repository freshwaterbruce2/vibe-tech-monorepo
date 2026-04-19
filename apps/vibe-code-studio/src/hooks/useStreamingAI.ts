import { useCallback, useRef, useState } from 'react';
import { logger } from '../services/Logger';
import { unifiedAI } from '../services/ai/UnifiedAIService';

export function useStreamingCompletion() {
  const [completion, setCompletion] = useState('');
  const [isCompleting, setIsCompleting] = useState(false);
  const cancelledRef = useRef(false);

  const getCompletion = useCallback(async (
    textBeforeCursor: string,
    _position: { line: number; column: number },
    language: string
  ) => {
    cancelledRef.current = false;
    setCompletion('');
    setIsCompleting(true);

    try {
      let result = '';
      const stream = unifiedAI.sendContextualMessageStream({
        systemPrompt: 'Code completion engine. Return ONLY the code that continues naturally after the cursor. No markdown, no explanations.',
        userQuery: `Complete this ${language} code at the cursor:\n\n${textBeforeCursor}`,
        maxTokens: 100,
        temperature: 0.1,
      });

      for await (const chunk of stream) {
        if (cancelledRef.current) break;
        result += chunk;
        setCompletion(result);
      }
    } catch (error) {
      if (!(error instanceof Error && error.message.includes('AbortError'))) {
        logger.debug('[useStreamingCompletion] Completion failed:', error);
      }
      setCompletion('');
    } finally {
      setIsCompleting(false);
    }
  }, []);

  const cancelCompletion = useCallback(() => {
    cancelledRef.current = true;
    setIsCompleting(false);
    setCompletion('');
  }, []);

  return { completion, isCompleting, getCompletion, cancelCompletion };
}
