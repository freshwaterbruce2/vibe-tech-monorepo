import { useCallback, useState } from 'react';
import { useAVGEStore } from '../stores/avge-store';

const BRAIN_PATH = 'D:/avge/brain.md';

export function ProjectConfig() {
  const sourceUrls = useAVGEStore((s) => s.sourceUrls);
  const addSourceUrl = useAVGEStore((s) => s.addSourceUrl);
  const removeSourceUrl = useAVGEStore((s) => s.removeSourceUrl);
  const brainContext = useAVGEStore((s) => s.brainContext);
  const setBrainContext = useAVGEStore((s) => s.setBrainContext);
  const brainLoading = useAVGEStore((s) => s.brainLoading);
  const setBrainLoading = useAVGEStore((s) => s.setBrainLoading);
  const isRunning = useAVGEStore((s) => s.isRunning);

  const [urlInput, setUrlInput] = useState('');
  const [activeTab, setActiveTab] = useState<'sources' | 'brain'>('sources');
  const [brainStatus, setBrainStatus] = useState<string | null>(null);

  const handleAddUrl = () => {
    const url = urlInput.trim();
    if (!url) return;
    try {
      new URL(url);
      addSourceUrl(url);
      setUrlInput('');
    } catch {
      // Invalid URL
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddUrl();
    }
  };

  const loadBrain = useCallback(async () => {
    setBrainLoading(true);
    setBrainStatus(null);
    try {
      const res = await fetch(`/api/fs/read?path=${encodeURIComponent(BRAIN_PATH)}`);
      if (!res.ok) throw new Error(await res.text());
      const text = await res.text();
      setBrainContext(text);
      setBrainStatus('Loaded ✓');
    } catch {
      // Fallback: show hint if no backend
      setBrainStatus('⚠ No API — paste content manually');
    } finally {
      setBrainLoading(false);
    }
  }, [setBrainContext, setBrainLoading]);

  const saveBrain = useCallback(async () => {
    setBrainLoading(true);
    setBrainStatus(null);
    try {
      const res = await fetch('/api/fs/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: BRAIN_PATH, content: brainContext }),
      });
      if (!res.ok) throw new Error(await res.text());
      setBrainStatus('Saved ✓');
    } catch {
      setBrainStatus('⚠ No API — copy content manually');
    } finally {
      setBrainLoading(false);
    }
  }, [brainContext, setBrainLoading]);

  return (
    <div className="glass-panel panel">
      <div className="panel-header">
        <span className="panel-title">⚙️ Config</span>
        <div style={{ display: 'flex', gap: '2px' }}>
          <button
            className={`tab-btn ${activeTab === 'sources' ? 'active' : ''}`}
            onClick={() => setActiveTab('sources')}
          >
            Sources
          </button>
          <button
            className={`tab-btn ${activeTab === 'brain' ? 'active' : ''}`}
            onClick={() => setActiveTab('brain')}
          >
            Brain
          </button>
        </div>
      </div>

      <div className="panel-body">
        {activeTab === 'sources' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {/* URL Input */}
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <input
                className="chat-input"
                type="url"
                placeholder="Paste YouTube URL or web page..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isRunning}
                style={{ fontSize: 'var(--text-xs)' }}
              />
              <button
                className="btn btn-primary"
                onClick={handleAddUrl}
                disabled={isRunning || !urlInput.trim()}
                style={{ flexShrink: 0, fontSize: 'var(--text-xs)' }}
              >
                + Add
              </button>
            </div>

            {/* Source URL Chips */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {sourceUrls.length === 0 && (
                <div className="empty-state" style={{ padding: 'var(--space-4)', height: 'auto' }}>
                  <span className="icon" style={{ fontSize: '1.5rem' }}>🔗</span>
                  <p style={{ fontSize: 'var(--text-xs)' }}>
                    No sources added yet. Paste 10+ YouTube URLs for competitive baseline.
                  </p>
                </div>
              )}

              {sourceUrls.map((url, i) => (
                <div key={i} className="source-chip">
                  <span style={{ flexShrink: 0, fontSize: 'var(--text-xs)' }}>
                    {url.includes('youtube.com') || url.includes('youtu.be') ? '🎬' : '🌐'}
                  </span>
                  <span className="mono" style={{
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: 'var(--text-secondary)',
                    fontSize: '10px',
                  }}>
                    {url}
                  </span>
                  <button
                    className="remove-btn"
                    onClick={() => removeSourceUrl(url)}
                    disabled={isRunning}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="mono" style={{
              fontSize: '9px',
              color: 'var(--text-tertiary)',
              textAlign: 'center',
            }}>
              {sourceUrls.length} source{sourceUrls.length !== 1 ? 's' : ''} loaded
            </div>
          </div>
        )}

        {activeTab === 'brain' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
                <span className="mono">{BRAIN_PATH}</span>
              </div>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                {brainStatus && (
                  <span className="mono" style={{ fontSize: '9px', color: 'var(--accent-secondary)', opacity: 0.8 }}>
                    {brainStatus}
                  </span>
                )}
                <button className="tab-btn" onClick={loadBrain} disabled={brainLoading || isRunning}>
                  Load
                </button>
                <button className="tab-btn" onClick={saveBrain} disabled={brainLoading || isRunning || !brainContext.trim()}>
                  Save
                </button>
              </div>
            </div>
            <textarea
              className="chat-input"
              style={{
                minHeight: '200px',
                resize: 'vertical',
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                lineHeight: 1.7,
              }}
              placeholder="Paste your brain.md content here for pipeline context injection..."
              value={brainContext}
              onChange={(e) => setBrainContext(e.target.value)}
              disabled={isRunning || brainLoading}
            />
          </div>
        )}
      </div>
    </div>
  );
}
