import styled from 'styled-components';

export const PanelContainer = styled.div`
  position: fixed;
  top: 40px;
  right: 0;
  bottom: 0;
  width: 440px;
  background: #1e1e1e;
  border-left: 1px solid #404040;
  display: flex;
  flex-direction: column;
  z-index: 99;
  overflow: hidden;
`;

export const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #252526;
  border-bottom: 1px solid #404040;
`;

export const HeaderTitle = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #d4d4d4;
  font-size: 0.8125rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

export const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

export const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  padding: 0;
  background: transparent;
  border: none;
  color: #d4d4d4;
  cursor: pointer;
  border-radius: 4px;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

export const PrimaryButton = styled.button`
  padding: 6px 12px;
  border: 1px solid #3b82f6;
  background: #3b82f633;
  color: #3b82f6;
  border-radius: 4px;
  font-size: 0.8125rem;
  cursor: pointer;

  &:hover {
    background: #3b82f644;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

export const SecondaryButton = styled.button`
  padding: 6px 12px;
  border: 1px solid #444;
  background: transparent;
  color: #d4d4d4;
  border-radius: 4px;
  font-size: 0.8125rem;
  cursor: pointer;

  &:hover {
    background: #ffffff11;
  }
`;

export const ScheduleList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-thumb {
    background: #555;
    border-radius: 4px;
  }
`;

export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #888;
  gap: 8px;
  font-size: 0.875rem;
  text-align: center;
  padding: 24px;
`;

export const ScheduleCard = styled.div`
  background: #252526;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
`;

export const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
`;

export const StatusBadge = styled.span<{ $color: string }>`
  padding: 1px 8px;
  border-radius: 8px;
  border: 1px solid ${props => props.$color};
  color: ${props => props.$color};
  font-size: 0.6875rem;
  text-transform: uppercase;
  font-weight: 600;
  white-space: nowrap;
`;

export const CardTitle = styled.div`
  color: #e5e5e5;
  font-size: 0.875rem;
  font-weight: 500;
  overflow-wrap: anywhere;
`;

export const CardMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  color: #888;
  font-size: 0.75rem;
  margin-top: 6px;
`;

export const CardActions = styled.div`
  display: flex;
  gap: 4px;
`;

export const RunHistory = styled.ul`
  list-style: none;
  margin: 8px 0 0;
  padding: 8px 0 0;
  border-top: 1px solid #333;
`;

export const RunRow = styled.li`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 0;
  color: #aaa;
  font-size: 0.75rem;
`;

export const FormSection = styled.div`
  padding: 12px;
  border-bottom: 1px solid #333;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const FieldLabel = styled.label`
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: #aaa;
  font-size: 0.75rem;
`;

export const TextInput = styled.input`
  background: #1a1a1a;
  border: 1px solid #444;
  border-radius: 4px;
  color: #d4d4d4;
  padding: 6px 8px;
  font-size: 0.8125rem;
`;

export const TextArea = styled.textarea`
  background: #1a1a1a;
  border: 1px solid #444;
  border-radius: 4px;
  color: #d4d4d4;
  padding: 6px 8px;
  font-size: 0.8125rem;
  min-height: 60px;
  resize: vertical;
`;

export const Select = styled.select`
  background: #1a1a1a;
  border: 1px solid #444;
  border-radius: 4px;
  color: #d4d4d4;
  padding: 6px 8px;
  font-size: 0.8125rem;
`;

export const FieldRow = styled.div`
  display: flex;
  gap: 8px;

  > * {
    flex: 1;
  }
`;

export const ErrorText = styled.div`
  color: #fca5a5;
  font-size: 0.75rem;
`;

export const PreviewBlock = styled.pre`
  background: #1a1a1a;
  border: 1px solid #444;
  border-radius: 4px;
  color: #9cdcfe;
  padding: 8px;
  font-size: 0.75rem;
  font-family: 'Consolas', monospace;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  margin: 0;
`;

export const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;
