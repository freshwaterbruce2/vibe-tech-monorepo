import { Globe, Monitor } from 'lucide-react';
import styled from 'styled-components';
import { useRemoteConnection } from '../hooks/useRemoteConnection';

const Container = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: none;
  border: none;
  color: #d4d4d4;
  font-size: 11px;
  cursor: pointer;
  padding: 2px 8px;
  border-radius: 3px;
  &:hover {
    background: #3c3c3c;
  }
`;

const Dot = styled.span<{ $color: string }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${(p) => p.$color};
`;

interface RemoteStatusBarProps {
  onClick?: () => void;
}

export function RemoteStatusBar({ onClick }: RemoteStatusBarProps) {
  const { activeConnection, isRemote } = useRemoteConnection();

  if (isRemote && activeConnection) {
    return (
      <Container onClick={onClick} title={`Connected to ${activeConnection.host}`}>
        <Dot $color="#4ec94e" />
        <Globe size={12} />
        {activeConnection.name}
      </Container>
    );
  }

  return (
    <Container onClick={onClick} title="Local development">
      <Dot $color="#666" />
      <Monitor size={12} />
      Local
    </Container>
  );
}
