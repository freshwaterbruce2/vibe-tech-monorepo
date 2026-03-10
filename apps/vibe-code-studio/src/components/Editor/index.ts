/**
 * Editor Module Exports
 * Barrel file for Editor component and related utilities
 */

// Types
export type {
  CompletionStats,
  CursorPosition,
  EditorProps,
  FindMatchState,
  PrefetchStats,
  PrefetchStatus,
} from './types';

// Styled components
export {
  AiIndicator,
  EditorContainer,
  MonacoContainer,
  PrefetchIndicator,
  StatsOverlay,
  StatusOverlay,
  StatusText,
} from './styled';

// Hooks
export { useEditorKeyboard } from './useEditorKeyboard';
export { useEditorState } from './useEditorState';

// Main component (re-exported from parent for backward compatibility)
// The actual Editor component remains in the parent directory
// to avoid breaking existing imports
