/**
 * AIChat Styled Components - Header
 * Chat header, mode switcher, mode description, and close button.
 */
import { motion } from 'framer-motion';
import styled from 'styled-components';

import { vibeTheme } from '../../styles/theme';
import { shouldForwardMotionProp } from '../../utils/motionProps';

// ============================================================================
// Header Components
// ============================================================================

export const ChatHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing.sm};
  padding: ${vibeTheme.spacing.md};
  background: linear-gradient(
    135deg,
    ${vibeTheme.colors.primary} 0%,
    ${vibeTheme.colors.secondary} 100%
  );
  border-bottom: 2px solid rgba(139, 92, 246, 0.2);
  font-size: ${vibeTheme.typography.fontSize.sm};
  font-weight: ${vibeTheme.typography.fontWeight.bold};
  color: ${vibeTheme.colors.text};
  position: relative;

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: ${vibeTheme.gradients.border};
    opacity: 0.6;
  }

  svg {
    color: ${vibeTheme.colors.cyan};
    filter: drop-shadow(0 0 4px ${vibeTheme.colors.cyan}50);
  }
`;

export const ModeSwitcher = styled.div`
  display: flex;
  gap: 4px;
  background: rgba(139, 92, 246, 0.1);
  padding: 4px;
  border-radius: 8px;
  border: 1px solid rgba(139, 92, 246, 0.2);
`;

export const ModeButton = styled(motion.button).withConfig({
  shouldForwardProp: shouldForwardMotionProp,
})<{ $active: boolean }>`
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${props => props.$active ? vibeTheme.colors.purple : 'transparent'};
  color: ${props => props.$active ? 'white' : vibeTheme.colors.textSecondary};
  position: relative;

  &:hover {
    background: ${props => props.$active ? vibeTheme.colors.purple : 'rgba(139, 92, 246, 0.2)'};
    color: ${props => props.$active ? 'white' : vibeTheme.colors.text};
  }
`;

export const ModeDescription = styled(motion.div).withConfig({
  shouldForwardProp: shouldForwardMotionProp,
})`
  padding: ${vibeTheme.spacing.sm};
  margin: ${vibeTheme.spacing.sm} ${vibeTheme.spacing.md};
  background: rgba(139, 92, 246, 0.1);
  border-left: 3px solid ${vibeTheme.colors.purple};
  border-radius: 4px;
  font-size: 12px;
  color: ${vibeTheme.colors.textSecondary};
  line-height: 1.5;

  strong {
    color: ${vibeTheme.colors.text};
    display: block;
    margin-bottom: 4px;
  }
`;

export const AgentEmptyState = styled(motion.div).withConfig({
  shouldForwardProp: shouldForwardMotionProp,
})`
  padding: ${vibeTheme.spacing.md};
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: ${vibeTheme.borderRadius.medium};
  background: rgba(139, 92, 246, 0.08);
  color: ${vibeTheme.colors.textSecondary};
  line-height: 1.6;

  strong {
    color: ${vibeTheme.colors.text};
    display: block;
    margin-bottom: ${vibeTheme.spacing.xs};
  }
`;

export const CloseButton = styled(motion.button).withConfig({
  shouldForwardProp: shouldForwardMotionProp,
})`
  background: transparent;
  border: none;
  color: ${vibeTheme.colors.textSecondary};
  cursor: pointer;
  padding: ${vibeTheme.spacing.sm};
  margin-left: auto;
  border-radius: ${vibeTheme.borderRadius.small};
  transition: all ${vibeTheme.animation.duration.fast} ease;

  &:hover {
    background: rgba(239, 68, 68, 0.2);
    color: ${vibeTheme.colors.error};
    transform: scale(1.05);
  }
`;
