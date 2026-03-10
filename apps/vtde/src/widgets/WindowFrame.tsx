/**
 * WindowFrame — Draggable/resizable window chrome for VTDE widgets.
 * Replaces react-draggable + re-resizable from the Electron app.
 */
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';

interface WindowFrameProps {
  id: string;
  title: string;
  icon?: string;
  children: ReactNode;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  maximized?: boolean;
  minimized?: boolean;
  preMax?: { pos: { x: number; y: number }; size: { w: number; h: number } };
  onUpdateState?: (
    changes: Partial<{
      x: number;
      y: number;
      w: number;
      h: number;
      maximized: boolean;
      minimized: boolean;
      preMax: { pos: { x: number; y: number }; size: { w: number; h: number } };
    }>,
  ) => void;
  onClose: () => void;
  onFocus?: () => void;
  zIndex?: number;
}

export function WindowFrame({
  title,
  icon,
  children,
  x,
  y,
  w,
  h,
  maximized,
  minimized,
  onUpdateState,
  onClose,
  onFocus,
  zIndex = 10,
}: WindowFrameProps) {
  const [dragging, setDragging] = useState(false);
  const [snapPreview, setSnapPreview] = useState<React.CSSProperties | null>(null);
  const dragRef = useRef<{ offsetX: number; offsetY: number } | null>(null);
  const preSnapRef = useRef<{ w: number; h: number } | null>(null);

  // Use controlled props, fallback to initial if undefined
  const currentX = x ?? 120;
  const currentY = y ?? 80;
  const currentW = w ?? 640;
  const currentH = h ?? 480;
  const isMaximized = maximized ?? false;
  const isMinimized = minimized ?? false;

  const onTitleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onFocus?.();

      let initialX = currentX;
      let initialY = currentY;

      if (isMaximized) {
        // Restore from maximized while dragging
        const restoreW = w ?? 640;
        initialX = e.clientX - restoreW / 2;
        initialY = e.clientY - 10;
        onUpdateState?.({
          maximized: false,
          x: initialX,
          y: initialY,
        });
        dragRef.current = { offsetX: restoreW / 2, offsetY: 10 };
      } else {
        const rect = (e.target as HTMLElement).closest('.vtde-window')?.getBoundingClientRect();
        if (!rect) return;
        dragRef.current = { offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top };
      }
      setDragging(true);

      const onMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        const W = window.innerWidth;
        const H = window.innerHeight - 48; // Taskbar height

        const newX = Math.max(
          -currentW + 100,
          Math.min(ev.clientX - dragRef.current.offsetX, W - 100),
        );
        const newY = Math.max(0, Math.min(ev.clientY - dragRef.current.offsetY, H - 48));

        const SNAP_THRESHOLD = 10;

        // Show snap preview - check corners first, then edges
        const isLeft = ev.clientX <= SNAP_THRESHOLD;
        const isRight = ev.clientX >= W - SNAP_THRESHOLD;
        const isTop = ev.clientY <= SNAP_THRESHOLD;
        const isBottom = ev.clientY >= H - SNAP_THRESHOLD;

        if (isTop && isLeft) {
          // Top-left corner (25% quadrant)
          setSnapPreview({ left: 0, top: 0, width: W / 2, height: H / 2 });
        } else if (isTop && isRight) {
          // Top-right corner (25% quadrant)
          setSnapPreview({ left: W / 2, top: 0, width: W / 2, height: H / 2 });
        } else if (isBottom && isLeft) {
          // Bottom-left corner (25% quadrant)
          setSnapPreview({ left: 0, top: H / 2, width: W / 2, height: H / 2 });
        } else if (isBottom && isRight) {
          // Bottom-right corner (25% quadrant)
          setSnapPreview({ left: W / 2, top: H / 2, width: W / 2, height: H / 2 });
        } else if (isLeft) {
          // Left edge (50% width)
          setSnapPreview({ left: 0, top: 0, width: W / 2, height: H });
        } else if (isRight) {
          // Right edge (50% width)
          setSnapPreview({ left: W / 2, top: 0, width: W / 2, height: H });
        } else if (isTop) {
          // Top edge (maximize)
          setSnapPreview({ left: 0, top: 0, width: W, height: H });
        } else {
          setSnapPreview(null);
          // Unsnap dimensions if we drag away
          if (preSnapRef.current) {
            onUpdateState?.({ w: preSnapRef.current.w, h: preSnapRef.current.h });
            preSnapRef.current = null;
          }
        }

        onUpdateState?.({ x: newX, y: newY });
      };
      const onUp = (ev: MouseEvent) => {
        setDragging(false);
        dragRef.current = null;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);

        const W = window.innerWidth;
        const H = window.innerHeight - 48;
        const SNAP_THRESHOLD = 10;

        const isLeft = ev.clientX <= SNAP_THRESHOLD;
        const isRight = ev.clientX >= W - SNAP_THRESHOLD;
        const isTop = ev.clientY <= SNAP_THRESHOLD;
        const isBottom = ev.clientY >= H - SNAP_THRESHOLD;

        // Save original size before snapping
        const willSnap = isLeft || isRight || isTop || isBottom;
        if (willSnap && !preSnapRef.current && onUpdateState) {
          preSnapRef.current = { w: currentW, h: currentH };
        }

        // Apply snap - corners first, then edges
        if (isTop && isLeft) {
          // Top-left quadrant
          onUpdateState?.({ x: 0, y: 0, w: W / 2, h: H / 2, maximized: false });
        } else if (isTop && isRight) {
          // Top-right quadrant
          onUpdateState?.({ x: W / 2, y: 0, w: W / 2, h: H / 2, maximized: false });
        } else if (isBottom && isLeft) {
          // Bottom-left quadrant
          onUpdateState?.({ x: 0, y: H / 2, w: W / 2, h: H / 2, maximized: false });
        } else if (isBottom && isRight) {
          // Bottom-right quadrant
          onUpdateState?.({ x: W / 2, y: H / 2, w: W / 2, h: H / 2, maximized: false });
        } else if (isLeft) {
          // Left half
          onUpdateState?.({ x: 0, y: 0, w: W / 2, h: H, maximized: false });
        } else if (isRight) {
          // Right half
          onUpdateState?.({ x: W / 2, y: 0, w: W / 2, h: H, maximized: false });
        } else if (isTop) {
          // Maximize
          onUpdateState?.({
            maximized: true,
            preMax: { pos: { x: currentX, y: currentY }, size: { w: currentW, h: currentH } },
          });
        }
        setSnapPreview(null);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [isMaximized, currentX, currentY, currentW, currentH, w, onFocus, onUpdateState],
  );

  const toggleMaximize = useCallback(() => {
    if (isMaximized) {
      if (onUpdateState) {
        onUpdateState({ maximized: false });
      }
    } else {
      onUpdateState?.({
        maximized: true,
        preMax: { pos: { x: currentX, y: currentY }, size: { w: currentW, h: currentH } },
      });
    }
  }, [isMaximized, currentX, currentY, currentW, currentH, onUpdateState]);

  const toggleMinimize = useCallback(() => {
    onUpdateState?.({ minimized: !isMinimized });
  }, [isMinimized, onUpdateState]);

  const style: React.CSSProperties = isMaximized
    ? { left: 0, top: 0, width: '100vw', height: 'calc(100vh - 48px)', zIndex: zIndex + 10 }
    : { left: currentX, top: currentY, width: currentW, height: currentH, zIndex };

  // Don't render window if minimized
  if (isMinimized) {
    return null;
  }

  return (
    <>
      <div
        className={`vtde-window${dragging ? ' vtde-window--dragging' : ''}`}
        style={style}
        onMouseDownCapture={onFocus}
      >
        <div
          className="vtde-window__titlebar"
          onMouseDown={onTitleMouseDown}
          onDoubleClick={toggleMaximize}
        >
          <div className="vtde-window__titlebar-left">
            {icon && <span className="vtde-window__titlebar-icon">{icon}</span>}
            <span className="vtde-window__titlebar-text">{title}</span>
          </div>
          <div className="vtde-window__controls">
            <button
              className="vtde-window__btn vtde-window__btn--minimize"
              onClick={toggleMinimize}
              title="Minimize"
            >
              ─
            </button>
            <button
              className="vtde-window__btn vtde-window__btn--maximize"
              onClick={toggleMaximize}
              title="Maximize"
            >
              {isMaximized ? '❐' : '□'}
            </button>
            <button
              className="vtde-window__btn vtde-window__btn--close"
              onClick={onClose}
              title="Close"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="vtde-window__content">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </div>

      {snapPreview && <div className="vtde-window__snap-preview" style={snapPreview} />}
    </>
  );
}
