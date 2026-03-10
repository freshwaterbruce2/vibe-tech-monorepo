/**
 * Refactoring Panel Component
 * AI-powered code refactoring with preview and one-click apply
 */

import { motion } from 'framer-motion';
import {
  Check,
  Code2,
  Loader2,
  RefreshCw,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { useEffect } from 'react';
import styled from 'styled-components';

import { vibeTheme } from '../styles/theme';

import type { RefactoringAction, RefactoringResult } from '../hooks/useRefactoring';

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

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${vibeTheme.spacing.md};
`;

const Section = styled.div`
  margin-bottom: ${vibeTheme.spacing.lg};
`;

const SectionTitle = styled.h4`
  margin: 0 0 ${vibeTheme.spacing.sm} 0;
  font-size: ${vibeTheme.typography.fontSize.sm};
  font-weight: ${vibeTheme.typography.fontWeight.semibold};
  color: ${vibeTheme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const ActionCard = styled(motion.button)`
  width: 100%;
  background: rgba(139, 92, 246, 0.05);
  border: 1px solid rgba(139, 92, 246, 0.1);
  border-radius: ${vibeTheme.borderRadius.medium};
  padding: ${vibeTheme.spacing.md};
  margin-bottom: ${vibeTheme.spacing.sm};
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;

  &:hover {
    background: rgba(139, 92, 246, 0.1);
    border-color: rgba(139, 92, 246, 0.3);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ActionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing.sm};
  margin-bottom: ${vibeTheme.spacing.xs};
`;

const ActionIcon = styled.span`
  font-size: 20px;
`;

const ActionLabel = styled.div`
  flex: 1;
  font-size: ${vibeTheme.typography.fontSize.md};
  font-weight: ${vibeTheme.typography.fontWeight.semibold};
  color: ${vibeTheme.colors.text};
`;

const ConfidenceBadge = styled.span<{ $confidence: 'high' | 'medium' | 'low' }>`
  padding: 2px 8px;
  border-radius: ${vibeTheme.borderRadius.small};
  font-size: ${vibeTheme.typography.fontSize.xs};
  font-weight: ${vibeTheme.typography.fontWeight.medium};
  background: ${props =>
    props.$confidence === 'high'
      ? 'rgba(16, 185, 129, 0.1)'
      : props.$confidence === 'medium'
      ? 'rgba(245, 158, 11, 0.1)'
      : 'rgba(239, 68, 68, 0.1)'};
  color: ${props =>
    props.$confidence === 'high'
      ? '#10b981'
      : props.$confidence === 'medium'
      ? '#f59e0b'
      : '#ef4444'};
`;

const ActionDescription = styled.div`
  font-size: ${vibeTheme.typography.fontSize.sm};
  color: ${vibeTheme.colors.textSecondary};
  line-height: 1.5;
`;

const PreviewContainer = styled.div`
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: ${vibeTheme.borderRadius.medium};
  padding: ${vibeTheme.spacing.md};
  margin-bottom: ${vibeTheme.spacing.md};
`;

const PreviewHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${vibeTheme.spacing.sm};
`;

const PreviewTitle = styled.div`
  font-size: ${vibeTheme.typography.fontSize.sm};
  font-weight: ${vibeTheme.typography.fontWeight.semibold};
  color: ${vibeTheme.colors.text};
`;

const PreviewMeta = styled.div`
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing.sm};
  font-size: ${vibeTheme.typography.fontSize.xs};
  color: ${vibeTheme.colors.textSecondary};
`;

const CodePreview = styled.pre`
  background: rgba(0, 0, 0, 0.3);
  border-radius: ${vibeTheme.borderRadius.small};
  padding: ${vibeTheme.spacing.md};
  margin: ${vibeTheme.spacing.sm} 0;
  overflow-x: auto;
  font-family: ${vibeTheme.typography.fontFamily.mono};
  font-size: ${vibeTheme.typography.fontSize.sm};
  color: ${vibeTheme.colors.text};
  max-height: 300px;
  overflow-y: auto;
`;

const PreviewActions = styled.div`
  display: flex;
  gap: ${vibeTheme.spacing.sm};
  margin-top: ${vibeTheme.spacing.sm};
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
  flex: 1;
  padding: ${vibeTheme.spacing.sm} ${vibeTheme.spacing.md};
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
    props.$variant === 'primary' &&
    `
    background: ${vibeTheme.gradients.primary};
    border: none;
    color: ${vibeTheme.colors.text};

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
    }
  `}

  ${props =>
    props.$variant === 'secondary' &&
    `
    background: transparent;
    border: 1px solid rgba(139, 92, 246, 0.3);
    color: ${vibeTheme.colors.text};

    &:hover {
      background: rgba(139, 92, 246, 0.1);
    }
  `}

  ${props =>
    props.$variant === 'danger' &&
    `
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #ef4444;

    &:hover {
      background: rgba(239, 68, 68, 0.2);
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
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

export interface RefactoringPanelProps {
  actions: RefactoringAction[];
  preview: RefactoringResult | null;
  isAnalyzing: boolean;
  isRefactoring: boolean;
  onGeneratePreview: (action: RefactoringAction) => void;
  onApplyRefactoring: (result: RefactoringResult) => void;
  onCancelPreview: () => void;
  onAnalyzeSelection: () => void;
}

export const RefactoringPanel = ({
  actions,
  preview,
  isAnalyzing,
  isRefactoring,
  onGeneratePreview,
  onApplyRefactoring,
  onCancelPreview,
  onAnalyzeSelection,
}: RefactoringPanelProps) => {
  // Auto-analyze on mount
  useEffect(() => {
    onAnalyzeSelection();
  }, []);

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'extract-function':
      case 'extract-method':
        return '🔧';
      case 'rename':
        return '✏️';
      case 'convert-arrow':
        return '➡️';
      case 'add-types':
        return '🔷';
      case 'split-file':
        return '✂️';
      case 'inline-variable':
        return '📦';
      case 'move-to-file':
        return '📁';
      default:
        return '⚡';
    }
  };

  return (
    <Container>
      <Header>
        <Title>
          <Sparkles size={20} />
          Smart Refactoring
        </Title>
        <Button $variant="secondary" onClick={onAnalyzeSelection} disabled={isAnalyzing}>
          <RefreshCw size={16} />
          Refresh
        </Button>
      </Header>

      <Content>
        {/* Preview Section */}
        {preview && (
          <Section>
            <PreviewContainer>
              <PreviewHeader>
                <PreviewTitle>Preview: {preview.action.label}</PreviewTitle>
                <PreviewMeta>
                  <Zap size={12} />
                  {preview.generationTime}ms
                  <span>•</span>
                  {preview.modelUsed}
                </PreviewMeta>
              </PreviewHeader>

              <CodePreview>{preview.code}</CodePreview>

              <PreviewActions>
                <Button $variant="primary" onClick={() => onApplyRefactoring(preview)}>
                  <Check size={16} />
                  Apply Refactoring
                </Button>
                <Button $variant="danger" onClick={onCancelPreview}>
                  <X size={16} />
                  Cancel
                </Button>
              </PreviewActions>
            </PreviewContainer>
          </Section>
        )}

        {/* Available Actions Section */}
        {!preview && (
          <Section>
            <SectionTitle>Available Refactorings ({actions.length})</SectionTitle>

            {isAnalyzing && (
              <LoadingState>
                <Loader2 size={32} />
                <div style={{ marginTop: vibeTheme.spacing.sm }}>Analyzing code...</div>
              </LoadingState>
            )}

            {!isAnalyzing && actions.length === 0 && (
              <EmptyState>
                <EmptyIcon>
                  <Code2 size={48} />
                </EmptyIcon>
                <EmptyText>
                  Select code to see available refactorings
                  <br />
                  <small>Select 3+ lines for extract function, or hover over symbols to rename</small>
                </EmptyText>
              </EmptyState>
            )}

            {!isAnalyzing &&
              actions.map(action => (
                <ActionCard
                  key={action.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onGeneratePreview(action)}
                  disabled={isRefactoring}
                >
                  <ActionHeader>
                    <ActionIcon>{getActionIcon(action.type)}</ActionIcon>
                    <ActionLabel>{action.label}</ActionLabel>
                    <ConfidenceBadge $confidence={action.confidence}>{action.confidence}</ConfidenceBadge>
                  </ActionHeader>
                  <ActionDescription>{action.description}</ActionDescription>
                </ActionCard>
              ))}

            {isRefactoring && (
              <LoadingState>
                <Loader2 size={32} />
                <div style={{ marginTop: vibeTheme.spacing.sm }}>Generating refactoring...</div>
              </LoadingState>
            )}
          </Section>
        )}
      </Content>
    </Container>
  );
};

export default RefactoringPanel;
