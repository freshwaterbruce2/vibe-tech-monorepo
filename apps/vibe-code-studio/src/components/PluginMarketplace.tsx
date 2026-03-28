import { Download, Package, Power, PowerOff, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import styled from 'styled-components';
import { usePluginManager } from '../hooks/usePluginManager';
import type { IPlugin } from '../types/plugin';

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

const SearchBar = styled.div`
  padding: 8px 16px;
  border-bottom: 1px solid #333;
`;

const SearchInput = styled.input`
  width: 100%;
  background: #2d2d2d;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 6px 10px 6px 30px;
  color: #d4d4d4;
  font-size: 12px;
  &:focus {
    outline: none;
    border-color: #007acc;
  }
`;

const TabBar = styled.div`
  display: flex;
  border-bottom: 1px solid #333;
`;

const Tab = styled.button<{ $active?: boolean }>`
  flex: 1;
  padding: 8px;
  border: none;
  background: ${(p) => (p.$active ? '#2d2d2d' : 'transparent')};
  color: ${(p) => (p.$active ? '#fff' : '#888')};
  font-size: 12px;
  cursor: pointer;
  border-bottom: 2px solid ${(p) => (p.$active ? '#007acc' : 'transparent')};
  &:hover {
    color: #fff;
  }
`;

const PluginList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 8px;
`;

const PluginCard = styled.div`
  padding: 12px;
  border: 1px solid #333;
  border-radius: 6px;
  margin-bottom: 8px;
  &:hover {
    border-color: #555;
  }
`;

const PluginName = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #fff;
`;

const PluginMeta = styled.div`
  font-size: 11px;
  color: #888;
  margin-top: 2px;
`;

const PluginDesc = styled.div`
  font-size: 12px;
  color: #aaa;
  margin-top: 6px;
`;

const PluginActions = styled.div`
  display: flex;
  gap: 6px;
  margin-top: 8px;
`;

const ActionButton = styled.button<{ $variant?: 'danger' | 'primary' }>`
  padding: 4px 10px;
  border-radius: 3px;
  border: 1px solid ${(p) => (p.$variant === 'danger' ? '#e06c75' : p.$variant === 'primary' ? '#007acc' : '#555')};
  background: ${(p) => (p.$variant === 'danger' ? '#e06c7520' : p.$variant === 'primary' ? '#007acc20' : 'transparent')};
  color: ${(p) => (p.$variant === 'danger' ? '#e06c75' : p.$variant === 'primary' ? '#007acc' : '#d4d4d4')};
  font-size: 11px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  &:hover {
    opacity: 0.8;
  }
`;

const StatusBadge = styled.span<{ $status: string }>`
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 3px;
  background: ${(p) =>
    p.$status === 'active' ? '#4ec94e20' : p.$status === 'error' ? '#e06c7520' : '#88888820'};
  color: ${(p) =>
    p.$status === 'active' ? '#4ec94e' : p.$status === 'error' ? '#e06c75' : '#888'};
`;

// Example available plugins for the "Browse" tab
const AVAILABLE_PLUGINS: IPlugin[] = [
  {
    manifest: {
      id: 'vim-mode',
      name: 'Vim Mode',
      version: '1.0.0',
      description: 'Vim keybindings for the Monaco editor',
      author: 'Community',
      type: 'extension',
    },
    activate: () => { /* Vim mode activation */ },
  },
  {
    manifest: {
      id: 'git-lens',
      name: 'Git Lens',
      version: '2.1.0',
      description: 'Enhanced git annotations and blame info inline',
      author: 'Community',
      type: 'extension',
    },
    activate: () => { /* Git lens activation */ },
  },
  {
    manifest: {
      id: 'dracula-theme',
      name: 'Dracula Theme',
      version: '1.3.0',
      description: 'A dark theme for the editor with vibrant colors',
      author: 'Community',
      type: 'theme',
    },
    activate: () => { /* Theme activation */ },
  },
];

export function PluginMarketplace() {
  const { plugins, installPlugin, activatePlugin, deactivatePlugin, uninstallPlugin } = usePluginManager();
  const [activeTab, setActiveTab] = useState<'installed' | 'browse'>('installed');
  const [filter, setFilter] = useState('');

  const installedIds = new Set(plugins.map((p) => p.plugin.manifest.id));
  const filteredInstalled = plugins.filter(
    (p) =>
      p.plugin.manifest.name.toLowerCase().includes(filter.toLowerCase()) ||
      p.plugin.manifest.description.toLowerCase().includes(filter.toLowerCase())
  );
  const filteredAvailable = AVAILABLE_PLUGINS.filter(
    (p) =>
      !installedIds.has(p.manifest.id) &&
      (p.manifest.name.toLowerCase().includes(filter.toLowerCase()) ||
        p.manifest.description.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <Container>
      <Header>
        <Package size={16} />
        Extensions
      </Header>

      <SearchBar>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 8, top: 7, color: '#888' }} />
          <SearchInput
            placeholder="Search extensions..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </SearchBar>

      <TabBar>
        <Tab $active={activeTab === 'installed'} onClick={() => setActiveTab('installed')}>
          Installed ({plugins.length})
        </Tab>
        <Tab $active={activeTab === 'browse'} onClick={() => setActiveTab('browse')}>
          Browse
        </Tab>
      </TabBar>

      <PluginList>
        {activeTab === 'installed' ? (
          filteredInstalled.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: '#666' }}>
              No extensions installed
            </div>
          ) : (
            filteredInstalled.map((state) => (
              <PluginCard key={state.plugin.manifest.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <PluginName>{state.plugin.manifest.name}</PluginName>
                  <StatusBadge $status={state.status}>{state.status}</StatusBadge>
                </div>
                <PluginMeta>
                  v{state.plugin.manifest.version} by {state.plugin.manifest.author}
                </PluginMeta>
                <PluginDesc>{state.plugin.manifest.description}</PluginDesc>
                {state.error && (
                  <div style={{ fontSize: 11, color: '#e06c75', marginTop: 4 }}>{state.error}</div>
                )}
                <PluginActions>
                  {state.status === 'active' ? (
                    <ActionButton onClick={() => deactivatePlugin(state.plugin.manifest.id)}>
                      <PowerOff size={12} /> Disable
                    </ActionButton>
                  ) : (
                    <ActionButton $variant="primary" onClick={() => activatePlugin(state.plugin.manifest.id)}>
                      <Power size={12} /> Enable
                    </ActionButton>
                  )}
                  <ActionButton $variant="danger" onClick={() => uninstallPlugin(state.plugin.manifest.id)}>
                    <Trash2 size={12} /> Uninstall
                  </ActionButton>
                </PluginActions>
              </PluginCard>
            ))
          )
        ) : filteredAvailable.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: '#666' }}>
            No extensions available
          </div>
        ) : (
          filteredAvailable.map((plugin) => (
            <PluginCard key={plugin.manifest.id}>
              <PluginName>{plugin.manifest.name}</PluginName>
              <PluginMeta>
                v{plugin.manifest.version} by {plugin.manifest.author} &middot; {plugin.manifest.type}
              </PluginMeta>
              <PluginDesc>{plugin.manifest.description}</PluginDesc>
              <PluginActions>
                <ActionButton $variant="primary" onClick={() => installPlugin(plugin)}>
                  <Download size={12} /> Install
                </ActionButton>
              </PluginActions>
            </PluginCard>
          ))
        )}
      </PluginList>
    </Container>
  );
}
