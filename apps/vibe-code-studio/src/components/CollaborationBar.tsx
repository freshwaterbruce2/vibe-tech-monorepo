import { Copy, LogOut, Share2, Users, Wifi, WifiOff } from 'lucide-react';
import { useCallback, useState } from 'react';
import styled from 'styled-components';
import { useCollaboration } from '../hooks/useCollaboration';

const BarContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  background: #252526;
  border-top: 1px solid #333;
  font-size: 12px;
  color: #d4d4d4;
`;

const StatusDot = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${(p) => p.$color};
  display: inline-block;
`;

const UserAvatar = styled.span<{ $color: string }>`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: ${(p) => p.$color};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  color: #fff;
`;

const ActionBtn = styled.button`
  background: none;
  border: none;
  color: #d4d4d4;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 3px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  &:hover {
    background: #3c3c3c;
    color: #fff;
  }
`;

const JoinForm = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const SmallInput = styled.input`
  background: #1e1e1e;
  border: 1px solid #444;
  color: #d4d4d4;
  border-radius: 3px;
  padding: 2px 6px;
  font-size: 11px;
  width: 120px;
  &:focus {
    outline: none;
    border-color: #007acc;
  }
`;

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function CollaborationBar() {
  const { status, isConnected, connectedUsers, joinRoom, leaveRoom, roomId } = useCollaboration();
  const [showJoin, setShowJoin] = useState(false);
  const [roomInput, setRoomInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [copied, setCopied] = useState(false);

  const handleJoin = useCallback(() => {
    if (roomInput.trim() && nameInput.trim()) {
      joinRoom(roomInput.trim(), nameInput.trim());
      setShowJoin(false);
    }
  }, [roomInput, nameInput, joinRoom]);

  const handleShare = useCallback(() => {
    if (roomId) {
      navigator.clipboard.writeText(roomId).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }, [roomId]);

  const statusColor = status === 'connected' ? '#4ec94e' : status === 'connecting' ? '#e5c07b' : '#666';

  return (
    <BarContainer>
      <Users size={14} />

      {isConnected ? (
        <>
          <StatusDot $color={statusColor} />
          <span style={{ color: '#888' }}>Room: {roomId}</span>
          {connectedUsers.map((user) => (
            <UserAvatar key={user.id} $color={user.color} title={user.name}>
              {getInitials(user.name)}
            </UserAvatar>
          ))}
          <ActionBtn onClick={handleShare} title="Copy room ID">
            {copied ? <Copy size={12} /> : <Share2 size={12} />}
            {copied ? 'Copied!' : 'Share'}
          </ActionBtn>
          <ActionBtn onClick={leaveRoom} title="Leave room">
            <LogOut size={12} /> Leave
          </ActionBtn>
        </>
      ) : showJoin ? (
        <JoinForm>
          <SmallInput
            placeholder="Room ID"
            value={roomInput}
            onChange={(e) => setRoomInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          />
          <SmallInput
            placeholder="Your name"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          />
          <ActionBtn onClick={handleJoin}>
            <Wifi size={12} /> Join
          </ActionBtn>
          <ActionBtn onClick={() => setShowJoin(false)}>
            <WifiOff size={12} />
          </ActionBtn>
        </JoinForm>
      ) : (
        <>
          <StatusDot $color={statusColor} />
          <span style={{ color: '#888' }}>No active session</span>
          <ActionBtn onClick={() => setShowJoin(true)}>
            <Wifi size={12} /> Collaborate
          </ActionBtn>
        </>
      )}
    </BarContainer>
  );
}
