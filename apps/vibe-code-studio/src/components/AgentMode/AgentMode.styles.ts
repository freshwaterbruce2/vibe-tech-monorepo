import { motion } from 'framer-motion';
import styled from 'styled-components';
import { vibeTheme } from '../../styles/theme';

export const Backdrop = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const Container = styled(motion.div)`
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  background: ${vibeTheme.colors.primary};
  color: ${vibeTheme.colors.text};
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(139, 92, 246, 0.3);
  overflow: hidden;
  position: relative;
  z-index: 10000;
`;

export const Header = styled.div`
  padding: 16px 20px;
  border-bottom: ${vibeTheme.borders.thin};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const Title = styled.h2`
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  
  svg {
    color: ${vibeTheme.colors.purple};
  }
`;

export const StatusIndicator = styled.div<{ $status: 'idle' | 'running' | 'completed' | 'error' }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  background: ${props => 
    props.$status === 'running' ? `${vibeTheme.colors.purple}20` :
    props.$status === 'completed' ? `${vibeTheme.colors.success}20` :
    props.$status === 'error' ? `${vibeTheme.colors.error}20` :
    vibeTheme.colors.surface
  };
  color: ${props =>
    props.$status === 'running' ? vibeTheme.colors.purple :
    props.$status === 'completed' ? vibeTheme.colors.success :
    props.$status === 'error' ? vibeTheme.colors.error :
    vibeTheme.colors.text
  };
`;

export const Content = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

export const TaskInput = styled.div`
  padding: 20px;
  border-bottom: ${vibeTheme.borders.thin};
`;

export const TaskTextarea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: 12px 16px;
  background: ${vibeTheme.colors.surface};
  color: ${vibeTheme.colors.text};
  border: ${vibeTheme.borders.thin};
  border-radius: 8px;
  font-size: 14px;
  resize: vertical;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  
  &:focus {
    outline: none;
    border-color: ${vibeTheme.colors.purple};
  }
  
  &::placeholder {
    color: ${vibeTheme.colors.textSecondary};
  }
`;

export const ExecutionLog = styled.div`
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.6;
`;

export const LogEntry = styled(motion.div)<{ $type: 'info' | 'action' | 'success' | 'error' }>`
  margin-bottom: 12px;
  padding: 8px 12px;
  border-radius: 6px;
  background: ${props =>
    props.$type === 'action' ? `${vibeTheme.colors.purple}10` :
    props.$type === 'success' ? `${vibeTheme.colors.success}10` :
    props.$type === 'error' ? `${vibeTheme.colors.error}10` :
    'transparent'
  };
  
  .timestamp {
    font-size: 11px;
    color: ${vibeTheme.colors.textSecondary};
    margin-right: 8px;
  }
  
  .content {
    color: ${props =>
      props.$type === 'action' ? vibeTheme.colors.purple :
      props.$type === 'success' ? vibeTheme.colors.success :
      props.$type === 'error' ? vibeTheme.colors.error :
      vibeTheme.colors.text
    };
  }
`;

export const StepIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 16px 0;
  padding: 12px 16px;
  background: ${vibeTheme.colors.surface};
  border-radius: 8px;
  
  .step-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: ${vibeTheme.colors.purple};
    color: white;
    font-size: 12px;
    font-weight: 600;
  }
  
  .step-description {
    flex: 1;
    color: ${vibeTheme.colors.text};
  }
  
  .step-status {
    color: ${vibeTheme.colors.textSecondary};
    font-size: 12px;
  }
`;

export const Footer = styled.div`
  padding: 16px 20px;
  border-top: ${vibeTheme.borders.thin};
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const ActionButton = styled(motion.button)<{ $variant?: 'primary' | 'secondary' | 'danger' }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  background: ${props =>
    props.$variant === 'primary' ? vibeTheme.colors.purple :
    props.$variant === 'danger' ? vibeTheme.colors.error :
    vibeTheme.colors.surface
  };
  
  color: ${props =>
    props.$variant === 'primary' || props.$variant === 'danger' ? 'white' :
    vibeTheme.colors.text
  };
  
  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const ContextInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  background: ${vibeTheme.colors.surface};
  border-top: ${vibeTheme.borders.thin};
  font-size: 12px;
  color: ${vibeTheme.colors.textSecondary};
  
  .context-item {
    display: flex;
    align-items: center;
    gap: 4px;
    
    svg {
      width: 14px;
      height: 14px;
    }
  }
`;

