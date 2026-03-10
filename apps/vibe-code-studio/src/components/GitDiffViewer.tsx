/**
 * Git Diff Viewer Component
 * Enhanced diff viewer with AI explanations and conflict resolution
 */

import { motion } from 'framer-motion';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  FileCode,
  GitBranch,
  GitMerge,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import styled from 'styled-components';

import { logger } from '../services/Logger';
import type { DiffAnalysis, FileDiff } from '../services/GitDiffService';
import { GitDiffService } from '../services/GitDiffService';
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

const SummaryBar = styled.div`
  padding: ${vibeTheme.spacing.md};
  border-bottom: 1px solid rgba(139, 92, 246, 0.1);
  background: rgba(139, 92, 246, 0.05);
`;

const SummaryStats = styled.div`
  display: flex;
  gap: ${vibeTheme.spacing.md};
  font-size: ${vibeTheme.typography.fontSize.sm};
  color: ${vibeTheme.colors.textSecondary};
`;

const Stat = styled.div`
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing.xs};
`;

const Addition = styled.span`
  color: #10b981;
`;

const Deletion = styled.span`
  color: #ef4444;
`;

const InsightsPanel = styled.div`
  padding: ${vibeTheme.spacing.md};
  border-bottom: 1px solid rgba(139, 92, 246, 0.1);
  background: rgba(139, 92, 246, 0.03);
`;

const InsightTitle = styled.div`
  font-size: ${vibeTheme.typography.fontSize.sm};
  font-weight: ${vibeTheme.typography.fontWeight.semibold};
  color: ${vibeTheme.colors.text};
  margin-bottom: ${vibeTheme.spacing.sm};
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing.xs};
`;

const InsightText = styled.div`
  font-size: ${vibeTheme.typography.fontSize.sm};
  color: ${vibeTheme.colors.textSecondary};
  line-height: 1.5;
  margin-bottom: ${vibeTheme.spacing.sm};
`;

const RiskBadge = styled.span<{ $level: 'low' | 'medium' | 'high' }>`
  padding: 2px 8px;
  border-radius: ${vibeTheme.borderRadius.small};
  font-size: ${vibeTheme.typography.fontSize.xs};
  font-weight: ${vibeTheme.typography.fontWeight.medium};
  background: ${props =>
    props.$level === 'high' ? 'rgba(239, 68, 68, 0.1)' : props.$level === 'medium' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)'};
  color: ${props => (props.$level === 'high' ? '#ef4444' : props.$level === 'medium' ? '#f59e0b' : '#10b981')};
`;

const Suggestions = styled.ul`
  margin: 0;
  padding-left: ${vibeTheme.spacing.lg};
  font-size: ${vibeTheme.typography.fontSize.sm};
  color: ${vibeTheme.colors.textSecondary};
  line-height: 1.6;
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${vibeTheme.spacing.md};
`;

const FileList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${vibeTheme.spacing.md};
`;

const FileCard = styled(motion.div)`
  background: rgba(139, 92, 246, 0.05);
  border: 1px solid rgba(139, 92, 246, 0.1);
  border-radius: ${vibeTheme.borderRadius.medium};
  overflow: hidden;
`;

const FileHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${vibeTheme.spacing.md};
  cursor: pointer;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(139, 92, 246, 0.08);
  }
`;

const FileInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing.sm};
`;

const FileName = styled.div`
  font-size: ${vibeTheme.typography.fontSize.md};
  font-weight: ${vibeTheme.typography.fontWeight.semibold};
  color: ${vibeTheme.colors.text};
`;

const FileStats = styled.div`
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing.sm};
  font-size: ${vibeTheme.typography.fontSize.xs};
  color: ${vibeTheme.colors.textSecondary};
`;

const ConflictBadge = styled.span`
  padding: 2px 8px;
  border-radius: ${vibeTheme.borderRadius.small};
  font-size: ${vibeTheme.typography.fontSize.xs};
  font-weight: ${vibeTheme.typography.fontWeight.medium};
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing.xs};
`;

const FileContent = styled.div<{ $expanded: boolean }>`
  max-height: ${props => (props.$expanded ? '600px' : '0')};
  overflow: hidden;
  transition: max-height 0.3s ease;
  border-top: ${props => (props.$expanded ? '1px solid rgba(139, 92, 246, 0.1)' : 'none')};
`;

const Explanation = styled.div`
  padding: ${vibeTheme.spacing.md};
  background: rgba(139, 92, 246, 0.03);
  border-bottom: 1px solid rgba(139, 92, 246, 0.1);
  font-size: ${vibeTheme.typography.fontSize.sm};
  color: ${vibeTheme.colors.textSecondary};
  line-height: 1.5;
