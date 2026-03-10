import styled from 'styled-components';

export const Container = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 12px;
  height: 100%;
  position: relative;
`;

export const SelectorButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: #2d2d2d;
  border: 1px solid #3e3e3e;
  border-radius: 6px;
  color: #cccccc;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #3e3e3e;
    border-color: #4e4e4e;
  }

  &:focus {
    outline: none;
    border-color: #007acc;
    box-shadow: 0 0 0 1px #007acc;
  }
`;

export const ProviderIcon = styled.div`
  width: 16px;
  height: 16px;
  border-radius: 3px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: bold;
  color: white;
`;

export const ModelName = styled.span`
  font-weight: 500;
`;

export const Dropdown = styled.div<{ open: boolean }>`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: #1e1e1e;
  border: 1px solid #3e3e3e;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  min-width: 380px;
  max-height: 600px;
  overflow-y: auto;
  z-index: 10000;
  opacity: ${props => props.open ? 1 : 0};
  transform: ${props => props.open ? 'translateY(0)' : 'translateY(-10px)'};
  pointer-events: ${props => props.open ? 'all' : 'none'};
  transition: all 0.2s ease;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: #1e1e1e;
  }

  &::-webkit-scrollbar-thumb {
    background: #3e3e3e;
    border-radius: 4px;

    &:hover {
      background: #4e4e4e;
    }
  }
`;

export const SearchBar = styled.input`
  width: 100%;
  padding: 10px 12px;
  background: #2d2d2d;
  border: none;
  border-bottom: 1px solid #3e3e3e;
  color: #cccccc;
  font-size: 13px;
  outline: none;

  &::placeholder {
    color: #888;
  }

  &:focus {
    background: #333;
    border-bottom-color: #007acc;
  }
`;

export const ProviderSection = styled.div`
  padding: 8px;
`;

export const ProviderTitle = styled.div`
  padding: 8px 12px 4px;
  color: #888;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
`;

export const ModelItem = styled.div<{ selected?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  margin: 2px 0;
  border-radius: 6px;
  background: ${props => props.selected ? '#007acc20' : 'transparent'};
  border: 1px solid ${props => props.selected ? '#007acc' : 'transparent'};
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: #2d2d2d;
    border-color: #3e3e3e;
  }
`;

export const ModelInfo = styled.div`
  flex: 1;
`;

export const ModelTitle = styled.div`
  color: #cccccc;
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const ModelDetails = styled.div`
  color: #888;
  font-size: 11px;
  margin-top: 2px;
  display: flex;
  gap: 12px;
`;

export const Badge = styled.span<{ type?: 'new' | 'recommended' | 'beta' }>`
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;

  ${props => {
    switch (props.type) {
      case 'new':
        return `
          background: #22c55e20;
          color: #22c55e;
          border: 1px solid #22c55e40;
        `;
      case 'recommended':
        return `
          background: #007acc20;
          color: #007acc;
          border: 1px solid #007acc40;
        `;
      case 'beta':
        return `
          background: #f59e0b20;
          color: #f59e0b;
          border: 1px solid #f59e0b40;
        `;
      default:
        return `
          background: #88888820;
          color: #888;
          border: 1px solid #88888840;
        `;
    }
  }}
`;

export const ModelCost = styled.div`
  text-align: right;
`;

export const CostAmount = styled.div`
  color: #22c55e;
  font-size: 12px;
  font-weight: 500;
`;

export const CostLabel = styled.div`
  color: #666;
  font-size: 10px;
  margin-top: 2px;
`;

export const Divider = styled.div`
  height: 1px;
  background: #3e3e3e;
  margin: 8px 0;
`;

export const StatusRow = styled.div`
  padding: 12px;
  background: #2d2d2d;
  border-top: 1px solid #3e3e3e;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

export const StatusIndicator = styled.div<{ status: 'connected' | 'disconnected' | 'error' }>`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: ${props => {
    switch (props.status) {
      case 'connected':
        return '#22c55e';
      case 'disconnected':
        return '#888';
      case 'error':
        return '#ef4444';
      default:
        return '#888';
    }
  }};
`;

export const StatusDot = styled.div<{ status: 'connected' | 'disconnected' | 'error' }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => {
    switch (props.status) {
      case 'connected':
        return '#22c55e';
      case 'disconnected':
        return '#888';
      case 'error':
        return '#ef4444';
      default:
        return '#888';
    }
  }};
  box-shadow: 0 0 4px ${props => {
    switch (props.status) {
      case 'connected':
        return '#22c55e60';
      case 'error':
        return '#ef444460';
      default:
        return 'transparent';
    }
  }};
`;

export const ApiKeyButton = styled.button`
  padding: 4px 8px;
  background: #007acc;
  border: none;
  border-radius: 4px;
  color: white;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #0098ff;
  }
`;

export const UsageStats = styled.div`
  padding: 12px;
  background: #252525;
  border-top: 1px solid #3e3e3e;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
`;

export const StatItem = styled.div`
  text-align: center;
`;

export const StatValue = styled.div`
  color: #cccccc;
  font-size: 14px;
  font-weight: 600;
`;

export const StatLabel = styled.div`
  color: #666;
  font-size: 10px;
  margin-top: 2px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
`;