import type { RefObject} from 'react';
import { useEffect, useState } from 'react';
import { logger } from '../services/Logger';

interface InlineEditState {
  isOpen: boolean;
  position: { top: number; left: number } | null;
  selectedCode: string;
}

export function useInlineEdit(containerRef: RefObject<any>) {
  const [state, setState] = useState<InlineEditState>({
    isOpen: false,
    position: null,
    selectedCode: ''
  });

  const closeWidget = () => setState(prev => ({ ...prev, isOpen: false }));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Trigger: Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();

        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.toString().length === 0) return;

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const text = selection.toString();

        setState({
          isOpen: true,
          selectedCode: text,
          // Position just below the selection
          position: {
            top: rect.bottom + window.scrollY + 10,
            left: rect.left + window.scrollX
          }
        });
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [containerRef]);

  const startInlineEdit = () => {
    // Placeholder for starting inline edit
    logger.debug('Starting inline edit');
  };

  return {
    ...state,
    closeWidget,
    setState,
    startInlineEdit
  };
}