`;

const DiffContent = styled.div`
  padding: ${vibeTheme.spacing.md};
  overflow-x: auto;
`;

const DiffLine = styled.div<{ $type: string }>`
  font-family: ${vibeTheme.typography.fontFamily.mono};
  font-size: ${vibeTheme.typography.fontSize.sm};
  padding: 2px ${vibeTheme.spacing.sm};
  white-space: pre;
  background: ${props =>
    props.$type === 'addition'
      ? 'rgba(16, 185, 129, 0.1)'
      : props.$type === 'deletion'
      ? 'rgba(239, 68, 68, 0.1)'
      : 'transparent'};
  color: ${props =>
    props.$type === 'addition'
      ? '#10b981'
      : props.$type === 'deletion'
      ? '#ef4444'
      : vibeTheme.colors.textSecondary};
  border-left: ${props =>
    props.$type === 'addition'
      ? '3px solid #10b981'
      : props.$type === 'deletion'
      ? '3px solid #ef4444'
      : '3px solid transparent'};
`;

const ConflictMarker = styled.div`
  background: rgba(245, 158, 11, 0.1);
  border-left: 3px solid #f59e0b;
  padding: ${vibeTheme.spacing.sm};
  margin: ${vibeTheme.spacing.xs} 0;
  font-family: ${vibeTheme.typography.fontFamily.mono};
  font-size: ${vibeTheme.typography.fontSize.xs};
  color: #f59e0b;
`;

const ConflictResolution = styled.div`
  padding: ${vibeTheme.spacing.md};
  background: rgba(245, 158, 11, 0.05);
  border-top: 1px solid rgba(245, 158, 11, 0.2);
`;

const ResolutionTitle = styled.div`
  font-size: ${vibeTheme.typography.fontSize.sm};
  font-weight: ${vibeTheme.typography.fontWeight.semibold};
  color: ${vibeTheme.colors.text};
  margin-bottom: ${vibeTheme.spacing.sm};
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing.xs};
`;

const ResolutionButtons = styled.div`
  display: flex;
  gap: ${vibeTheme.spacing.sm};
  margin-top: ${vibeTheme.spacing.sm};
