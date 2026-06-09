/**
 * AIChat Styled Components - Agent
 * Agent step cards, status display, and approval UI.
 */
import { motion } from 'framer-motion';
import styled from 'styled-components';

import { vibeTheme } from '../../styles/theme';
import { shouldForwardMotionProp } from '../../utils/motionProps';

import type { StepStatus } from '../../types';

// ============================================================================
// Agent Step Components
// ============================================================================

export const AgentStepsList = styled.div`
  margin-top: ${vibeTheme.spacing.sm};
  display: flex;
  flex-direction: column;
  gap: ${vibeTheme.spacing.xs};
`;

export const CompactStepCard = styled(motion.div).withConfig({
  shouldForwardProp: shouldForwardMotionProp,
})<{ $status: StepStatus }>`
  padding: ${vibeTheme.spacing.sm};
  border-radius: ${vibeTheme.borderRadius.small};
  background: ${props => {
        switch (props.$status) {
            case 'in_progress': return 'rgba(139, 92, 246, 0.1)';
            case 'completed': return 'rgba(34, 197, 94, 0.1)';
            case 'failed': return 'rgba(239, 68, 68, 0.1)';
            case 'awaiting_approval': return 'rgba(251, 191, 36, 0.1)';
            default: return 'rgba(100, 116, 139, 0.05)';
        }
    }};
  border: 1px solid ${props => {
        switch (props.$status) {
            case 'in_progress': return vibeTheme.colors.purple;
            case 'completed': return vibeTheme.colors.success;
            case 'failed': return vibeTheme.colors.error;
            case 'awaiting_approval': return '#fbbf24';
            default: return 'rgba(100, 116, 139, 0.2)';
        }
    }};
`;

export const StepHeaderCompact = styled.div`
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing.xs};
  margin-bottom: 4px;
`;

export const StepIconCompact = styled.div<{ $status: StepStatus }>`
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: ${props => {
        switch (props.$status) {
            case 'in_progress': return vibeTheme.colors.purple;
            case 'completed': return vibeTheme.colors.success;
            case 'failed': return vibeTheme.colors.error;
            case 'awaiting_approval': return '#fbbf24';
            default: return vibeTheme.colors.textMuted;
        }
    }};
`;

export const StepTitleCompact = styled.div`
  font-size: ${vibeTheme.typography.fontSize.sm};
  font-weight: ${vibeTheme.typography.fontWeight.medium};
  color: ${vibeTheme.colors.text};
  flex: 1;
`;

export const StepDescriptionCompact = styled.div`
  font-size: ${vibeTheme.typography.fontSize.xs};
  color: ${vibeTheme.colors.textSecondary};
  line-height: 1.4;
  margin-left: 28px;
`;

export const TaskProgressBar = styled.div`
  margin-top: ${vibeTheme.spacing.sm};
  background: rgba(100, 116, 139, 0.2);
  border-radius: ${vibeTheme.borderRadius.small};
  height: 4px;
  overflow: hidden;
`;

export const TaskProgressFill = styled(motion.div).withConfig({
  shouldForwardProp: shouldForwardMotionProp,
})<{ $progress: number }>`
  height: 100%;
  background: ${vibeTheme.gradients.primary};
  width: ${props => props.$progress}%;
  transition: width 0.3s ease;
`;

export const AgentStatusCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${vibeTheme.spacing.xs};
  padding: ${vibeTheme.spacing.sm};
  border-radius: ${vibeTheme.borderRadius.small};
  background: rgba(15, 23, 42, 0.35);
  border: 1px solid rgba(139, 92, 246, 0.18);
`;

export const AgentStatusHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${vibeTheme.spacing.sm};
`;

export const AgentStatusBadge = styled.span<{ $phase: 'planning' | 'executing' | 'awaiting_approval' | 'completed' | 'failed' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 8px;
  border-radius: ${vibeTheme.borderRadius.full};
  font-size: ${vibeTheme.typography.fontSize.xs};
  font-weight: ${vibeTheme.typography.fontWeight.semibold};
  text-transform: uppercase;
  letter-spacing: ${vibeTheme.typography.letterSpacing.wider};
  background: ${(props) => {
    switch (props.$phase) {
      case 'planning':
        return 'rgba(59, 130, 246, 0.18)';
      case 'executing':
        return 'rgba(139, 92, 246, 0.18)';
      case 'awaiting_approval':
        return 'rgba(251, 191, 36, 0.18)';
      case 'completed':
        return 'rgba(34, 197, 94, 0.18)';
      case 'failed':
        return 'rgba(239, 68, 68, 0.18)';
    }
  }};
  color: ${(props) => {
    switch (props.$phase) {
      case 'planning':
        return vibeTheme.colors.info;
      case 'executing':
        return vibeTheme.colors.purple;
      case 'awaiting_approval':
        return vibeTheme.colors.warning;
      case 'completed':
        return vibeTheme.colors.success;
      case 'failed':
        return vibeTheme.colors.error;
    }
  }};
`;

export const AgentStatusText = styled.div`
  font-size: ${vibeTheme.typography.fontSize.sm};
  color: ${vibeTheme.colors.text};
  line-height: 1.5;
`;

export const AgentWarningList = styled.ul`
  margin: 0;
  padding-left: ${vibeTheme.spacing[4]};
  color: ${vibeTheme.colors.warning};
  font-size: ${vibeTheme.typography.fontSize.xs};
  line-height: 1.5;
`;

// ============================================================================
// Approval Components
// ============================================================================

export const ApprovalPromptCompact = styled(motion.div).withConfig({
  shouldForwardProp: shouldForwardMotionProp,
})`
  margin-top: ${vibeTheme.spacing.xs};
  padding: ${vibeTheme.spacing.sm};
  background: rgba(251, 191, 36, 0.15);
  border: 1px solid #fbbf24;
  border-radius: ${vibeTheme.borderRadius.small};
`;

export const ApprovalButton = styled(motion.button).withConfig({
  shouldForwardProp: shouldForwardMotionProp,
})<{ $variant: 'approve' | 'reject' }>`
  flex: 1;
  padding: 6px 12px;
  border: none;
  border-radius: ${vibeTheme.borderRadius.small};
  font-size: ${vibeTheme.typography.fontSize.xs};
  font-weight: ${vibeTheme.typography.fontWeight.medium};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: ${props => props.$variant === 'approve' ? vibeTheme.colors.success : vibeTheme.colors.error};
  color: white;
  transition: all 0.2s ease;

  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
`;
