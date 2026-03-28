import { Globe, Monitor, Plus, Power, PowerOff, Trash2, Wifi } from 'lucide-react';
import { useState } from 'react';
import styled from 'styled-components';
import { useRemoteConnection } from '../hooks/useRemoteConnection';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1e1e1e;
  color: #d4d4d4;
`;

const Header = styled.div`
  padding: 16px;
  border-bottom: 1px solid #333;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ConnectionList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px;
`;

const ConnectionCard = styled.div<{ $active?: boolean }>`
  padding: 12px;
  border: 1px solid ${(p) => (p.$active ? '#007acc' : '#333')};
  border-radius: 6px;
  margin-bottom: 8px;
  background: ${(p) => (p.$active ? '#007acc10' : 'transparent')};
`;

const ConnName = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #fff;
`;

const ConnMeta = styled.div`
  font-size: 11px;
  color: #888;
  margin-top: 2px;
`;

const StatusDot = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${(p) => p.$color};
  display: inline-block;
  margin-right: 6px;
`;

const Actions = styled.div`
  display: flex;
  gap: 6px;
  margin-top: 8px;
`;

const Btn = styled.button<{ $variant?: 'primary' | 'danger' }>`
  padding: 4px 10px;
  border-radius: 3px;
  border: 1px solid ${(p) => (p.$variant === 'danger' ? '#e06c75' : p.$variant === 'primary' ? '#007acc' : '#555')};
  background: transparent;
  color: ${(p) => (p.$variant === 'danger' ? '#e06c75' : p.$variant === 'primary' ? '#007acc' : '#d4d4d4')};
  font-size: 11px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  &:hover { opacity: 0.8; }
`;

const Form = styled.div`
  padding: 12px;
  border: 1px solid #333;
  border-radius: 6px;
  margin: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Input = styled.input`
  background: #2d2d2d;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 6px 10px;
  color: #d4d4d4;
  font-size: 12px;
  &:focus { outline: none; border-color: #007acc; }
`;

const Label = styled.label`
  font-size: 11px;
  color: #888;
`;

const Select = styled.select`
  background: #2d2d2d;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 6px 10px;
  color: #d4d4d4;
  font-size: 12px;
`;

const statusColor = (s: string) =>
  s === 'connected' ? '#4ec94e' : s === 'connecting' ? '#e5c07b' : s === 'error' ? '#e06c75' : '#666';

export function RemoteConnectionPanel() {
  const { connections, activeConnection, connect, disconnect, addConnection, removeConnection } = useRemoteConnection();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    host: '',
    port: '22',
    username: '',
    authMethod: 'key' as 'password' | 'key' | 'agent',
    privateKeyPath: '',
  });

  const handleAdd = () => {
    if (!form.name.trim() || !form.host.trim() || !form.username.trim()) return;
    addConnection({
      name: form.name,
      host: form.host,
      port: parseInt(form.port, 10) || 22,
      username: form.username,
      authMethod: form.authMethod,
      privateKeyPath: form.privateKeyPath || undefined,
    });
    setForm({ name: '', host: '', port: '22', username: '', authMethod: 'key', privateKeyPath: '' });
    setShowForm(false);
  };

  return (
    <Container>
      <Header>
        <Globe size={16} /> Remote Development
        <div style={{ flex: 1 }} />
        <Btn $variant="primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={12} /> New
        </Btn>
      </Header>

      {showForm && (
        <Form>
          <Label>Connection Name</Label>
          <Input placeholder="My Server" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 3 }}>
              <Label>Host</Label>
              <Input placeholder="192.168.1.100" value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} />
            </div>
            <div style={{ flex: 1 }}>
              <Label>Port</Label>
              <Input value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value })} />
            </div>
          </div>
          <Label>Username</Label>
          <Input placeholder="root" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <Label>Auth Method</Label>
          <Select value={form.authMethod} onChange={(e) => setForm({ ...form, authMethod: e.target.value as 'password' | 'key' | 'agent' })}>
            <option value="key">SSH Key</option>
            <option value="password">Password</option>
            <option value="agent">SSH Agent</option>
          </Select>
          {form.authMethod === 'key' && (
            <>
              <Label>Private Key Path</Label>
              <Input placeholder="~/.ssh/id_rsa" value={form.privateKeyPath} onChange={(e) => setForm({ ...form, privateKeyPath: e.target.value })} />
            </>
          )}
          <Btn $variant="primary" onClick={handleAdd}>
            <Wifi size={12} /> Add Connection
          </Btn>
        </Form>
      )}

      <ConnectionList>
        {connections.length === 0 && !showForm ? (
          <div style={{ textAlign: 'center', padding: 32, color: '#666' }}>
            <Monitor size={32} style={{ marginBottom: 8, opacity: 0.5 }} />
            <div>No remote connections</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>Click "New" to add one</div>
          </div>
        ) : (
          connections.map((conn) => (
            <ConnectionCard key={conn.id} $active={activeConnection?.id === conn.id}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <StatusDot $color={statusColor(conn.status)} />
                <ConnName>{conn.name}</ConnName>
              </div>
              <ConnMeta>
                {conn.username}@{conn.host}:{conn.port} &middot; {conn.status}
              </ConnMeta>
              {conn.error && <div style={{ fontSize: 11, color: '#e06c75', marginTop: 4 }}>{conn.error}</div>}
              <Actions>
                {conn.status === 'connected' ? (
                  <Btn onClick={() => disconnect(conn.id)}>
                    <PowerOff size={12} /> Disconnect
                  </Btn>
                ) : (
                  <Btn $variant="primary" onClick={() => connect(conn.id)}>
                    <Power size={12} /> Connect
                  </Btn>
                )}
                <Btn $variant="danger" onClick={() => removeConnection(conn.id)}>
                  <Trash2 size={12} />
                </Btn>
              </Actions>
            </ConnectionCard>
          ))
        )}
      </ConnectionList>
    </Container>
  );
}
