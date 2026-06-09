import { motion } from 'framer-motion';
import { shouldForwardMotionProp } from '../utils/motionProps';
import styled from 'styled-components';
import { vibeTheme } from '../styles/theme';

export const PanelContainer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: ${vibeTheme.colors.secondary};
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
`;

export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: ${vibeTheme.colors.elevated};
  border-bottom: 1px solid ${vibeTheme.colors.border};
`;

export const Title = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: ${vibeTheme.colors.textPrimary};
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const Content = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  overflow-y: auto;
`;

export const UploadZone = styled.div<{ isDragging: boolean }>`
  border: 2px dashed ${props => props.isDragging ? vibeTheme.colors.cyan : vibeTheme.colors.border};
  border-radius: 12px;
  padding: 40px;
  text-align: center;
  background: ${props => props.isDragging ? `${vibeTheme.colors.cyan}10` : vibeTheme.colors.primary};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: ${vibeTheme.colors.cyan};
    background: ${vibeTheme.colors.cyan}05;
  }
`;

export const UploadIcon = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 16px;

  svg {
    color: ${vibeTheme.colors.textSecondary};
  }
`;

export const UploadText = styled.p`
  color: ${vibeTheme.colors.textPrimary};
  font-size: 14px;
  margin-bottom: 8px;
`;

export const UploadHint = styled.p`
  color: ${vibeTheme.colors.textSecondary};
  font-size: 12px;
`;

export const OptionsSection = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
`;

export const OptionGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const Label = styled.label`
  color: ${vibeTheme.colors.textPrimary};
  font-size: 14px;
  font-weight: 500;
`;

export const Select = styled.select`
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid ${vibeTheme.colors.border};
  background: ${vibeTheme.colors.primary};
  color: ${vibeTheme.colors.textPrimary};
  font-size: 14px;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: ${vibeTheme.colors.cyan};
  }
`;

export const Checkbox = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${vibeTheme.colors.textPrimary};
  font-size: 14px;
  cursor: pointer;

  input {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }
`;

export const PreviewSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export const ImagePreview = styled.div`
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid ${vibeTheme.colors.border};

  img {
    width: 100%;
    height: auto;
    display: block;
  }
`;

export const CodePreview = styled.div`
  position: relative;
  background: ${vibeTheme.colors.primary};
  border: 1px solid ${vibeTheme.colors.border};
  border-radius: 8px;
  overflow: hidden;
`;

export const CodeHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: ${vibeTheme.colors.elevated};
  border-bottom: 1px solid ${vibeTheme.colors.border};
`;

export const CodeTitle = styled.span`
  color: ${vibeTheme.colors.textPrimary};
  font-size: 14px;
  font-weight: 500;
`;

export const CodeActions = styled.div`
  display: flex;
  gap: 8px;
`;

export const IconButton = styled.button`
  padding: 6px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: ${vibeTheme.colors.textSecondary};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: ${vibeTheme.colors.cyan}20;
    color: ${vibeTheme.colors.cyan};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const CodeContent = styled.pre`
  padding: 16px;
  margin: 0;
  overflow-x: auto;
  font-family: 'Fira Code', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: ${vibeTheme.colors.textPrimary};
  max-height: 400px;

  code {
    font-family: inherit;
  }
`;

export const GenerateButton = styled(motion.button).withConfig({
  shouldForwardProp: shouldForwardMotionProp,
})`
  padding: 12px 24px;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, ${vibeTheme.colors.cyan}, ${vibeTheme.colors.purple});
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: transform 0.2s;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export const StatusMessage = styled.div<{ type: 'info' | 'success' | 'error' }>`
  padding: 12px 16px;
  border-radius: 8px;
  background: ${props => {
    switch (props.type) {
      case 'success': return `${vibeTheme.colors.success}20`;
      case 'error': return `${vibeTheme.colors.danger}20`;
      default: return `${vibeTheme.colors.info}20`;
    }
  }};
  color: ${props => {
    switch (props.type) {
      case 'success': return vibeTheme.colors.success;
      case 'error': return vibeTheme.colors.danger;
      default: return vibeTheme.colors.info;
    }
  }};
  font-size: 14px;
`;
