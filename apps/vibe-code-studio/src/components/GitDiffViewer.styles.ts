import { motion } from 'framer-motion';
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

export const SummaryBar = styled.div`
  padding: ${vibeTheme.spacing.md};
  border-bottom: 1px solid rgba(139, 92, 246, 0.1);
  background: rgba(139, 92, 246, 0.05);
`;

export const SummaryStats = styled.div`
  display: flex;
  gap: ${vibeTheme.spacing.md};
  font-size: ${vibeTheme.typography.fontSize.sm};
  color: ${vibeTheme.colors.textSecondary};
`;

export const Stat = styled.div`
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing.xs};
`;

export const Addition = styled.span`
  color: #10b981;
`;

export const Deletion = styled.span`
  color: #ef4444;
`;

export const InsightsPanel = styled.div`
  padding: ${vibeTheme.spacing.md};
  border-bottom: 1px solid rgba(139, 92, 246, 0.1);
  background: rgba(139, 92, 246, 0.03);
`;

export const InsightTitle = styled.div`
  font-size: ${vibeTheme.typography.fontSize.sm};
  font-weight: ${vibeTheme.typography.fontWeight.semibold};
  color: ${vibeTheme.colors.text};
  margin-bottom: ${vibeTheme.spacing.sm};
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing.xs};
`;

export const InsightText = styled.div`
  font-size: ${vibeTheme.typography.fontSize.sm};
  color: ${vibeTheme.colors.textSecondary};
  line-height: 1.5;
  margin-bottom: ${vibeTheme.spacing.sm};
`;

export const RiskBadge = styled.span<{ $level: 'low' | 'medium' | 'high' }>`
  padding: 2px 8px;
  border-radius: ${vibeTheme.borderRadius.small};
  font-size: ${vibeTheme.typography.fontSize.xs};
  font-weight: ${vibeTheme.typography.fontWeight.medium};
  background: ${props =>
    props.$level === 'high' ? 'rgba(239, 68, 68, 0.1)' : props.$level === 'medium' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)'};
  color: ${props => (props.$level === 'high' ? '#ef4444' : props.$level === 'medium' ? '#f59e0b' : '#10b981')};
`;

export const Suggestions = styled.ul`
  margin: 0;
  padding-left: ${vibeTheme.spacing.lg};
  font-size: ${vibeTheme.typography.fontSize.sm};
  color: ${vibeTheme.colors.textSecondary};
  line-height: 1.6;
`;

export const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${vibeTheme.spacing.md};
`;

export const FileList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${vibeTheme.spacing.md};
`;

export const FileCard = styled(motion.div).withConfig({
  shouldForwardProp: shouldForwardMotionProp,
})`
  background: rgba(139, 92, 246, 0.05);
  border: 1px solid rgba(139, 92, 246, 0.1);
  border-radius: ${vibeTheme.borderRadius.medium};
  overflow: hidden;
`;

export const FileHeader = styled.div`
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

export const FileInfo = styled.div`
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing.sm};
`;

export const FileName = styled.div`
  font-size: ${vibeTheme.typography.fontSize.md};
  font-weight: ${vibeTheme.typography.fontWeight.semibold};
  color: ${vibeTheme.colors.text};
`;

export const FileStats = styled.div`
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing.sm};
  font-size: ${vibeTheme.typography.fontSize.xs};
  color: ${vibeTheme.colors.textSecondary};
`;

export const ConflictBadge = styled.span`
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

export const FileContent = styled.div<{ $expanded: boolean }>`
  max-height: ${props => (props.$expanded ? '600px' : '0')};
  overflow: hidden;
  transition: max-height 0.3s ease;
  border-top: ${props => (props.$expanded ? '1px solid rgba(139, 92, 246, 0.1)' : 'none')};
`;

export const Explanation = styled.div`
  padding: ${vibeTheme.spacing.md};
  background: rgba(139, 92, 246, 0.03);
  border-bottom: 1px solid rgba(139, 92, 246, 0.1);
  font-size: ${vibeTheme.typography.fontSize.sm};
  color: ${vibeTheme.colors.textSecondary};
  line-height: 1.5;
`;

export const DiffContent = styled.div`
  padding: ${vibeTheme.spacing.md};
  overflow-x: auto;
`;

export const DiffLine = styled.div<{ $type: string }>`
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

export const ConflictMarker = styled.div`
  background: rgba(245, 158, 11, 0.1);
  border-left: 3px solid #f59e0b;
  padding: ${vibeTheme.spacing.sm};
  margin: ${vibeTheme.spacing.xs} 0;
  font-family: ${vibeTheme.typography.fontFamily.mono};
  font-size: ${vibeTheme.typography.fontSize.xs};
  color: #f59e0b;
`;

export const ConflictResolution = styled.div`
  padding: ${vibeTheme.spacing.md};
  background: rgba(245, 158, 11, 0.05);
  border-top: 1px solid rgba(245, 158, 11, 0.2);
`;

export const ResolutionTitle = styled.div`
  font-size: ${vibeTheme.typography.fontSize.sm};
  font-weight: ${vibeTheme.typography.fontWeight.semibold};
  color: ${vibeTheme.colors.text};
  margin-bottom: ${vibeTheme.spacing.sm};
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing.xs};
`;

export const ResolutionButtons = styled.div`
  display: flex;
  gap: ${vibeTheme.spacing.sm};
  margin-top: ${vibeTheme.spacing.sm};
`;

export const ResolutionButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
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

export const ManualEditArea = styled.textarea`
  width: 100%;
  min-height: 120px;
  margin-top: ${vibeTheme.spacing.sm};
  padding: ${vibeTheme.spacing.sm};
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: ${vibeTheme.borderRadius.medium};
  color: ${vibeTheme.colors.text};
  font-family: ${vibeTheme.typography.fontFamily.mono};
  font-size: ${vibeTheme.typography.fontSize.sm};
  resize: vertical;
  line-height: 1.5;

  &:focus {
    outline: none;
    border-color: rgba(139, 92, 246, 0.6);
  }
`;

export const AISuggestionBox = styled.div`
  margin-top: ${vibeTheme.spacing.sm};
  padding: ${vibeTheme.spacing.sm};
  background: rgba(139, 92, 246, 0.08);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: ${vibeTheme.borderRadius.medium};
`;

export const AISuggestionText = styled.div`
  font-size: ${vibeTheme.typography.fontSize.sm};
  color: ${vibeTheme.colors.textSecondary};
  line-height: 1.5;
  margin-bottom: ${vibeTheme.spacing.xs};
`;

export const AISuggestionPreview = styled.pre`
  margin: ${vibeTheme.spacing.xs} 0;
  padding: ${vibeTheme.spacing.sm};
  background: rgba(0, 0, 0, 0.3);
  border-radius: ${vibeTheme.borderRadius.small};
  font-family: ${vibeTheme.typography.fontFamily.mono};
  font-size: ${vibeTheme.typography.fontSize.xs};
  color: ${vibeTheme.colors.text};
  overflow-x: auto;
  white-space: pre-wrap;
`;

export const ResolvedBanner = styled.div`
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing.xs};
  padding: ${vibeTheme.spacing.sm} ${vibeTheme.spacing.md};
  background: rgba(16, 185, 129, 0.1);
  border-top: 1px solid rgba(16, 185, 129, 0.2);
  font-size: ${vibeTheme.typography.fontSize.sm};
  color: #10b981;
  font-weight: ${vibeTheme.typography.fontWeight.medium};
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
