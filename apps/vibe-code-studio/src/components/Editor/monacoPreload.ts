/**
 * Preload Monaco Editor
 * Call this to preload Monaco before it's needed
 * Useful for preloading on user interaction (hover, etc.)
 * Kept out of LazyMonaco.tsx so Fast Refresh works (react-refresh/only-export-components).
 */
export const preloadMonaco = async () => {
  // Preload configuration first
  const { configureMonaco } = await import('../../utils/monacoConfig');
  await configureMonaco();
  // Then preload the editor
  return import('@monaco-editor/react');
};
