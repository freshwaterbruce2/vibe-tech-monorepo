import { useCallback, useEffect, useState } from 'react';
import { tabCompletionService } from '../services/ai/TabCompletionService';

interface UseTabCompletionProps {
  text: string;
  cursorIndex: number; // Current caret position
  language?: string;
}

export function useTabCompletion({ text, cursorIndex, language = 'typescript' }: UseTabCompletionProps) {
  const [ghostText, setGhostText] = useState<string | null>(null);

  useEffect(() => {
    // Reset ghost text if user types and it invalidates the suggestion
    setGhostText(null);

    // If text is empty or cursor not at end of line (simplified), skip
    if (!text) return;

    const prefix = text.slice(0, cursorIndex);
    const suffix = text.slice(cursorIndex);

    tabCompletionService.triggerCompletion(
      { prefix, suffix, language },
      (suggestion) => {
        if (suggestion) {
          // Only show if it actually adds to what we have
          setGhostText(suggestion);
        }
      }
    );
  }, [text, cursorIndex, language]);

  const acceptCompletion = useCallback(() => {
    if (!ghostText) return null;
    const completion = ghostText;
    setGhostText(null);
    return completion;
  }, [ghostText]);

  return { ghostText, acceptCompletion };
}
