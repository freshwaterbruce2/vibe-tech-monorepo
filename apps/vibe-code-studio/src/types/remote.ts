export interface RemoteConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authMethod: 'password' | 'key' | 'agent';
  privateKeyPath?: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  lastConnected?: number;
  error?: string;
}

export interface RemoteFileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  modified?: number;
  permissions?: string;
}

export interface RemoteEnvironment {
  connection: RemoteConnection;
  workspacePath: string;
  os: 'linux' | 'macos' | 'windows';
  shell: string;
}
