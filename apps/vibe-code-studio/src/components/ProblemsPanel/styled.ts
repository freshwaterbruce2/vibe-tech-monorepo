import styled from 'styled-components';

export const PanelContainer = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: ${props => (props.$isOpen ? '35%' : '0')};
  background: #1e1e1e;
  border-top: 1px solid #404040;
  display: flex;
  flex-direction: column;
  transition: height 0.3s ease;
  z-index: 99;
  overflow: hidden;
`;

export const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  background: #252526;
  border-bottom: 1px solid #404040;
`;

export const HeaderTitle = styled.span`
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

export const FilterButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background: ${props => (props.$active ? '#37373d' : 'transparent')};
  border: none;
  border-radius: 4px;
  color: ${props => (props.$active ? '#d4d4d4' : '#888')};
  cursor: pointer;
  font-size: 0.75rem;

  &:hover {
    background: #37373d;
    color: #d4d4d4;
  }
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

export const ProblemsList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-thumb {
    background: #555;
    border-radius: 4px;
  }
`;

export const FileGroupHeader = styled.div`
  padding: 4px 12px;
  color: #cccccc;
  font-size: 0.8125rem;
  font-weight: 600;
  font-family: 'Consolas', monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const ProblemRow = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 3px 12px 3px 24px;
  background: transparent;
  border: none;
  color: #d4d4d4;
  cursor: pointer;
  font-size: 0.8125rem;
  text-align: left;

  &:hover {
    background: #2a2d2e;
  }
`;

export const ProblemMessage = styled.span`
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const ProblemLocation = styled.span`
  color: #888;
  font-family: 'Consolas', monospace;
  font-size: 0.75rem;
  white-space: nowrap;
`;

export const ProblemCode = styled.span`
  color: #6a9955;
  font-size: 0.75rem;
  white-space: nowrap;
`;

export const SourceBadge = styled.span`
  padding: 1px 6px;
  background: #37373d;
  border-radius: 8px;
  color: #9cdcfe;
  font-size: 0.6875rem;
  white-space: nowrap;
`;

export const EmptyState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #888;
  font-size: 0.875rem;
`;
