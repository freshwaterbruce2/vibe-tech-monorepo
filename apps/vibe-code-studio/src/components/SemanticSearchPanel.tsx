/**
 * Semantic Search Panel Component
 * AI-powered natural language code search
 */

import { motion } from 'framer-motion';
import { Brain, ChevronRight, Code2, FileCode, Loader2, Search, Sparkles, X, Zap } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

import { logger } from '../services/Logger';
import type { SearchMetadata, SearchQuery, SearchResult } from '../services/SemanticSearchService';
import { SemanticSearchService } from '../services/SemanticSearchService';
import type { UnifiedAIService } from '../services/ai/UnifiedAIService';
import { vibeTheme } from '../styles/theme';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: ${vibeTheme.colors.secondary};
  border-left: 1px solid rgba(139, 92, 246, 0.1);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${vibeTheme.spacing.md};
  border-bottom: 1px solid rgba(139, 92, 246, 0.1);
`;

const Title = styled.h3`
  margin: 0;
  font-size: ${vibeTheme.typography.fontSize.lg};
  font-weight: ${vibeTheme.typography.fontWeight.semibold};
  color: ${vibeTheme.colors.text};
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing.sm};
`;

const CloseButton = styled.button`
  background: transparent;
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: ${vibeTheme.borderRadius.medium};
  padding: ${vibeTheme.spacing.xs};
  cursor: pointer;
  color: ${vibeTheme.colors.textSecondary};
  transition: all 0.2s ease;

  &:hover {
    background: rgba(139, 92, 246, 0.1);
    color: ${vibeTheme.colors.text};
  }
`;

const SearchContainer = styled.div`
  padding: ${vibeTheme.spacing.md};
  border-bottom: 1px solid rgba(139, 92, 246, 0.1);
`;

const SearchWrapper = styled.div`
  position: relative;
`;

const SearchInput = styled.input`
  width: 100%;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: ${vibeTheme.borderRadius.medium};
  padding: ${vibeTheme.spacing.md};
  padding-left: 40px;
  padding-right: 100px;
  color: ${vibeTheme.colors.text};
  font-size: ${vibeTheme.typography.fontSize.md};

  &:focus {
    outline: none;
    border-color: rgba(139, 92, 246, 0.5);
  }

  &::placeholder {
    color: ${vibeTheme.colors.textSecondary};
  }
`;

const SearchIcon = styled(Brain)`
  position: absolute;
  left: ${vibeTheme.spacing.sm};
  top: 50%;
  transform: translateY(-50%);
  color: rgba(139, 92, 246, 0.7);
  pointer-events: none;
`;

const SearchButton = styled.button`
  position: absolute;
  right: ${vibeTheme.spacing.xs};
  top: 50%;
  transform: translateY(-50%);
  background: ${vibeTheme.gradients.primary};
  border: none;
  border-radius: ${vibeTheme.borderRadius.small};
  padding: ${vibeTheme.spacing.xs} ${vibeTheme.spacing.sm};
  color: ${vibeTheme.colors.text};
  font-size: ${vibeTheme.typography.fontSize.sm};
  font-weight: ${vibeTheme.typography.fontWeight.semibold};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing.xs};
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-50%) translateY(-1px);
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ExampleQueries = styled.div`
  display: flex;
  gap: ${vibeTheme.spacing.xs};
  margin-top: ${vibeTheme.spacing.sm};
  flex-wrap: wrap;
`;

const ExampleQuery = styled.button`
  padding: ${vibeTheme.spacing.xs} ${vibeTheme.spacing.sm};
  border-radius: ${vibeTheme.borderRadius.small};
  border: 1px solid rgba(139, 92, 246, 0.2);
  background: transparent;
  color: ${vibeTheme.colors.textSecondary};
  font-size: ${vibeTheme.typography.fontSize.xs};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(139, 92, 246, 0.1);
    color: ${vibeTheme.colors.text};
  }
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${vibeTheme.spacing.md};
`;

const MetadataBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${vibeTheme.spacing.sm} ${vibeTheme.spacing.md};
  background: rgba(139, 92, 246, 0.05);
  border-radius: ${vibeTheme.borderRadius.medium};
  margin-bottom: ${vibeTheme.spacing.md};
  font-size: ${vibeTheme.typography.fontSize.xs};
  color: ${vibeTheme.colors.textSecondary};
`;

const MetadataItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing.xs};
`;

const ResultsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${vibeTheme.spacing.md};
`;

const ResultCard = styled(motion.div)`
  background: rgba(139, 92, 246, 0.05);
  border: 1px solid rgba(139, 92, 246, 0.1);
  border-radius: ${vibeTheme.borderRadius.medium};
  padding: ${vibeTheme.spacing.md};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(139, 92, 246, 0.1);
    border-color: rgba(139, 92, 246, 0.3);
    transform: translateY(-1px);
  }
