/**
 * AIChat Styled Components - Layout
 * Top-level container and resize handle.
 */
import styled from 'styled-components';

import { vibeTheme } from '../../styles/theme';

import type { ChatMode } from './types';

// ============================================================================
// Layout Components
// ============================================================================

export const ChatContainer = styled.div<{ $width: number; $mode: ChatMode }>`
  width: ${props => props.$width}px;
  background: ${props => {
        switch (props.$mode) {
            case 'agent': return 'linear-gradient(180deg, rgba(139, 92, 246, 0.05) 0%, rgba(26, 26, 46, 1) 100%)';
            default: return vibeTheme.colors.secondary;
        }
    }};
  border-left: 2px solid ${props => {
        switch (props.$mode) {
            case 'agent': return 'rgba(139, 92, 246, 0.4)';
            default: return 'rgba(139, 92, 246, 0.2)';
        }
    }};
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  position: relative;
  transition: all 0.3s ease;
  box-shadow: ${props => {
        switch (props.$mode) {
            case 'agent': return '0 0 40px rgba(139, 92, 246, 0.1)';
            default: return 'none';
        }
    }};

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 2px;
    height: 100%;
    background: ${props => {
        switch (props.$mode) {
            case 'agent': return 'linear-gradient(180deg, rgba(139, 92, 246, 0.8), rgba(139, 92, 246, 0.2))';
            default: return vibeTheme.gradients.border;
        }
    }};
    opacity: ${props => props.$mode !== 'chat' ? 1 : 0.6};
  }
`;

export const ResizeHandle = styled.div<{ $isResizing: boolean }>`
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 8px;
  cursor: col-resize;
  z-index: 10;
  background: ${props => props.$isResizing ? 'rgba(139, 92, 246, 0.3)' : 'transparent'};
  transition: background 0.2s ease;

  &:hover {
    background: rgba(139, 92, 246, 0.2);
  }

  &::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 4px;
    height: 40px;
    background: ${props => props.$isResizing ? vibeTheme.colors.purple : 'rgba(139, 92, 246, 0.5)'};
    border-radius: 2px;
    opacity: ${props => props.$isResizing ? 1 : 0};
    transition: opacity 0.2s ease;
  }

  &:hover::after {
    opacity: 1;
  }
`;
