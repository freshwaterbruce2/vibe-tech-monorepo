/**
 * useGlobalSearch Hook
 * Manages search state, debounced search, and replace operations
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

import { logger } from '../../services/Logger';

import type { SearchOptions, SearchResult, SearchScope } from './types';
import { DEFAULT_SEARCH_OPTIONS } from './types';

export interface UseGlobalSearchOptions {
  isOpen: boolean;
  onClose: () => void;
  onOpenFile: (file: string, line?: number, column?: number) => void;
  onReplaceInFile: (
    file: string,
    searchText: string,
    replaceText: string,
    options: SearchOptions
  ) => Promise<void>;
  onSearchInFiles: (
    searchText: string,
    files: string[],
    options: SearchOptions,
    scope?: SearchScope
  ) => Promise<Record<string, SearchResult[]>>;
  workspaceFiles: string[];
  workspaceRoot?: string | null;
}

interface SearchExecutionArgs {
  searchText: string;
  options: SearchOptions;
  scope: SearchScope;
  workspaceFiles: string[];
  workspaceRoot?: string | null;
  setResults: React.Dispatch<React.SetStateAction<Record<string, SearchResult[]>>>;
  setExpandedFiles: React.Dispatch<React.SetStateAction<Set<string>>>;
  setIsSearching: React.Dispatch<React.SetStateAction<boolean>>;
  onSearchInFiles: UseGlobalSearchOptions['onSearchInFiles'];
}

/**
 * Owns the debounced search execution.
 */
function useSearchExecution({
  searchText,
  options,
  scope,
  workspaceFiles,
  workspaceRoot,
  setResults,
  setExpandedFiles,
  setIsSearching,
  onSearchInFiles,
}: SearchExecutionArgs) {
  const performSearch = useCallback(async () => {
    if (!searchText.trim()) {
      setResults({});
      return;
    }

    setIsSearching(true);

    try {
      if (scope === 'workspace-recursive' && !workspaceRoot) {
        setResults({});
        return;
      }

      const realResults = await onSearchInFiles(searchText, workspaceFiles, options, scope);
      setResults(realResults);

      // Auto-expand first few files
      const fileNames = Object.keys(realResults);
      setExpandedFiles(new Set(fileNames.slice(0, 3)));
    } catch (error) {
      logger.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  }, [
    searchText,
    options,
    scope,
    workspaceFiles,
    workspaceRoot,
    onSearchInFiles,
    setResults,
    setExpandedFiles,
    setIsSearching,
  ]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(timer);
  }, [performSearch]);

  return performSearch;
}

interface ReplaceAllArgs {
  searchText: string;
  replaceText: string;
  options: SearchOptions;
  results: Record<string, SearchResult[]>;
  setIsReplacing: React.Dispatch<React.SetStateAction<boolean>>;
  onReplaceInFile: UseGlobalSearchOptions['onReplaceInFile'];
  performSearch: () => Promise<void>;
}

/**
 * Owns the bulk replace-all operation across the current result set.
 */
function useReplaceAll({
  searchText,
  replaceText,
  options,
  results,
  setIsReplacing,
  onReplaceInFile,
  performSearch,
}: ReplaceAllArgs) {
  return useCallback(async () => {
    if (!replaceText.trim() || !searchText.trim()) {return;}

    setIsReplacing(true);

    try {
      const files = Object.keys(results);
      for (const file of files) {
        await onReplaceInFile(file, searchText, replaceText, options);
      }

      // Refresh search after replace
      await performSearch();
    } catch (error) {
      logger.error('Replace failed:', error);
    } finally {
      setIsReplacing(false);
    }
  }, [
    replaceText,
    searchText,
    results,
    options,
    onReplaceInFile,
    performSearch,
    setIsReplacing,
  ]);
}

/**
 * Bundles the search panel's local state and the input ref.
 */