`;

const ResultHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: ${vibeTheme.spacing.sm};
`;

const ResultInfo = styled.div`
  flex: 1;
`;

const ResultFile = styled.div`
  font-size: ${vibeTheme.typography.fontSize.sm};
  font-weight: ${vibeTheme.typography.fontWeight.semibold};
  color: ${vibeTheme.colors.text};
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing.xs};
`;

const ResultPath = styled.div`
  font-size: ${vibeTheme.typography.fontSize.xs};
  color: ${vibeTheme.colors.textSecondary};
  margin-top: ${vibeTheme.spacing.xs};
`;

const RelevanceBadge = styled.span<{ $score: number }>`
  padding: 2px 8px;
  border-radius: ${vibeTheme.borderRadius.small};
  font-size: ${vibeTheme.typography.fontSize.xs};
  font-weight: ${vibeTheme.typography.fontWeight.medium};
  background: ${props =>
    props.$score >= 80
      ? 'rgba(16, 185, 129, 0.1)'
      : props.$score >= 50
      ? 'rgba(245, 158, 11, 0.1)'
      : 'rgba(239, 68, 68, 0.1)'};
  color: ${props => (props.$score >= 80 ? '#10b981' : props.$score >= 50 ? '#f59e0b' : '#ef4444')};
`;

const CodeSnippet = styled.pre`
  background: rgba(0, 0, 0, 0.3);
  border-radius: ${vibeTheme.borderRadius.small};
  padding: ${vibeTheme.spacing.sm};
  margin: ${vibeTheme.spacing.sm} 0;
  overflow-x: auto;
  font-family: ${vibeTheme.typography.fontFamily.mono};
  font-size: ${vibeTheme.typography.fontSize.sm};
  color: ${vibeTheme.colors.text};
  max-height: 150px;
  overflow-y: auto;
`;

const Explanation = styled.div`
  font-size: ${vibeTheme.typography.fontSize.sm};
  color: ${vibeTheme.colors.textSecondary};
  line-height: 1.5;
  margin-top: ${vibeTheme.spacing.sm};
  padding-top: ${vibeTheme.spacing.sm};
  border-top: 1px solid rgba(139, 92, 246, 0.1);
`;

const ContextTags = styled.div`
  display: flex;
  gap: ${vibeTheme.spacing.xs};
  margin-top: ${vibeTheme.spacing.sm};
  flex-wrap: wrap;
`;

const ContextTag = styled.span`
  padding: 2px 6px;
  border-radius: ${vibeTheme.borderRadius.small};
  font-size: ${vibeTheme.typography.fontSize.xs};
  background: rgba(139, 92, 246, 0.1);
  color: ${vibeTheme.colors.text};
  font-family: ${vibeTheme.typography.fontFamily.mono};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${vibeTheme.spacing.xl} ${vibeTheme.spacing.md};
  color: ${vibeTheme.colors.textSecondary};
`;

const EmptyIcon = styled.div`
  margin-bottom: ${vibeTheme.spacing.md};
  opacity: 0.5;
`;

const EmptyText = styled.div`
  font-size: ${vibeTheme.typography.fontSize.sm};
  line-height: 1.6;
`;

