/**
 * useKeyboard Hook
 * Provides keyboard event handling with accessibility best practices
 * Follows WCAG 2.2 guidelines for keyboard interaction
 *
 * @example
 * ```tsx
 * const handleAction = () => logger.debug('Action triggered!');
 * const { keyDownHandler } = useKeyboard({
 *   onEnter: handleAction,
 *   onEscape: () => close(),
 *   onArrowDown: () => moveDown(),
 * });
 *
 * <div onKeyDown={keyDownHandler}>...</div>
 * ```
 */
import { useCallback, useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from 'react';

export interface KeyboardHandlers {
  onEnter?: (event: KeyboardEvent) => void;
  onSpace?: (event: KeyboardEvent) => void;
  onEscape?: (event: KeyboardEvent) => void;
  onArrowUp?: (event: KeyboardEvent) => void;
  onArrowDown?: (event: KeyboardEvent) => void;
  onArrowLeft?: (event: KeyboardEvent) => void;
  onArrowRight?: (event: KeyboardEvent) => void;
  onTab?: (event: KeyboardEvent) => void;
  onShiftTab?: (event: KeyboardEvent) => void;
  /** Custom key handler - receives key code */
  onCustomKey?: (key: string, event: KeyboardEvent) => void;
}

export interface UseKeyboardOptions extends KeyboardHandlers {
  /** Enable keyboard handling */
  enabled?: boolean;
  /** Prevent default behavior for handled keys */
  preventDefault?: boolean;
  /** Stop event propagation for handled keys */
  stopPropagation?: boolean;
}

/** Maps an event key to the single-key handler that should fire for it. */
type SingleKeyHandlerName = Exclude<keyof KeyboardHandlers, 'onTab' | 'onShiftTab' | 'onCustomKey'>;

const KEY_HANDLER_MAP: Record<string, SingleKeyHandlerName> = {
  Enter: 'onEnter',
  ' ': 'onSpace',
  Space: 'onSpace',
  Escape: 'onEscape',
  Esc: 'onEscape',
  ArrowUp: 'onArrowUp',
  Up: 'onArrowUp',
  ArrowDown: 'onArrowDown',
  Down: 'onArrowDown',
  ArrowLeft: 'onArrowLeft',
  Left: 'onArrowLeft',
  ArrowRight: 'onArrowRight',
  Right: 'onArrowRight',
};

/**
 * Dispatch a keyboard event to the matching handler.
 * Returns true if a handler was invoked.
 */
function dispatchKeyboardEvent(event: KeyboardEvent, handlers: KeyboardHandlers): boolean {
  if (event.key === 'Tab') {
    if (event.shiftKey && handlers.onShiftTab) {
      handlers.onShiftTab(event);
      return true;
    }
    if (!event.shiftKey && handlers.onTab) {
      handlers.onTab(event);
      return true;
    }
    return false;
  }

  const handlerName = KEY_HANDLER_MAP[event.key];
  if (handlerName) {
    const handler = handlers[handlerName];
    if (handler) {
      handler(event);
      return true;
    }
    return false;
  }

  if (handlers.onCustomKey) {
    handlers.onCustomKey(event.key, event);
    return true;
  }
  return false;
}

export function useKeyboard(options: UseKeyboardOptions = {}) {
  const {
    enabled = true,
    preventDefault = true,
    stopPropagation = false,
  } = options;

  const handlersRef = useRef(options);

  // Keep handlers up to date
  useEffect(() => {
    handlersRef.current = options;
  }, [options]);

  const keyDownHandler = useCallback(
    (event: ReactKeyboardEvent | KeyboardEvent) => {
      if (!enabled) {
        return;
      }

      const handled = dispatchKeyboardEvent(event as KeyboardEvent, handlersRef.current);

      if (handled) {
        if (preventDefault) {
          event.preventDefault();
        }
        if (stopPropagation) {
          event.stopPropagation();
        }
      }
    },
    [enabled, preventDefault, stopPropagation]
  );

  return {
    keyDownHandler,
  };
}

/**
 * useGlobalKeyboard Hook
 * Registers global keyboard event listeners
 * Useful for application-wide shortcuts
 */
export function useGlobalKeyboard(handlers: KeyboardHandlers, enabled = true) {
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger global shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      dispatchKeyboardEvent(event, handlersRef.current);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
}
