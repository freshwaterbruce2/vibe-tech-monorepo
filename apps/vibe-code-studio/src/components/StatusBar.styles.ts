import { motion } from 'framer-motion';
import styled from 'styled-components';

import { vibeTheme } from '../styles/theme';
import { shouldForwardMotionProp } from '../utils/motionProps';

export const StatusBarContainer = styled.div`
  display: flex;
  align-items: center;
  height: 28px;
  background: ${vibeTheme.colors.primary};
  border-top: 1px solid rgba(139, 92, 246, 0.1);
  color: ${vibeTheme.colors.textSecondary};
  font-size: ${vibeTheme.typography.fontSize.xs};
  padding: 0 ${vibeTheme.spacing[4]};
  justify-content: space-between;
  flex-shrink: 0;
`;

export const LeftSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing[3]};
`;

export const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing[2]};
`;

export const StatusItem = styled(motion.div).withConfig({
  shouldForwardProp: shouldForwardMotionProp,
})`
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing[1]};
  cursor: pointer;
  padding: ${vibeTheme.spacing[1]} ${vibeTheme.spacing[2]};
  border-radius: ${vibeTheme.borderRadius.sm};
  background: transparent;
  transition: ${vibeTheme.animation.transition.all};
  font-weight: ${vibeTheme.typography.fontWeight.normal};
  color: ${vibeTheme.colors.textSecondary};

  &:hover {
    background: ${vibeTheme.colors.hover};
    color: ${vibeTheme.colors.text};
  }

  svg {
    color: inherit;
    width: 14px;
    height: 14px;
  }
`;

export const ToggleButton = styled(motion.button).withConfig({
  shouldForwardProp: prop => prop !== 'active' && shouldForwardMotionProp(prop),
})<{ active: boolean }>`
  background: ${props => (props.active ? vibeTheme.colors.hoverStrong : 'transparent')};
  border: 1px solid ${props => (props.active ? 'rgba(0, 212, 255, 0.3)' : 'transparent')};
  color: ${props => (props.active ? vibeTheme.colors.text : vibeTheme.colors.textSecondary)};
  cursor: pointer;
  padding: ${vibeTheme.spacing[1]} ${vibeTheme.spacing[2]};
  border-radius: ${vibeTheme.borderRadius.sm};
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing[1]};
  font-size: ${vibeTheme.typography.fontSize.xs};
  font-weight: ${vibeTheme.typography.fontWeight.normal};
  font-family: ${vibeTheme.typography.fontFamily.primary};
  transition: ${vibeTheme.animation.transition.all};

  &:hover {
    background: ${props => (props.active ? vibeTheme.colors.active : vibeTheme.colors.hover)};
    color: ${vibeTheme.colors.text};
  }

  svg {
    color: ${props => (props.active ? vibeTheme.colors.cyan : 'inherit')};
    width: 14px;
    height: 14px;
  }
`;

export const Separator = styled.div`
  width: 1px;
  height: 16px;
  background: rgba(139, 92, 246, 0.2);
  border-radius: ${vibeTheme.borderRadius.full};
`;
