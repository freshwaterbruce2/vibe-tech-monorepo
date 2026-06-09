/**
 * AIChat Styled Components - Input
 * Input area, send button, typing indicator, and quick actions.
 */
import { motion } from 'framer-motion';
import styled from 'styled-components';

import { vibeTheme } from '../../styles/theme';
import { shouldForwardMotionProp } from '../../utils/motionProps';

import { pulse } from './styled.shared';

// ============================================================================
// Input Components
// ============================================================================

export const InputContainer = styled.div`
  padding: ${vibeTheme.spacing.md};
  border-top: 2px solid rgba(139, 92, 246, 0.2);
  background: linear-gradient(
    135deg,
    ${vibeTheme.colors.primary} 0%,
    ${vibeTheme.colors.secondary} 100%
  );
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: ${vibeTheme.gradients.border};
    opacity: 0.6;
  }
`;

export const InputWrapper = styled.div`
  display: flex;
  gap: ${vibeTheme.spacing.sm};
  align-items: flex-end;
`;

export const TextInput = styled.textarea`
  flex: 1;
  background: rgba(26, 26, 46, 0.8);
  border: 2px solid rgba(139, 92, 246, 0.2);
  color: ${vibeTheme.colors.text};
  padding: ${vibeTheme.spacing.sm} ${vibeTheme.spacing.md};
  border-radius: ${vibeTheme.borderRadius.medium};
  font-size: ${vibeTheme.typography.fontSize.sm};
  resize: none;
  min-height: 40px;
  max-height: 120px;
  font-family: ${vibeTheme.typography.fontFamily.primary};
  backdrop-filter: blur(10px);
  transition: all ${vibeTheme.animation.duration.normal} ease;

  &:focus {
    outline: none;
    border-color: ${vibeTheme.colors.cyan};
    background: rgba(26, 26, 46, 1);
    box-shadow: 0 0 12px rgba(0, 212, 255, 0.3);
    transform: scale(1.02);
  }

  &::placeholder {
    color: ${vibeTheme.colors.textMuted};
  }
`;

export const SendButton = styled(motion.button).withConfig({
  shouldForwardProp: shouldForwardMotionProp,
})<{ disabled: boolean }>`
  background: ${(props) =>
        props.disabled ? 'rgba(139, 92, 246, 0.2)' : vibeTheme.gradients.primary};
  border: 2px solid ${(props) => (props.disabled ? 'rgba(139, 92, 246, 0.1)' : 'transparent')};
  color: ${(props) => (props.disabled ? vibeTheme.colors.textMuted : vibeTheme.colors.text)};
  padding: ${vibeTheme.spacing.sm};
  border-radius: ${vibeTheme.borderRadius.medium};
  cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  transition: all ${vibeTheme.animation.duration.normal} ease;
  box-shadow: ${(props) => (props.disabled ? 'none' : vibeTheme.shadows.small)};

  &:hover:not(:disabled) {
    transform: scale(1.05);
    box-shadow:
      ${vibeTheme.shadows.medium},
      0 0 16px rgba(139, 92, 246, 0.4);
  }

  &:active:not(:disabled) {
    transform: scale(0.95);
  }
`;

export const TypingIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing.sm};
  padding: ${vibeTheme.spacing.sm} 0;
  color: ${vibeTheme.colors.cyan};
  font-size: ${vibeTheme.typography.fontSize.sm};
  font-style: italic;

  &::after {
    content: '';
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${vibeTheme.colors.cyan};
    animation: ${pulse} 1.4s infinite;
    box-shadow: 0 0 8px ${vibeTheme.colors.cyan};
  }
`;

// ============================================================================
// Quick Actions
// ============================================================================

export const QuickActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${vibeTheme.spacing.xs};
  margin-bottom: ${vibeTheme.spacing.sm};
`;

export const QuickActionButton = styled(motion.button).withConfig({
  shouldForwardProp: shouldForwardMotionProp,
})`
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.3);
  color: ${vibeTheme.colors.textSecondary};
  padding: ${vibeTheme.spacing.xs} ${vibeTheme.spacing.sm};
  border-radius: ${vibeTheme.borderRadius.small};
  cursor: pointer;
  font-size: ${vibeTheme.typography.fontSize.xs};
  font-weight: ${vibeTheme.typography.fontWeight.medium};
  transition: all ${vibeTheme.animation.duration.fast} ease;
  backdrop-filter: blur(10px);

  &:hover {
    background: rgba(139, 92, 246, 0.2);
    border-color: ${vibeTheme.colors.cyan};
    color: ${vibeTheme.colors.text};
    transform: translateY(-1px);
    box-shadow: ${vibeTheme.shadows.small};
  }
`;
