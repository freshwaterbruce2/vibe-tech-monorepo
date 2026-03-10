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
  onReplaceInFile: (file: string, searchText: string, replaceText: string, options: SearchOptions) => Promise<void>;
  onSearchInFiles: (
    searchText: string,
    files: string[],
    options: SearchOptions,
    scope?: SearchScope
  ) => Promise<Record<string, SearchResult[]>>;
  workspaceFiles: string[];
  workspaceRoot?: string | null;
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
  const [searchText, setSearchText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [options, setOptions] = useState<SearchOptions>(DEFAULT_SEARCH_OPTIONS);
  const [scope, setScope] = useState<SearchScope>('open-files');
  const [results, setResults] = useState<Record<string, SearchResult[]>>({});
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

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
  }, [isOpen]);

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
  }, [searchText, options, scope, workspaceFiles, workspaceRoot, onSearchInFiles]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(timer);
  }, [performSearch]);

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
  }, []);

  const handleResultClick = useCallback((result: SearchResult) => {
    onOpenFile(result.file, result.line, result.column);
  }, [onOpenFile]);

  const handleReplaceAll = useCallback(async () => {
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
  }, [replaceText, searchText, results, options, onReplaceInFile, performSearch]);

  const toggleOption = useCallback((key: keyof Pick<SearchOptions, 'caseSensitive' | 'wholeWord' | 'regex'>) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const setFilterOption = useCallback((key: 'includeFiles' | 'excludeFiles', value: string) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  }, []);

  const totalResults = Object.values(results).reduce((sum, fileResults) => sum + fileResults.length, 0);
  const fileCount = Object.keys(results).length;

  return {
    // State
    searchText,
    replaceText,
    options,
    scope,
    results,
    expandedFiles,
    isSearching,
    isReplacing,
    totalResults,
    fileCount,

    // Refs
    searchInputRef,

    // Actions
    setSearchText,
    setReplaceText,
    setScope,
    toggleOption,
    setFilterOption,
    performSearch,
    toggleFileExpansion,
    handleResultClick,
    handleReplaceAll,
  };
}
