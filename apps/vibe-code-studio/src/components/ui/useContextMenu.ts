/**
 * Hook for managing context menu state.
 * Kept out of context-menu.tsx so Fast Refresh works
 * (react-refresh/only-export-components).
 */
import { useState } from 'react';
import type { MouseEvent } from 'react';

import type { ContextMenuItem } from './context-menu';

export const useContextMenu = () => {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    items: ContextMenuItem[];
  } | null>(null);

  const showContextMenu = (e: MouseEvent, items: ContextMenuItem[]) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items,
    });
  };

  const hideContextMenu = () => {
    setContextMenu(null);
  };

  return {
    contextMenu,
    showContextMenu,
    hideContextMenu,
  };
};
