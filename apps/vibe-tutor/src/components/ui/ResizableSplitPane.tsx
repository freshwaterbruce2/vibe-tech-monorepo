import React, { useEffect, useMemo, useRef, useState } from 'react';

import { appStore } from '../../utils/electronStore';

export interface ResizableSplitPaneProps {
  left: React.ReactNode;
  right: React.ReactNode;

  initialLeftPercent?: number;
  minLeftPercent?: number;
  maxLeftPercent?: number;
  storageKey?: string;

  leftClassName?: string;
  rightClassName?: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export const ResizableSplitPane = ({
  left,
  right,
  initialLeftPercent = 35,
  minLeftPercent = 20,
  maxLeftPercent = 80,
  storageKey,
  leftClassName,
  rightClassName,
}: ResizableSplitPaneProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);

  const persisted = useMemo(() => {
    if (!storageKey) return null;
    try {
      const raw = appStore.get(storageKey);
      if (!raw) return null;
      const value = Number(raw);
      return Number.isFinite(value) ? value : null;
    } catch {
      return null;
    }
  }, [storageKey]);

  const [leftPercent, setLeftPercent] = useState<number>(() => {
    const base = persisted ?? initialLeftPercent;
    return clamp(base, minLeftPercent, maxLeftPercent);
  });

  useEffect(() => {
    if (!storageKey) return;
    try {
      appStore.set(storageKey, String(leftPercent));
    } catch {
      // ignore
    }
  }, [leftPercent, storageKey]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.style.setProperty('--vibe-split-left', `${leftPercent}%`);
  }, [leftPercent]);

  const setFromClientX = (clientX: number) => {
    const el = containerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = clamp(clientX - rect.left, 0, rect.width);
    const next = (x / rect.width) * 100;
    setLeftPercent(clamp(next, minLeftPercent, maxLeftPercent));
  };

  const onDividerPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    const el = containerRef.current;
    if (!el) return;

    pointerIdRef.current = e.pointerId;
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    setFromClientX(e.clientX);
  };

  const onDividerPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (pointerIdRef.current !== e.pointerId) return;
    setFromClientX(e.clientX);
  };

  const onDividerPointerUp: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (pointerIdRef.current !== e.pointerId) return;
    pointerIdRef.current = null;
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  return (
    <div ref={containerRef} className="vibe-splitpane">
      <section aria-label="Interrogator" className={['vibe-splitpane__left', leftClassName].filter(Boolean).join(' ')}>
        {left}
      </section>

      <div
        role="separator"
        aria-label="Resize panels"
        aria-orientation="vertical"
        tabIndex={0}
        className="w-2 shrink-0 cursor-col-resize bg-[var(--glass-border)]/30 hover:bg-[var(--glass-border)]/50 focus:outline-none focus-glow"
        onPointerDown={onDividerPointerDown}
        onPointerMove={onDividerPointerMove}
        onPointerUp={onDividerPointerUp}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            setLeftPercent(p => clamp(p - 2, minLeftPercent, maxLeftPercent));
          }
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            setLeftPercent(p => clamp(p + 2, minLeftPercent, maxLeftPercent));
          }
          if (e.key === 'Home') {
            e.preventDefault();
            setLeftPercent(minLeftPercent);
          }
          if (e.key === 'End') {
            e.preventDefault();
            setLeftPercent(maxLeftPercent);
          }
        }}
      />

      <section aria-label="Evidence board" className={['vibe-splitpane__right', rightClassName].filter(Boolean).join(' ')}>
        {right}
      </section>
    </div>
  );
};