`;

const ResolutionButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  flex: 1;
  padding: ${vibeTheme.spacing.xs} ${vibeTheme.spacing.sm};
  border-radius: ${vibeTheme.borderRadius.medium};
  font-size: ${vibeTheme.typography.fontSize.sm};
  font-weight: ${vibeTheme.typography.fontWeight.semibold};
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${vibeTheme.spacing.xs};

  ${props =>
    props.$variant === 'primary'
      ? `
    background: ${vibeTheme.gradients.primary};
    border: none;
    color: ${vibeTheme.colors.text};

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
    }
  `
      : `
    background: transparent;
    border: 1px solid rgba(139, 92, 246, 0.3);
    color: ${vibeTheme.colors.text};

    &:hover {
      background: rgba(139, 92, 246, 0.1);
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
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

export interface GitDiffViewerProps {
  aiService: UnifiedAIService;
  diffText: string;
  onClose: () => void;
}

export const GitDiffViewer = ({ aiService, diffText, onClose }: GitDiffViewerProps) => {
  const [diffService] = useState(() => new GitDiffService(aiService));
  const [analysis, setAnalysis] = useState<DiffAnalysis | null>(null);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Parse and analyze diff on mount
  React.useEffect(() => {
    const analyzeDiff = async () => {
      setIsAnalyzing(true);

      try {
        const files = diffService.parseDiff(diffText);
        const analyzedDiff = await diffService.analyzeDiff(files);

        setAnalysis(analyzedDiff);

        logger.info('[GitDiffViewer] Analysis complete:', analyzedDiff.summary);
      } catch (error) {
        logger.error('[GitDiffViewer] Failed to analyze diff:', error);
      } finally {
        setIsAnalyzing(false);
      }
    };

    analyzeDiff();
  }, [diffText, diffService]);

  const toggleFile = (fileId: string) => {
    setExpandedFiles(prev => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  };

  const getChangeIcon = (changeType: FileDiff['changeType']) => {
    switch (changeType) {
      case 'addition':
        return <Plus size={16} style={{ color: '#10b981' }} />;
      case 'deletion':
        return <Trash2 size={16} style={{ color: '#ef4444' }} />;
      case 'conflict':
        return <GitMerge size={16} style={{ color: '#f59e0b' }} />;
      default:
        return <FileCode size={16} />;
    }
  };

  const handleConflictResolution = async (file: FileDiff, resolution: 'ours' | 'theirs') => {
    logger.info('[GitDiffViewer] Resolving conflict:', file.filePath, resolution);
    // TODO: Implement conflict resolution
  };

  if (isAnalyzing) {
    return (
      <Container>
        <Header>
          <Title>
            <GitBranch size={20} />
            Git Diff
          </Title>
          <CloseButton onClick={onClose}>
            <X size={16} />
          </CloseButton>
        </Header>
        <LoadingState>
          <Loader2 size={32} />
          <div style={{ marginTop: vibeTheme.spacing.sm }}>Analyzing changes with AI...</div>
        </LoadingState>
      </Container>
    );
  }

  if (!analysis) {
    return (
      <Container>
        <Header>
          <Title>
            <GitBranch size={20} />
            Git Diff
          </Title>
          <CloseButton onClick={onClose}>
            <X size={16} />
          </CloseButton>
        </Header>
        <Content>
          <div style={{ textAlign: 'center', padding: vibeTheme.spacing.xl }}>
            No diff to display
          </div>
        </Content>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>
          <GitBranch size={20} />
          Git Diff
        </Title>
        <CloseButton onClick={onClose}>
          <X size={16} />
        </CloseButton>
      </Header>

      <SummaryBar>
        <SummaryStats>
          <Stat>
            <FileCode size={14} />
            {analysis.summary.filesChanged} files changed
          </Stat>
          <Stat>
            <Addition>+{analysis.summary.additions}</Addition>
          </Stat>
          <Stat>
            <Deletion>-{analysis.summary.deletions}</Deletion>
          </Stat>
          {analysis.summary.conflicts > 0 && (
            <Stat>
              <AlertTriangle size={14} style={{ color: '#f59e0b' }} />
              {analysis.summary.conflicts} conflicts
            </Stat>
          )}
        </SummaryStats>
      </SummaryBar>

      {analysis.aiInsights && (
        <InsightsPanel>
          <InsightTitle>
            <Sparkles size={16} />
            AI Insights
            <RiskBadge $level={analysis.aiInsights.riskAssessment}>
              {analysis.aiInsights.riskAssessment} risk
            </RiskBadge>
          </InsightTitle>
          <InsightText>{analysis.aiInsights.overallImpact}</InsightText>
          {analysis.aiInsights.suggestions.length > 0 && (
            <Suggestions>
              {analysis.aiInsights.suggestions.map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
            </Suggestions>
          )}
        </InsightsPanel>
      )}

      <Content>
        <FileList>
          {analysis.files.map(file => {
            const isExpanded = expandedFiles.has(file.id);

            return (
              <FileCard key={file.id}>
                <FileHeader onClick={() => toggleFile(file.id)}>
                  <FileInfo>
                    {getChangeIcon(file.changeType)}
                    <FileName>{file.fileName}</FileName>
                    {file.hasConflicts && (
                      <ConflictBadge>
                        <AlertTriangle size={12} />
                        Conflict
                      </ConflictBadge>
                    )}
                  </FileInfo>
                  <FileStats>
                    <Addition>+{file.stats.additions}</Addition>
                    <Deletion>-{file.stats.deletions}</Deletion>
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </FileStats>
                </FileHeader>

                <FileContent $expanded={isExpanded}>
                  {file.explanation && <Explanation>{file.explanation}</Explanation>}

                  <DiffContent>
                    {file.hunks.map(hunk => (
                      <div key={hunk.id}>
                        {hunk.lines.map((line, index) => (
                          <React.Fragment key={index}>
                            {line.type === 'conflict-marker' ? (
                              <ConflictMarker>{line.content}</ConflictMarker>
                            ) : (
                              <DiffLine $type={line.type}>{line.content}</DiffLine>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    ))}
                  </DiffContent>

                  {file.hasConflicts && (
                    <ConflictResolution>
                      <ResolutionTitle>
                        <GitMerge size={16} />
                        Resolve Conflict
                      </ResolutionTitle>
                      <ResolutionButtons>
                        <ResolutionButton $variant="secondary" onClick={async () => handleConflictResolution(file, 'ours')}>
                          <Check size={14} />
                          Accept Ours
                        </ResolutionButton>
                        <ResolutionButton
                          $variant="secondary"
                          onClick={async () => handleConflictResolution(file, 'theirs')}
                        >
                          <Check size={14} />
                          Accept Theirs
                        </ResolutionButton>
                        <ResolutionButton $variant="primary">
                          <Sparkles size={14} />
                          AI Suggestion
                        </ResolutionButton>
                      </ResolutionButtons>
                    </ConflictResolution>
                  )}
                </FileContent>
              </FileCard>
            );
          })}
        </FileList>
      </Content>
    </Container>
  );
};

export default GitDiffViewer;
