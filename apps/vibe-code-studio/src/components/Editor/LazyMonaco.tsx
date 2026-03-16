/**
 * Lazy Monaco Editor Wrapper
 * Handles lazy loading of Monaco Editor with loading states and error boundaries
 * This is the performance-optimized version that saves ~2.45 MB on initial load
 */
import type { ComponentProps} from 'react';
import { Suspense, lazy, Component, type ReactNode, type ErrorInfo } from 'react';
import type { Editor as MonacoEditorType } from '@monaco-editor/react';
import { MonacoSkeleton } from './MonacoSkeleton';
import { logger } from '../../services/Logger';

// Lazy load Monaco Editor - this is the KEY performance optimization
const MonacoEditor = lazy(() =>
  // First, configure Monaco (if not already configured)
  import('../../utils/monacoConfig').then(({ configureMonaco }) => {
    return configureMonaco().then(() => import('@monaco-editor/react'));
  }).then(module => {
    logger.info('[LazyMonaco] Monaco Editor loaded successfully');
    return { default: module.Editor };
  }).catch(error => {
    logger.error('[LazyMonaco] Failed to load Monaco Editor', error);
    throw error;
  })
);

// Error Fallback Component
const EditorErrorFallback = ({ error }: { error: Error }) => (
  <div style={{
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    padding: '24px',
    backgroundColor: '#1e1e1e',
    color: '#d4d4d4',
    borderRadius: '8px',
  }}>
    <div style={{ fontSize: '48px' }}>⚠️</div>
    <div style={{ fontSize: '18px', fontWeight: 600 }}>Editor Failed to Load</div>
    <div style={{ fontSize: '14px', color: '#888', textAlign: 'center', maxWidth: '400px' }}>
      {error.message || 'An error occurred while loading the Monaco Editor'}
    </div>
    <button
      onClick={() => window.location.reload()}
      style={{
        padding: '8px 16px',
        background: '#8b5cf6',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '14px',
      }}
    >
      Reload Application
    </button>
  </div>
);

// Error Boundary for Monaco Editor
class MonacoErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('[LazyMonaco] Error boundary caught error', { error, errorInfo });
  }

  override render() {
    if (this.state.hasError && this.state.error) {
      return <EditorErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}

// Type for Monaco Editor props
type MonacoEditorProps = ComponentProps<typeof MonacoEditorType>;

/**
 * LazyMonaco Component
 * Drop-in replacement for Monaco Editor with lazy loading
 * 
 * Performance Impact:
 * - Saves ~2.45 MB on initial bundle
 * - Editor loads only when needed
 * - Provides loading skeleton for better UX
 */
export const LazyMonaco = (props: MonacoEditorProps) => {
  return (
    <MonacoErrorBoundary>
      <Suspense fallback={<MonacoSkeleton message="Loading Monaco Editor..." />}>
        <MonacoEditor {...props} />
      </Suspense>
    </MonacoErrorBoundary>
  );
};

/**
 * Preload Monaco Editor
 * Call this to preload Monaco before it's needed
 * Useful for preloading on user interaction (hover, etc.)
 */
export const preloadMonaco = async () => {
  // Preload configuration first
  const { configureMonaco } = await import('../../utils/monacoConfig');
  await configureMonaco();
  // Then preload the editor
  return import('@monaco-editor/react');
};

export default LazyMonaco;
