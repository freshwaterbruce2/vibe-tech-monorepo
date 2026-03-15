import { motion } from 'framer-motion';
import styled from 'styled-components';
import { vibeTheme } from '../../../styles/theme';

export const ComposerBackdrop = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 9998;
  display: flex;
  align-items: flex-end;
  justify-content: center;
`;

export const ComposerContainer = styled(motion.div)<{ $expanded?: boolean }>`
  width: 100%;
  max-width: 1400px;
  height: ${props => props.$expanded ? '85vh' : '600px'};
  background: ${vibeTheme.colors.secondary};
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
  border: 2px solid rgba(139, 92, 246, 0.3);
  border-bottom: none;
  display: flex;
  flex-direction: column;
  z-index: 9999;
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.2);
  margin: 0 20px 0 20px;
`;

export const ComposerHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: ${vibeTheme.colors.primary};
  border-bottom: ${vibeTheme.borders.thin};
`;

export const ComposerTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  
  svg {
    color: ${vibeTheme.colors.purple};
  }
  
  h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
  }
`;

export const ComposerActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const ActionButton = styled(motion.button)<{ $primary?: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: ${props => props.$primary ? vibeTheme.colors.purple : 'transparent'};
  color: ${props => props.$primary ? 'white' : vibeTheme.colors.text};
  border: 1px solid ${props => props.$primary ? 'transparent' : vibeTheme.borders.thin};
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: ${props => props.$primary ? 
      `${vibeTheme.colors.purple  }dd` : 
      vibeTheme.colors.hover};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const ComposerBody = styled.div`
  flex: 1;
  display: flex;
  overflow: hidden;
`;

export const FileList = styled.div`
  width: 300px;
  background: ${vibeTheme.colors.primary};
  border-right: ${vibeTheme.borders.thin};
  overflow-y: auto;
`;

export const FileListHeader = styled.div`
  padding: 12px 16px;
  border-bottom: ${vibeTheme.borders.thin};
  display: flex;
  align-items: center;
  justify-content: space-between;
  
  h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: ${vibeTheme.colors.textSecondary};
  }
`;

export const FileItem = styled(motion.div)<{ $selected?: boolean; $isDirty?: boolean }>`
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  background: ${props => props.$selected ? vibeTheme.colors.hover : 'transparent'};
  
  &:hover {
    background: ${vibeTheme.colors.hover};
  }
  
  svg {
    width: 16px;
    height: 16px;
    color: ${vibeTheme.colors.textSecondary};
  }
  
  .file-name {
    flex: 1;
    font-size: 14px;
    color: ${vibeTheme.colors.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .file-status {
    display: flex;
    align-items: center;
    gap: 4px;
    
    .dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: ${props => props.$isDirty ? vibeTheme.colors.warning : vibeTheme.colors.success};
    }
  }
`;

export const EditorSection = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

export const EditorHeader = styled.div`
  padding: 12px 20px;
  background: ${vibeTheme.colors.tertiary};
  border-bottom: ${vibeTheme.borders.thin};
  display: flex;
  align-items: center;
  justify-content: space-between;
  
  .file-path {
    font-size: 14px;
    color: ${vibeTheme.colors.textSecondary};
    font-family: 'Monaco', 'Consolas', monospace;
  }
`;

export const EditorContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: ${vibeTheme.colors.primary};
  border-radius: 8px;
  margin: 8px;
  overflow: hidden;
  border: 1px solid rgba(139, 92, 246, 0.2);
  
  .monaco-editor {
    .margin {
      background-color: ${vibeTheme.colors.primary} !important;
    }
  }
`;

export const EditorToolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: ${vibeTheme.colors.secondary};
  border-bottom: 1px solid rgba(139, 92, 246, 0.1);
  font-size: 12px;
  
  .editor-info {
    display: flex;
    align-items: center;
    gap: 12px;
    color: ${vibeTheme.colors.textSecondary};
  }
  
  .editor-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
`;

export const PromptSection = styled.div`
  padding: 16px 20px;
  background: ${vibeTheme.colors.primary};
  border-top: ${vibeTheme.borders.thin};
`;

export const PromptInput = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 12px;
  
  textarea {
    flex: 1;
    min-height: 60px;
    max-height: 120px;
    padding: 12px 16px;
    background: ${vibeTheme.colors.secondary};
    border: ${vibeTheme.borders.thin};
    border-radius: 8px;
    font-size: 14px;
    resize: vertical;
    color: ${vibeTheme.colors.text};
    
    &:focus {
      outline: none;
      border-color: ${vibeTheme.colors.purple};
    }
  }
`;

export const ContextTags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
`;

export const ContextTag = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: ${vibeTheme.colors.tertiary};
  border: ${vibeTheme.borders.thin};
  border-radius: 16px;
  font-size: 12px;
  color: ${vibeTheme.colors.textSecondary};
  cursor: pointer;
  
  &:hover {
    background: ${vibeTheme.colors.hover};
  }
  
  svg {
    width: 14px;
    height: 14px;
  }
`;

export const StatusBar = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 20px;
  background: ${vibeTheme.colors.tertiary};
  border-top: ${vibeTheme.borders.thin};
  font-size: 12px;
  color: ${vibeTheme.colors.textSecondary};
  
  .status-item {
    display: flex;
    align-items: center;
    gap: 6px;
    
    svg {
      width: 14px;
      height: 14px;
    }
  }
`;
