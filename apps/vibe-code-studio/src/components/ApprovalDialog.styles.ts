import { motion } from 'framer-motion';
import styled from 'styled-components';
import { shouldForwardMotionProp } from '../utils/motionProps';
import { vibeTheme } from '../styles/theme';

export const Backdrop = styled(motion.div).withConfig({
  shouldForwardProp: shouldForwardMotionProp,
})`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 1000;
`;

export const Dialog = styled(motion.div).withConfig({
  shouldForwardProp: shouldForwardMotionProp,
})`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: ${vibeTheme.colors.secondary};
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 16px;
  padding: 24px;
  max-width: 700px;
  width: 90%;
  max-height: 85vh;
  overflow-y: auto;
  z-index: 1001;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(139, 92, 246, 0.5);
    border-radius: 4px;
  }
`;

export const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

export const Title = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  color: ${vibeTheme.colors.text};
  font-size: 20px;
  font-weight: 700;
`;

export const ImpactBadge = styled.div<{ $color: string }>`
  background: ${(props) => props.$color}22;
  color: ${(props) => props.$color};
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
`;

export const TaskDescription = styled.div`
  display: flex;
  align-items: start;
  gap: 10px;
  padding: 14px;
  background: rgba(139, 92, 246, 0.1);
  border-left: 3px solid #8b5cf6;
  border-radius: 8px;
  margin-bottom: 20px;
  color: ${vibeTheme.colors.text};
  font-size: 14px;
  line-height: 1.5;
`;

export const Summary = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
`;

export const SummaryItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
`;

export const SummaryIcon = styled.div<{ $color: string }>`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: ${(props) => props.$color}22;
  color: ${(props) => props.$color};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 700;
`;

export const SummaryText = styled.div`
  color: ${vibeTheme.colors.textSecondary};
  font-size: 13px;

  strong {
    color: ${vibeTheme.colors.text};
    font-size: 18px;
    display: block;
  }
`;

export const WarningBox = styled.div`
  display: flex;
  gap: 12px;
  padding: 14px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 10px;
  margin-bottom: 20px;
  color: #fbbf24;
`;

export const WarningText = styled.div`
  font-size: 13px;
  line-height: 1.5;
`;

export const FileListSection = styled.div`
  margin-bottom: 20px;
`;

export const FileListHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  color: ${vibeTheme.colors.text};
  font-size: 14px;
  font-weight: 600;
`;

export const ToggleReview = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(139, 92, 246, 0.2);
  border: 1px solid rgba(139, 92, 246, 0.3);
  color: ${vibeTheme.colors.text};
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(139, 92, 246, 0.3);
  }
`;

export const FileList = styled.div<{ $expanded: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: ${(props) => (props.$expanded ? '300px' : '200px')};
  overflow-y: auto;
  padding: 8px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.2);
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(139, 92, 246, 0.5);
    border-radius: 3px;
  }
`;

export const FileListItem = styled.div`
  display: flex;
  align-items: start;
  gap: 10px;
  padding: 10px;
  background: rgba(139, 92, 246, 0.05);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 6px;
  transition: all 0.2s;

  &:hover {
    background: rgba(139, 92, 246, 0.1);
  }
`;

export const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  margin-top: 2px;
  cursor: pointer;
`;

export const FileInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

export const FileName = styled.div`
  color: ${vibeTheme.colors.text};
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 600;
`;

export const FilePath = styled.div`
  color: ${vibeTheme.colors.textSecondary};
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
`;

export const FileReason = styled.div`
  color: ${vibeTheme.colors.textSecondary};
  font-size: 12px;
  font-style: italic;
  margin-top: 4px;
`;

export const ChangeTypeBadge = styled.div<{ $type: string }>`
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;

  ${(props) =>
    props.$type === 'create' &&
    `
    background: rgba(16, 185, 129, 0.2);
    color: #10b981;
  `}

  ${(props) =>
    props.$type === 'modify' &&
    `
    background: rgba(96, 165, 250, 0.2);
    color: #60a5fa;
  `}

  ${(props) =>
    props.$type === 'delete' &&
    `
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
  `}
`;

export const SafetyChecklist = styled.div`
  background: rgba(16, 185, 129, 0.05);
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 20px;
`;

export const ChecklistTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${vibeTheme.colors.text};
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
`;

export const ChecklistItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${vibeTheme.colors.textSecondary};
  font-size: 13px;
  margin-bottom: 8px;

  &:last-child {
    margin-bottom: 0;
  }
`;

export const Actions = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
`;

export const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
`;

const Button = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: none;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
  }
`;

export const ApproveButton = styled(Button)`
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;

  &:hover {
    background: linear-gradient(135deg, #059669 0%, #047857 100%);
  }
`;

export const RejectButton = styled(Button)`
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;

  &:hover {
    background: rgba(239, 68, 68, 0.3);
  }
`;

export const SecondaryButton = styled(Button)`
  background: rgba(139, 92, 246, 0.2);
  color: ${vibeTheme.colors.text};

  &:hover {
    background: rgba(139, 92, 246, 0.3);
  }
`;
