/**
 * AIChat Styled Components - Messages
 * Message list, individual messages, and reasoning display.
 * Note: Message and MessageActions are intentionally colocated --
 * MessageActions interpolates ${Message} in its CSS selector.
 */
import { motion } from 'framer-motion';
import styled from 'styled-components';

import { vibeTheme } from '../../styles/theme';
import { shouldForwardMotionProp } from '../../utils/motionProps';

// ============================================================================
// Message Components
// ============================================================================

export const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${vibeTheme.spacing.md};
  display: flex;
  flex-direction: column;
  gap: ${vibeTheme.spacing.md};

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: ${vibeTheme.colors.primary};
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(139, 92, 246, 0.3);
    border-radius: ${vibeTheme.borderRadius.small};

    &:hover {
      background: rgba(139, 92, 246, 0.5);
    }
  }
`;

export const Message = styled(motion.div).withConfig({
  shouldForwardProp: shouldForwardMotionProp,
})<{ role: 'user' | 'assistant' }>`
  display: flex;
  align-items: flex-start;
  gap: ${vibeTheme.spacing.sm};
  max-width: 100%;
  padding: ${vibeTheme.spacing.sm};
  border-radius: ${vibeTheme.borderRadius.medium};
  transition: all ${vibeTheme.animation.duration.fast} ease;

  &:hover {
    background: rgba(139, 92, 246, 0.05);
  }
`;

export const MessageIcon = styled.div<{ role: 'user' | 'assistant' }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${(props) =>
        props.role === 'user' ? vibeTheme.gradients.primary : vibeTheme.gradients.secondary};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
  box-shadow: ${vibeTheme.shadows.small};
  border: 2px solid
    ${(props) => (props.role === 'user' ? vibeTheme.colors.cyan : vibeTheme.colors.purple)};

  svg {
    color: ${vibeTheme.colors.text};
    filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.3));
  }
`;

export const MessageContent = styled.div`
  flex: 1;
  min-width: 0;
`;

export const MessageActions = styled.div`
  display: flex;
  gap: 4px;
  margin-top: 4px;
  opacity: 0;
  transition: opacity 0.2s;

  ${Message}:hover & {
    opacity: 1;
  }
`;

export const ActionButton = styled(motion.button).withConfig({
  shouldForwardProp: shouldForwardMotionProp,
})`
  background: transparent;
  border: none;
  color: ${vibeTheme.colors.textMuted};
  cursor: pointer;
  padding: ${vibeTheme.spacing.xs};
  border-radius: ${vibeTheme.borderRadius.small};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all ${vibeTheme.animation.duration.fast} ease;

  &:hover {
    background: rgba(139, 92, 246, 0.2);
    color: ${vibeTheme.colors.cyan};
    transform: scale(1.1);
  }
`;

export const MessageTime = styled.div`
  font-size: ${vibeTheme.typography.fontSize.xs};
  color: ${vibeTheme.colors.textMuted};
  margin-top: ${vibeTheme.spacing.xs};
  font-weight: ${vibeTheme.typography.fontWeight.medium};
`;

export const ReasoningContent = styled.details`
  margin-top: ${vibeTheme.spacing.sm};
  padding: ${vibeTheme.spacing.sm};
  background: rgba(139, 92, 246, 0.1);
  border-radius: ${vibeTheme.borderRadius.small};
  border: 1px solid rgba(139, 92, 246, 0.2);

  summary {
    cursor: pointer;
    color: ${vibeTheme.colors.purple};
    font-size: ${vibeTheme.typography.fontSize.sm};
    font-weight: ${vibeTheme.typography.fontWeight.medium};
    margin-bottom: ${vibeTheme.spacing.xs};

    &:hover {
      color: ${vibeTheme.colors.cyan};
    }
  }

  pre {
    margin: 0;
    padding: ${vibeTheme.spacing.sm};
    background: rgba(26, 26, 46, 0.5);
    border-radius: ${vibeTheme.borderRadius.small};
    overflow-x: auto;
    font-size: ${vibeTheme.typography.fontSize.xs};
    line-height: 1.5;
  }
`;