function useSearchState() {
  const [searchText, setSearchText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [options, setOptions] = useState<SearchOptions>(DEFAULT_SEARCH_OPTIONS);
  const [scope, setScope] = useState<SearchScope>('open-files');
  const [results, setResults] = useState<Record<string, SearchResult[]>>({});
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  return {
    searchText, setSearchText,
    replaceText, setReplaceText,
    options, setOptions,
    scope, setScope,
    results, setResults,
    expandedFiles, setExpandedFiles,
    isSearching, setIsSearching,
    isReplacing, setIsReplacing,
    searchInputRef,
  };
}

interface SearchInteractionsArgs {
  setExpandedFiles: React.Dispatch<React.SetStateAction<Set<string>>>;
  setOptions: React.Dispatch<React.SetStateAction<SearchOptions>>;
  onOpenFile: UseGlobalSearchOptions['onOpenFile'];
}

/**
 * Owns the result-list interaction callbacks (expand, open, option toggles).
 */
function useSearchInteractions({
  setExpandedFiles,
  setOptions,
  onOpenFile,
}: SearchInteractionsArgs) {
  const toggleFileExpansion = useCallback((file: string) => {
    setExpandedFiles(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(file)) {
        newExpanded.delete(file);
      } else {
        newExpanded.add(file);
      }
      return newExpanded;
    });
  }, [setExpandedFiles]);

  const handleResultClick = useCallback((result: SearchResult) => {
    onOpenFile(result.file, result.line, result.column);
  }, [onOpenFile]);

  const toggleOption = useCallback(
    (key: keyof Pick<SearchOptions, 'caseSensitive' | 'wholeWord' | 'regex'>) => {
      setOptions(prev => ({ ...prev, [key]: !prev[key] }));
    },
    [setOptions]
  );

  const setFilterOption = useCallback(
    (key: 'includeFiles' | 'excludeFiles', value: string) => {
      setOptions(prev => ({ ...prev, [key]: value }));
    },
    [setOptions]
  );

  return { toggleFileExpansion, handleResultClick, toggleOption, setFilterOption };
}

/**
 * Wires the search panel's keyboard shortcuts and focus-on-open behavior.
 */
function useSearchKeyboard(
  isOpen: boolean,
  onClose: () => void,
  searchInputRef: React.RefObject<HTMLInputElement | null>
) {
  // Keyboard shortcuts
  useHotkeys('ctrl+shift+f', (e) => {
    e.preventDefault();
    if (!isOpen) {return;}
    searchInputRef.current?.focus();
  });

  useHotkeys('escape', (e) => {
    if (isOpen) {
      e.preventDefault();
      onClose();
    }
  });

  // Focus search input when opened
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchInputRef]);
}

type SearchState = ReturnType<typeof useSearchState>;
type SearchInteractions = ReturnType<typeof useSearchInteractions>;

interface SearchActions extends SearchInteractions {
  performSearch: () => Promise<void>;
  handleReplaceAll: () => Promise<void>;
}

/**
 * Assembles the public hook API: state, derived counts, refs, and actions.
 */
function assembleSearchApi(state: SearchState, actions: SearchActions) {
  const { results } = state;
  const totalResults = Object.values(results).reduce(
    (sum, fileResults) => sum + fileResults.length,
    0
  );
  const fileCount = Object.keys(results).length;

  return {
    searchText: state.searchText,
    replaceText: state.replaceText,
    options: state.options,
    scope: state.scope,
    results,
    expandedFiles: state.expandedFiles,
    isSearching: state.isSearching,
    isReplacing: state.isReplacing,
    totalResults,
    fileCount,
    searchInputRef: state.searchInputRef,
    setSearchText: state.setSearchText,
    setReplaceText: state.setReplaceText,
    setScope: state.setScope,
    toggleOption: actions.toggleOption,
    setFilterOption: actions.setFilterOption,
    performSearch: actions.performSearch,
    toggleFileExpansion: actions.toggleFileExpansion,
    handleResultClick: actions.handleResultClick,
    handleReplaceAll: actions.handleReplaceAll,
  };
}

export function useGlobalSearch({
  isOpen,
  onClose,
  onOpenFile,
  onReplaceInFile,
  onSearchInFiles,
  workspaceFiles,
  workspaceRoot,
}: UseGlobalSearchOptions) {
  const state = useSearchState();
  const {
    searchText, replaceText, options, scope, results,
    setResults, setExpandedFiles, setIsSearching, setIsReplacing, setOptions,
    searchInputRef,
  } = state;

  useSearchKeyboard(isOpen, onClose, searchInputRef);

  const performSearch = useSearchExecution({
    searchText,
    options,
    scope,
    workspaceFiles,
    workspaceRoot,
    setResults,
    setExpandedFiles,
    setIsSearching,
    onSearchInFiles,
  });

  const handleReplaceAll = useReplaceAll({
    searchText,
    replaceText,
    options,
    results,
    setIsReplacing,
    onReplaceInFile,
    performSearch,
  });

  const interactions = useSearchInteractions({ setExpandedFiles, setOptions, onOpenFile });

  return assembleSearchApi(state, {
    performSearch,
    handleReplaceAll,
    ...interactions,
  });
}
