import { motion } from 'framer-motion';
import styled from 'styled-components';

import { shouldForwardMotionProp } from '../../utils/motionProps';
import { vibeTheme } from '../../styles/theme';

export const SidebarContainer = styled.div`
  width: 280px;
  background: ${vibeTheme.colors.secondary};
  border-right: 1px solid rgba(139, 92, 246, 0.15);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  position: relative;
`;

export const SidebarSection = styled.div`
  flex: 1;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(139, 92, 246, 0.2);
    border-radius: ${vibeTheme.borderRadius.full};

    &:hover {
      background: rgba(139, 92, 246, 0.4);
    }
  }
`;

export const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${vibeTheme.spacing[2]};
  padding: ${vibeTheme.spacing[4]};
  background: ${vibeTheme.colors.primary};
  border-bottom: 1px solid rgba(139, 92, 246, 0.1);
  font-size: ${vibeTheme.typography.fontSize.xs};
  font-weight: ${vibeTheme.typography.fontWeight.semibold};
  color: ${vibeTheme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: ${vibeTheme.typography.letterSpacing.wider};
`;

export const SectionHeaderTitle = styled.div`
  display: flex;
  align-items: center;
  min-width: 0;

  svg {
    margin-right: ${vibeTheme.spacing[2]};
    color: ${vibeTheme.colors.cyan};
    width: 14px;
    height: 14px;
  }
`;

export const SectionHeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing[1]};
`;

export const SearchContainer = styled.div`
  padding: ${vibeTheme.spacing[3]};
  border-bottom: 1px solid rgba(139, 92, 246, 0.1);
`;

export const SearchRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing[2]};
`;

export const SearchInput = styled.input`
  width: 100%;
  background: ${vibeTheme.colors.tertiary};
  border: 1px solid rgba(139, 92, 246, 0.2);
  color: ${vibeTheme.colors.text};
  padding: ${vibeTheme.spacing[2]} ${vibeTheme.spacing[3]};
  border-radius: ${vibeTheme.borderRadius.md};
  font-size: ${vibeTheme.typography.fontSize.sm};
  font-family: ${vibeTheme.typography.fontFamily.primary};
  transition: ${vibeTheme.animation.transition.all};
  height: 32px;

  &:hover {
    border-color: rgba(139, 92, 246, 0.3);
    background: ${vibeTheme.colors.elevated};
  }

  &:focus {
    outline: none;
    border-color: ${vibeTheme.colors.cyan};
    background: ${vibeTheme.colors.tertiary};
    box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.1);
  }

  &::placeholder {
    color: ${vibeTheme.colors.textMuted};
  }
`;

export const SearchActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing[1]};
  flex-shrink: 0;
`;

export const FileExplorer = styled.div`
  padding: ${vibeTheme.spacing[2]} 0;
`;

export const FileItem = styled(motion.div).withConfig({
  shouldForwardProp: shouldForwardMotionProp,
})<{ level: number; selected?: boolean }>`
  display: flex;
  align-items: center;
  padding: ${vibeTheme.spacing[2]} ${vibeTheme.spacing[3]} ${vibeTheme.spacing[2]}
    ${(props) => 12 + props.level * 16}px;
  cursor: pointer;
  font-size: ${vibeTheme.typography.fontSize.sm};
  color: ${(props) => (props.selected ? vibeTheme.colors.text : vibeTheme.colors.textSecondary)};
  background: ${(props) => (props.selected ? vibeTheme.colors.hover : 'transparent')};
  border-radius: ${vibeTheme.borderRadius.sm};
  margin: 1px ${vibeTheme.spacing[2]};
  transition: ${vibeTheme.animation.transition.all};
  position: relative;

  ${(props) =>
    props.selected &&
    `
    background: ${vibeTheme.colors.hoverStrong};
    box-shadow: ${vibeTheme.shadows.xs};

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 2px;
      background: ${vibeTheme.colors.cyan};
      border-radius: 0 ${vibeTheme.borderRadius.xs} ${vibeTheme.borderRadius.xs} 0;
    }
  `}

  &:hover {
    background: ${(props) =>
      props.selected ? vibeTheme.colors.active : vibeTheme.colors.hover};
    color: ${vibeTheme.colors.text};
  }
`;

export const FileIcon = styled.div<{ type: 'file' | 'directory'; $expanded?: boolean }>`
  margin-right: ${vibeTheme.spacing[2]};
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing[1]};
  color: ${(props) =>
    props.type === 'directory' ? vibeTheme.colors.cyan : vibeTheme.colors.textSecondary};
  transition: ${vibeTheme.animation.transition.colors};

  svg {
    width: 16px;
    height: 16px;
  }
`;

export const FileName = styled.span`
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: ${vibeTheme.typography.fontWeight.normal};
`;

export const EmptyState = styled.div`
  padding: ${vibeTheme.spacing[16]};
  text-align: center;
  color: ${vibeTheme.colors.textMuted};
  font-size: ${vibeTheme.typography.fontSize.sm};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${vibeTheme.spacing[4]};

  p {
    margin: 0;
    font-weight: ${vibeTheme.typography.fontWeight.medium};
    color: ${vibeTheme.colors.textSecondary};
  }
`;

export const OpenFolderButton = styled(motion.button).withConfig({
  shouldForwardProp: shouldForwardMotionProp,
})`
  background: ${vibeTheme.gradients.primary};
  border: none;
  color: ${vibeTheme.colors.text};
  padding: ${vibeTheme.spacing[3]} ${vibeTheme.spacing[6]};
  border-radius: ${vibeTheme.borderRadius.md};
  cursor: pointer;
  font-size: ${vibeTheme.typography.fontSize.sm};
  font-weight: ${vibeTheme.typography.fontWeight.medium};
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing[2]};
  transition: ${vibeTheme.animation.transition.all};
  box-shadow: ${vibeTheme.shadows.sm}, ${vibeTheme.shadows.glow};

  &:hover {
    transform: translateY(-1px);
    box-shadow: ${vibeTheme.shadows.md}, ${vibeTheme.shadows.glowStrong};
  }

  &:active {
    transform: translateY(0);
    box-shadow: ${vibeTheme.shadows.sm};
  }
`;

export const ActionButtons = styled.div`
  display: flex;
  gap: ${vibeTheme.spacing[2]};
  padding: ${vibeTheme.spacing[3]};
  border-top: 1px solid rgba(139, 92, 246, 0.1);
  background: ${vibeTheme.colors.primary};
`;
