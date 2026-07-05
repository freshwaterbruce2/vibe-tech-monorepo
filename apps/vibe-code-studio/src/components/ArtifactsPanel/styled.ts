import styled from 'styled-components';

export const PanelContainer = styled.div`
  position: fixed;
  top: 40px;
  right: 0;
  bottom: 0;
  width: 460px;
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

export const ArtifactList = styled.div`
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

export const TaskGroupHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 4px 4px;
  color: #9cdcfe;
  font-size: 0.75rem;
  font-family: 'Consolas', monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const LinkButton = styled.button`
  background: transparent;
  border: none;
  color: #3794ff;
  cursor: pointer;
  font-size: 0.6875rem;
  padding: 0;
  white-space: nowrap;

  &:hover {
    text-decoration: underline;
  }
`;

export const ArtifactCard = styled.button`
  display: block;
  width: 100%;
  text-align: left;
  background: #252526;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 6px;
  cursor: pointer;

  &:hover {
    background: #2d2d30;
    border-color: #444;
  }
`;

export const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  color: #e5e5e5;
  font-size: 0.8125rem;
  font-weight: 500;
`;

export const CardTitle = styled.span`
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

export const StatusBadge = styled.span<{ $final: boolean }>`
  padding: 1px 8px;
  border-radius: 8px;
  border: 1px solid ${props => (props.$final ? '#10b981' : '#f59e0b')};
  color: ${props => (props.$final ? '#10b981' : '#f59e0b')};
  font-size: 0.625rem;
  text-transform: uppercase;
  font-weight: 600;
  white-space: nowrap;
`;

export const CardPreview = styled.div`
  color: #888;
  font-size: 0.75rem;
  line-height: 1.4;
  max-height: 2.8em;
  overflow: hidden;
`;

export const ViewerContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

export const ViewerBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px;
`;

export const MarkdownBlock = styled.pre`
  margin: 0;
  color: #d4d4d4;
  font-size: 0.8125rem;
  font-family: 'Consolas', monospace;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  line-height: 1.5;
`;

export const ScreenshotFigure = styled.figure`
  margin: 8px 0;
`;

export const ScreenshotImage = styled.img`
  display: block;
  max-width: 100%;
  border: 1px solid #404040;
  border-radius: 6px;
  background: #111;
`;

export const ScreenshotCaption = styled.figcaption`
  margin-top: 4px;
  color: #888;
  font-size: 0.6875rem;
  line-height: 1.4;
  overflow-wrap: anywhere;
`;

export const ViewerMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  padding: 8px 12px;
  border-bottom: 1px solid #333;
  color: #888;
  font-size: 0.75rem;
`;

export const CommentThread = styled.div`
  border-top: 1px solid #333;
  padding: 8px 12px;
  max-height: 40%;
  overflow-y: auto;
`;

export const CommentHeading = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: #9cdcfe;
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 6px;
`;

export const CommentItem = styled.div`
  background: #252526;
  border: 1px solid #333;
  border-radius: 6px;
  padding: 6px 8px;
  margin-bottom: 6px;
`;

export const CommentBody = styled.div`
  color: #d4d4d4;
  font-size: 0.75rem;
  line-height: 1.4;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`;

export const CommentMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 4px;
  color: #777;
  font-size: 0.625rem;
`;

const DELIVERY_COLOR: Record<string, string> = {
  queued: '#f59e0b',
  delivered: '#10b981',
  feedback: '#888',
};

export const DeliveryBadge = styled.span<{ $delivery: string }>`
  padding: 1px 8px;
  border-radius: 8px;
  border: 1px solid ${props => DELIVERY_COLOR[props.$delivery] ?? '#888'};
  color: ${props => DELIVERY_COLOR[props.$delivery] ?? '#888'};
  text-transform: uppercase;
  font-weight: 600;
  white-space: nowrap;
`;

export const CommentInputRow = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 6px;
`;

export const CommentInput = styled.textarea`
  flex: 1;
  background: #1a1a1a;
  border: 1px solid #404040;
  border-radius: 6px;
  color: #d4d4d4;
  font-size: 0.75rem;
  font-family: inherit;
  padding: 6px 8px;
  resize: none;
  min-height: 30px;

  &:focus {
    outline: none;
    border-color: #3794ff;
  }
`;
