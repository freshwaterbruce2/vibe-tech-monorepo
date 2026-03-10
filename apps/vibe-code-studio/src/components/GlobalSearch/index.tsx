/**
 * GlobalSearch Component
 * Full-text search and replace across workspace files
 */
import { ChevronDown, ChevronRight, FileText, Replace, Search, X } from 'lucide-react';

import {
    ActionButton,
    ActionButtons,
    CloseButton,
    FileGroup,
    FileHeader,
    FileIcon,
    FileName,
    FilterInput,
    FilterInputs,
    HeaderTitle,
    HighlightedText,
    InputContainer,
    InputIcon,
    OptionButton,
    OptionsRow,
    ResultCount,
    ResultItem,
    ResultLine,
    ResultsContainer,
    ResultsHeader,
    ResultText,
    SearchContainer,
    SearchHeader,
    SearchInput,
    SearchInputGroup,
} from './styled';
import type { GlobalSearchProps } from './types';
import { useGlobalSearch } from './useGlobalSearch';

export const GlobalSearch = ({
  isOpen,
  onClose,
  onOpenFile,
  onReplaceInFile,
  onSearchInFiles,
  workspaceFiles,
  workspaceRoot,
}: GlobalSearchProps) => {
  const {
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
    searchInputRef,
    setSearchText,
    setReplaceText,
    setScope,
    toggleOption,
    setFilterOption,
    performSearch,
    toggleFileExpansion,
    handleResultClick,
    handleReplaceAll,
  } = useGlobalSearch({
    isOpen,
    onClose,
    onOpenFile,
    onReplaceInFile,
    onSearchInFiles,
    workspaceFiles,
    workspaceRoot,
  });

  return (
    <SearchContainer $isOpen={isOpen}>
      <SearchHeader>
        <HeaderTitle>
          <h3>
            <Search size={16} />
            Search & Replace
          </h3>
          <CloseButton onClick={onClose}>
            <X size={16} />
          </CloseButton>
        </HeaderTitle>

        <SearchInputGroup>
          <InputContainer>
            <InputIcon>
              <Search size={14} />
            </InputIcon>
            <SearchInput
              ref={searchInputRef}
              type="text"
              placeholder="Search text..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </InputContainer>
        </SearchInputGroup>

        <SearchInputGroup>
          <InputContainer>
            <InputIcon>
              <Replace size={14} />
            </InputIcon>
            <SearchInput
              type="text"
              placeholder="Replace with..."
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
            />
          </InputContainer>
        </SearchInputGroup>

        <OptionsRow>
          <OptionButton
            $active={options.caseSensitive}
            onClick={() => toggleOption('caseSensitive')}
          >
            Aa
          </OptionButton>
          <OptionButton
            $active={options.wholeWord}
            onClick={() => toggleOption('wholeWord')}
          >
            Ab
          </OptionButton>
          <OptionButton
            $active={options.regex}
            onClick={() => toggleOption('regex')}
          >
            .*
          </OptionButton>
        </OptionsRow>

        <OptionsRow>
          <OptionButton
            $active={scope === 'open-files'}
            onClick={() => setScope('open-files')}
            title="Search only currently open files"
          >
            Open Files
          </OptionButton>
          <OptionButton
            $active={scope === 'workspace-recursive'}
            onClick={() => setScope('workspace-recursive')}
            disabled={!workspaceRoot}
            title={workspaceRoot ? 'Search all files in the workspace recursively' : 'Open a workspace folder first'}
          >
            Workspace (Recursive)
          </OptionButton>
        </OptionsRow>

        <FilterInputs>
          <FilterInput
            placeholder="files to include"
            value={options.includeFiles}
            onChange={(e) => setFilterOption('includeFiles', e.target.value)}
          />
          <FilterInput
            placeholder="files to exclude"
            value={options.excludeFiles}
            onChange={(e) => setFilterOption('excludeFiles', e.target.value)}
          />
        </FilterInputs>

        <ActionButtons>
          <ActionButton
            $variant="primary"
            onClick={performSearch}
            disabled={isSearching || !searchText.trim()}
          >
            {isSearching ? 'Searching...' : 'Search'}
          </ActionButton>
          <ActionButton
            $variant="danger"
            onClick={handleReplaceAll}
            disabled={isReplacing || !searchText.trim() || !replaceText.trim() || totalResults === 0}
          >
            {isReplacing ? 'Replacing...' : 'Replace All'}
          </ActionButton>
        </ActionButtons>
      </SearchHeader>

      <ResultsContainer>
        {totalResults > 0 && (
          <ResultsHeader>
            {totalResults} results in {fileCount} files
          </ResultsHeader>
        )}

        {Object.entries(results).map(([file, fileResults]) => (
          <FileGroup key={file}>
            <FileHeader onClick={() => toggleFileExpansion(file)}>
              <FileIcon>
                {expandedFiles.has(file) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </FileIcon>
              <FileIcon>
                <FileText size={14} />
              </FileIcon>
              <FileName>{file}</FileName>
              <ResultCount>{fileResults.length}</ResultCount>
            </FileHeader>

            {expandedFiles.has(file) && fileResults.map((result, index) => (
              <ResultItem key={index} onClick={() => handleResultClick(result)}>
                <ResultLine>Line {result.line}, Column {result.column}</ResultLine>
                <ResultText>
                  {result.before}
                  <HighlightedText>{result.match}</HighlightedText>
                  {result.after}
                </ResultText>
              </ResultItem>
            ))}
          </FileGroup>
        ))}

        {searchText.trim() && totalResults === 0 && !isSearching && (
          <ResultsHeader>No results found</ResultsHeader>
        )}
      </ResultsContainer>
    </SearchContainer>
  );
};

export default GlobalSearch;

// Re-export types and hook
export * from './types';
export { useGlobalSearch } from './useGlobalSearch';