const LoadingState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${vibeTheme.spacing.xl};
  color: ${vibeTheme.colors.textSecondary};

  svg {
    animation: spin 1s linear infinite;
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

export interface SemanticSearchPanelProps {
  aiService: UnifiedAIService;
  onClose: () => void;
  onResultClick?: (result: SearchResult) => void;
}

export const SemanticSearchPanel = ({ aiService, onClose, onResultClick }: SemanticSearchPanelProps) => {
  const [searchService] = useState(() => new SemanticSearchService(aiService));
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [metadata, setMetadata] = useState<SearchMetadata | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const exampleQueries = [
    'find authentication logic',
    'show API endpoints',
    'where is error handling',
    'find database queries',
    'show React components',
  ];

  const handleSearch = async () => {
    if (!query.trim() || isSearching) {
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      const searchQuery: SearchQuery = {
        query: query.trim(),
        maxResults: 10,
      };

      const searchResults = await searchService.search(searchQuery);

      setResults(searchResults.results);
      setMetadata(searchResults.metadata);

      logger.info('[SemanticSearchPanel] Search complete:', {
        query: query.trim(),
        results: searchResults.results.length,
      });
    } catch (error) {
      logger.error('[SemanticSearchPanel] Search failed:', error);
      setResults([]);
      setMetadata(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
    // Trigger search after short delay to show query update
    setTimeout(async () => handleSearch(), 100);
  };

  const handleResultClick = (result: SearchResult) => {
    logger.info('[SemanticSearchPanel] Result clicked:', result.filePath);
    onResultClick?.(result);
  };

  // Auto-index files on mount (mock implementation)
  useEffect(() => {
    // TODO: Integrate with workspace file system
    // For now, add some example files for testing
    searchService.addFile(
      'src/services/AuthService.ts',
      `
export class AuthService {
  async login(email: string, password: string) {
    // Authentication logic
    const user = await this.validateCredentials(email, password);
    return this.generateToken(user);
  }

  private async validateCredentials(email: string, password: string) {
    // Validate user credentials
    return await db.users.findOne({ email, password });
  }
}
      `,
      'typescript'
    );

    const indexStats = searchService.getIndexStats();
    logger.info('[SemanticSearchPanel] Index loaded:', indexStats);
  }, [searchService]);

  return (
    <Container>
      <Header>
        <Title>
          <Sparkles size={20} />
          Semantic Search
        </Title>
        <CloseButton onClick={onClose}>
          <X size={16} />
        </CloseButton>
      </Header>

      <SearchContainer>
        <SearchWrapper>
          <SearchIcon size={20} />
          <SearchInput
            type="text"
            placeholder="Ask in natural language (e.g., 'find authentication logic')"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isSearching}
          />
          <SearchButton onClick={handleSearch} disabled={isSearching || !query.trim()}>
            {isSearching ? (
              <>
                <Loader2 size={14} />
                Searching...
              </>
            ) : (
              <>
                <Search size={14} />
                Search
              </>
            )}
          </SearchButton>
        </SearchWrapper>

        <ExampleQueries>
          {exampleQueries.map(example => (
            <ExampleQuery key={example} onClick={() => handleExampleClick(example)}>
              {example}
            </ExampleQuery>
          ))}
        </ExampleQueries>
      </SearchContainer>

      <Content>
        {metadata && (
          <MetadataBar>
            <MetadataItem>
              <FileCode size={12} />
              {metadata.filesSearched} files searched
            </MetadataItem>
            <MetadataItem>
              <Zap size={12} />
              {metadata.searchTime}ms
            </MetadataItem>
            <MetadataItem>
              <Brain size={12} />
              {metadata.modelUsed}
            </MetadataItem>
          </MetadataBar>
        )}

        {isSearching && (
          <LoadingState>
            <Loader2 size={32} />
            <div style={{ marginTop: vibeTheme.spacing.sm }}>Analyzing code with AI...</div>
          </LoadingState>
        )}

        {!isSearching && hasSearched && results.length === 0 && (
          <EmptyState>
            <EmptyIcon>
              <Search size={48} />
            </EmptyIcon>
            <EmptyText>
              No results found for "{query}"
              <br />
              Try rephrasing your query or using different keywords
            </EmptyText>
          </EmptyState>
        )}

        {!isSearching && !hasSearched && (
          <EmptyState>
            <EmptyIcon>
              <Brain size={48} />
            </EmptyIcon>
            <EmptyText>
              Search your codebase using natural language
              <br />
              <small>Example: "find authentication logic" or "show React components"</small>
            </EmptyText>
          </EmptyState>
        )}

        {!isSearching && results.length > 0 && (
          <ResultsList>
            {results.map(result => (
              <ResultCard
                key={result.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => handleResultClick(result)}
              >
                <ResultHeader>
                  <ResultInfo>
                    <ResultFile>
                      <Code2 size={16} />
                      {result.fileName}
                      <ChevronRight size={12} style={{ opacity: 0.5 }} />
                      Line {result.lineNumber}
                    </ResultFile>
                    <ResultPath>{result.filePath}</ResultPath>
                  </ResultInfo>
                  <RelevanceBadge $score={result.relevanceScore}>{Math.round(result.relevanceScore)}%</RelevanceBadge>
                </ResultHeader>

                <CodeSnippet>{result.snippet}</CodeSnippet>

                {result.context && (
                  <ContextTags>
                    {result.context.functionName && <ContextTag>fn: {result.context.functionName}</ContextTag>}
                    {result.context.className && <ContextTag>class: {result.context.className}</ContextTag>}
                    {result.context.exports && result.context.exports.length > 0 && (
                      <ContextTag>exports: {result.context.exports.length}</ContextTag>
                    )}
                  </ContextTags>
                )}

                {result.explanation && <Explanation>{result.explanation}</Explanation>}
              </ResultCard>
            ))}
          </ResultsList>
        )}
      </Content>
    </Container>
  );
};

export default SemanticSearchPanel;
