import { invoke } from '@tauri-apps/api/core';
import { File, Folder, Package, Play, Server } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}

interface DirectoryEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  last_modified: number;
}

export function VibeExplorer() {
  const [currentPath, setCurrentPath] = useState<string>('c:\\dev');
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDirectory = useCallback(async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await invoke<DirectoryEntry[]>('read_directory', { path });
      setEntries(data);
    } catch (err: unknown) {
      console.error('Failed to read directory:', err);
      setError(err instanceof Error ? err.message : String(err) || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDirectory(currentPath);
  }, [currentPath, loadDirectory]);

  const handleEntryClick = (entry: DirectoryEntry) => {
    if (entry.is_dir) {
      setCurrentPath(entry.path);
    } else {
      console.log('Clicked file:', entry.path);
    }
  };

  const goUp = () => {
    const parts = currentPath.split('\\').filter(Boolean);
    if (parts.length > 1) {
      parts.pop();
      const newPath = parts.join('\\') + (parts.length === 1 ? '\\' : '');
      setCurrentPath(newPath);
    }
  };

  const executeAction = async (action: string) => {
    try {
      await invoke('execute_monorepo_action', { path: currentPath, action });
    } catch (e) {
      console.error('Action failed:', e);
    }
  };

  return (
    <div className="vex">
      {/* Top Bar */}
      <div className="vex__toolbar">
        <button onClick={goUp} disabled={currentPath.length <= 3} className="vex__up-btn">
          Up
        </button>
        <div className="vex__path-bar">{currentPath}</div>
        <div className="vex__actions">
          <button
            onClick={() => {
              void executeAction('code .');
            }}
            className="vex__action-btn"
          >
            VS Code
          </button>
          <button
            onClick={() => {
              void executeAction('pnpm dev');
            }}
            className="vex__action-btn"
          >
            <Play size={12} /> Dev Server
          </button>
        </div>
      </div>

      <div className="vex__body">
        {/* Sidebar */}
        <div className="vex__sidebar">
          <h3 className="vex__sidebar-title">Quick Links</h3>
          <div className="vex__sidebar-links">
            <button
              onClick={() => {
                setCurrentPath('c:\\dev');
              }}
              className="vex__link"
            >
              <Package size={16} /> Monorepo
            </button>
            <button
              onClick={() => {
                setCurrentPath('d:\\databases');
              }}
              className="vex__link"
            >
              <Server size={16} /> Databases
            </button>
            <button
              onClick={() => {
                setCurrentPath('c:\\dev\\apps');
              }}
              className="vex__link"
            >
              <Folder size={16} /> Apps
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="vex__content">
          <div className="vex__grid">
            {/* Header row */}
            <div className="vex__grid-header">
              <span></span>
              <span>Name</span>
              <span>Date Modified</span>
              <span>Size</span>
            </div>

            {loading ? (
              <div className="vex__status">Loading...</div>
            ) : error ? (
              <div className="vex__status vex__status--error">Error: {error}</div>
            ) : entries.length === 0 ? (
              <div className="vex__status">Directory is empty</div>
            ) : (
              entries.map((entry) => (
                <div key={entry.path} className="vex__row" onClick={() => handleEntryClick(entry)}>
                  <span className="vex__row-icon">
                    {entry.is_dir ? <Folder size={18} /> : <File size={18} />}
                  </span>
                  <span className="vex__row-name">{entry.name}</span>
                  <span className="vex__row-date">{formatDate(entry.last_modified)}</span>
                  <span className="vex__row-size">
                    {entry.is_dir ? '--' : formatSize(entry.size)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
