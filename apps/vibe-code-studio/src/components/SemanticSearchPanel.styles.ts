import { motion } from 'framer-motion';
import { Brain } from 'lucide-react';
import { shouldForwardMotionProp } from '../utils/motionProps';
import styled from 'styled-components';
import { vibeTheme } from '../styles/theme';

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: ${vibeTheme.colors.secondary};
  border-left: 1px solid rgba(139, 92, 246, 0.1);
`;

export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${vibeTheme.spacing.md};
  border-bottom: 1px solid rgba(139, 92, 246, 0.1);
`;

export const Title = styled.h3`
  margin: 0;
  font-size: ${vibeTheme.typography.fontSize.lg};
  font-weight: ${vibeTheme.typography.fontWeight.semibold};
  color: ${vibeTheme.colors.text};
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing.sm};
`;

export const CloseButton = styled.button`
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

export const SearchContainer = styled.div`
  padding: ${vibeTheme.spacing.md};
  border-bottom: 1px solid rgba(139, 92, 246, 0.1);
`;

export const SearchWrapper = styled.div`
  position: relative;
`;

export const SearchInput = styled.input`
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

export const SearchIcon = styled(Brain)`
  position: absolute;
  left: ${vibeTheme.spacing.sm};
  top: 50%;
  transform: translateY(-50%);
  color: rgba(139, 92, 246, 0.7);
  pointer-events: none;
`;

export const SearchButton = styled.button`
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

export const ExampleQueries = styled.div`
  display: flex;
  gap: ${vibeTheme.spacing.xs};
  margin-top: ${vibeTheme.spacing.sm};
  flex-wrap: wrap;
`;

export const ExampleQuery = styled.button`
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

export const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${vibeTheme.spacing.md};
`;

export const MetadataBar = styled.div`
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

export const MetadataItem = styled.div`
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing.xs};
`;

export const ResultsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${vibeTheme.spacing.md};
`;

export const ResultCard = styled(motion.div).withConfig({
  shouldForwardProp: shouldForwardMotionProp,
})`
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

export const ResultHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: ${vibeTheme.spacing.sm};
`;

export const ResultInfo = styled.div`
  flex: 1;
`;

export const ResultFile = styled.div`
  font-size: ${vibeTheme.typography.fontSize.sm};
  font-weight: ${vibeTheme.typography.fontWeight.semibold};
  color: ${vibeTheme.colors.text};
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing.xs};
`;

export const ResultPath = styled.div`
  font-size: ${vibeTheme.typography.fontSize.xs};
  color: ${vibeTheme.colors.textSecondary};
  margin-top: ${vibeTheme.spacing.xs};
`;

export const RelevanceBadge = styled.span<{ $score: number }>`
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

export const CodeSnippet = styled.pre`
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

export const Explanation = styled.div`
  font-size: ${vibeTheme.typography.fontSize.sm};
  color: ${vibeTheme.colors.textSecondary};
  line-height: 1.5;
  margin-top: ${vibeTheme.spacing.sm};
  padding-top: ${vibeTheme.spacing.sm};
  border-top: 1px solid rgba(139, 92, 246, 0.1);
`;

export const ContextTags = styled.div`
  display: flex;
  gap: ${vibeTheme.spacing.xs};
  margin-top: ${vibeTheme.spacing.sm};
  flex-wrap: wrap;
`;

export const ContextTag = styled.span`
  padding: 2px 6px;
  border-radius: ${vibeTheme.borderRadius.small};
  font-size: ${vibeTheme.typography.fontSize.xs};
  background: rgba(139, 92, 246, 0.1);
  color: ${vibeTheme.colors.text};
  font-family: ${vibeTheme.typography.fontFamily.mono};
`;

export const EmptyState = styled.div`
  text-align: center;
  padding: ${vibeTheme.spacing.xl} ${vibeTheme.spacing.md};
  color: ${vibeTheme.colors.textSecondary};
`;

export const EmptyIcon = styled.div`
  margin-bottom: ${vibeTheme.spacing.md};
  opacity: 0.5;
`;

export const EmptyText = styled.div`
  font-size: ${vibeTheme.typography.fontSize.sm};
  line-height: 1.6;
`;

export const LoadingState = styled.div`
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
