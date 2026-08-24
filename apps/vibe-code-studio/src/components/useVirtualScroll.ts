/**
 * Hook for virtual scrolling logic.
 * Kept out of VirtualList.tsx so Fast Refresh works
 * (react-refresh/only-export-components).
 */
import { useCallback, useMemo, useState } from 'react';

export function useVirtualScroll<T>(
  items: T[],
  containerHeight: number,
  itemHeight: number | ((index: number) => number),
  overscan: number = 3
) {
  const [scrollTop, setScrollTop] = useState(0);

  const getItemHeight = useCallback(
    (index: number): number => {
      return typeof itemHeight === 'function' ? itemHeight(index) : itemHeight;
    },
    [itemHeight]
  );

  const visibleRange = useMemo(() => {
    let accumulatedHeight = 0;
    let startIndex = 0;
    let endIndex = items.length - 1;

    // Find start index
    for (let i = 0; i < items.length; i++) {
      const height = getItemHeight(i);
      if (accumulatedHeight + height > scrollTop) {
        startIndex = Math.max(0, i - overscan);
        break;
      }
      accumulatedHeight += height;
    }

    // Find end index
    accumulatedHeight = 0;
    for (let i = startIndex; i < items.length; i++) {
      if (accumulatedHeight > scrollTop + containerHeight) {
        endIndex = Math.min(items.length - 1, i + overscan);
        break;
      }
      accumulatedHeight += getItemHeight(i);
    }

    return { startIndex, endIndex };
  }, [items, scrollTop, containerHeight, overscan, getItemHeight]);

  const totalHeight = useMemo(() => {
    return items.reduce((acc, _, index) => acc + getItemHeight(index), 0);
  }, [items, getItemHeight]);

  return {
    scrollTop,
    setScrollTop,
    visibleRange,
    totalHeight,
  };
}
