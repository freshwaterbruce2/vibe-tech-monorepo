import { motion } from 'framer-motion';
import styled from 'styled-components';

import { shouldForwardMotionProp } from '../utils/motionProps';
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

export const SearchInput = styled.input`
  width: 100%;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: ${vibeTheme.borderRadius.medium};
  padding: ${vibeTheme.spacing.sm} ${vibeTheme.spacing.md};
  padding-left: 36px;
  color: ${vibeTheme.colors.text};
  font-size: ${vibeTheme.typography.fontSize.sm};

  &:focus {
    outline: none;
    border-color: rgba(139, 92, 246, 0.5);
  }

  &::placeholder {
    color: ${vibeTheme.colors.textSecondary};
  }
`;

export const SearchIcon = styled.div`
  position: absolute;
  left: ${vibeTheme.spacing.md};
  top: 50%;
  transform: translateY(-50%);
  color: ${vibeTheme.colors.textSecondary};
  pointer-events: none;
  display: flex;
  align-items: center;
`;

export const SearchWrapper = styled.div`
  position: relative;
`;

export const FilterTabs = styled.div`
  display: flex;
  gap: ${vibeTheme.spacing.xs};
  padding: ${vibeTheme.spacing.md};
  border-bottom: 1px solid rgba(139, 92, 246, 0.1);
  overflow-x: auto;

  &::-webkit-scrollbar {
    height: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(139, 92, 246, 0.3);
    border-radius: 2px;
  }
`;

export const FilterTab = styled.button<{ $active: boolean }>`
  padding: ${vibeTheme.spacing.xs} ${vibeTheme.spacing.sm};
  border-radius: ${vibeTheme.borderRadius.small};
  border: 1px solid rgba(139, 92, 246, 0.2);
  background: ${props => (props.$active ? 'rgba(139, 92, 246, 0.2)' : 'transparent')};
  color: ${props => (props.$active ? vibeTheme.colors.text : vibeTheme.colors.textSecondary)};
  font-size: ${vibeTheme.typography.fontSize.xs};
  font-weight: ${vibeTheme.typography.fontWeight.medium};
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: rgba(139, 92, 246, 0.15);
    color: ${vibeTheme.colors.text};
  }
`;

export const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${vibeTheme.spacing.md};
`;

export const TemplateGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: ${vibeTheme.spacing.md};
`;

export const TemplateCard = styled(motion.button).withConfig({
  shouldForwardProp: shouldForwardMotionProp,
})`
  background: rgba(139, 92, 246, 0.05);
  border: 1px solid rgba(139, 92, 246, 0.1);
  border-radius: ${vibeTheme.borderRadius.medium};
  padding: ${vibeTheme.spacing.md};
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;

  &:hover {
    background: rgba(139, 92, 246, 0.1);
    border-color: rgba(139, 92, 246, 0.3);
    transform: translateY(-2px);
  }
`;

export const TemplateHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${vibeTheme.spacing.sm};
  margin-bottom: ${vibeTheme.spacing.sm};
`;

export const TemplateIcon = styled.div`
  font-size: 32px;
  line-height: 1;
`;

export const TemplateInfo = styled.div`
  flex: 1;
`;

export const TemplateName = styled.div`
  font-size: ${vibeTheme.typography.fontSize.md};
  font-weight: ${vibeTheme.typography.fontWeight.semibold};
  color: ${vibeTheme.colors.text};
  margin-bottom: ${vibeTheme.spacing.xs};
`;

export const TemplateDescription = styled.div`
  font-size: ${vibeTheme.typography.fontSize.sm};
  color: ${vibeTheme.colors.textSecondary};
  line-height: 1.4;
`;

export const TemplateTags = styled.div`
  display: flex;
  gap: ${vibeTheme.spacing.xs};
  flex-wrap: wrap;
  margin-top: ${vibeTheme.spacing.sm};
`;

export const Tag = styled.span`
  padding: 2px 8px;
  border-radius: ${vibeTheme.borderRadius.small};
  font-size: ${vibeTheme.typography.fontSize.xs};
  background: rgba(139, 92, 246, 0.1);
  color: ${vibeTheme.colors.text};
`;

export const TemplateFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: ${vibeTheme.spacing.sm};
  padding-top: ${vibeTheme.spacing.sm};
  border-top: 1px solid rgba(139, 92, 246, 0.1);
`;

export const SetupTime = styled.div`
  font-size: ${vibeTheme.typography.fontSize.xs};
  color: ${vibeTheme.colors.textSecondary};
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing.xs};
`;

export const Modal = styled(motion.div).withConfig({
  shouldForwardProp: shouldForwardMotionProp,
})`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

export const ModalContent = styled(motion.div).withConfig({
  shouldForwardProp: shouldForwardMotionProp,
})`
  background: ${vibeTheme.colors.secondary};
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: ${vibeTheme.borderRadius.large};
  padding: ${vibeTheme.spacing.xl};
  max-width: 500px;
  width: 90%;
`;

export const ModalTitle = styled.h3`
  margin: 0 0 ${vibeTheme.spacing.md} 0;
  font-size: ${vibeTheme.typography.fontSize.xl};
  font-weight: ${vibeTheme.typography.fontWeight.semibold};
  color: ${vibeTheme.colors.text};
`;

export const FormGroup = styled.div`
  margin-bottom: ${vibeTheme.spacing.md};
`;

export const Label = styled.label`
  display: block;
  font-size: ${vibeTheme.typography.fontSize.sm};
  font-weight: ${vibeTheme.typography.fontWeight.medium};
  color: ${vibeTheme.colors.text};
  margin-bottom: ${vibeTheme.spacing.xs};
`;

export const Input = styled.input`
  width: 100%;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: ${vibeTheme.borderRadius.medium};
  padding: ${vibeTheme.spacing.sm} ${vibeTheme.spacing.md};
  color: ${vibeTheme.colors.text};
  font-size: ${vibeTheme.typography.fontSize.sm};

  &:focus {
    outline: none;
    border-color: rgba(139, 92, 246, 0.5);
  }
`;

export const ModalActions = styled.div`
  display: flex;
  gap: ${vibeTheme.spacing.sm};
  margin-top: ${vibeTheme.spacing.lg};
`;

export const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
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
`;
