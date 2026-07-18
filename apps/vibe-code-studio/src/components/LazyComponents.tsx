import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import styled from 'styled-components';

import { vibeTheme } from '../styles/theme';

/**
 * Lazy Component Loading - 2025 Code Splitting Patterns
 *
 * Features:
 * - Dynamic imports for heavy components
 * - Graceful loading states
 * - Error boundaries integration
 * - Preloading strategies
 * - Route-based splitting
 *
 * Non-component exports (routes, preloadStrategies, bundleOptimization,
 * withLazyLoading) live in ./LazyComponents.lazy.ts and ./withLazyLoading.tsx
 * so Fast Refresh keeps working for this file.
 */

// Loading fallback component
const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  color: ${vibeTheme.colors.textSecondary};

  svg {
    animation: spin 1s linear infinite;
    margin-bottom: ${vibeTheme.spacing.md};
    color: ${vibeTheme.colors.purple};
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const LoadingText = styled.div`
  font-size: ${vibeTheme.typography.fontSize.sm};
`;

interface LoadingFallbackProps {
  message?: string | undefined;
}

export const LoadingFallback = ({ message = 'Loading component...' }: LoadingFallbackProps) => (
  <LoadingContainer>
    <Loader2 size={24} />
    <LoadingText>{message}</LoadingText>
  </LoadingContainer>
);

// Lazy-loaded heavy components (see LazyComponents.lazy.ts)
export { LazyAIChat, LazyCommandPalette, LazySettings } from './LazyComponents.lazy';

// Component with resource hints
export const ResourceHints = () => {
  useEffect(() => {
    // Prefetch critical resources
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = '/assets/monaco-editor.js';
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, []);

  return null;
};

// Usage example:
/*
// In App.tsx
import { LazyAIChat } from './components/LazyComponents'
import { preloadStrategies } from './components/LazyComponents.lazy'

function App() {
  // Preload AI Chat when idle
  useEffect(() => {
    preloadStrategies.preloadOnIdle('aiChat')
  }, [])

  return (
    <div>
      {showAIChat && <LazyAIChat />}
    </div>
  )
}
*/
