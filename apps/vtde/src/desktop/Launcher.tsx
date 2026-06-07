import { createElement, useMemo, useState } from 'react';
import { AiIcon, CodeIcon, FinanceIcon, ToolsIcon, WebIcon } from '../icons';
import { getAppIcon } from '../icons/getAppIcon';
import type { VibeAppManifest } from '../types/vtde';

interface LauncherProps {
  apps: VibeAppManifest[];
  onLaunch: (id: string) => void;
  onClose: () => void;
}

const CATEGORIES: { key: string; label: string; icon: typeof CodeIcon }[] = [
  { key: 'dev', label: 'Dev', icon: CodeIcon },
  { key: 'ai', label: 'AI', icon: AiIcon },
  { key: 'business', label: 'Business', icon: FinanceIcon },
  { key: 'utility', label: 'Utility', icon: ToolsIcon },
];

const HEALTH_BADGES: Record<string, { emoji: string; title: string }> = {
  ready: { emoji: '✅', title: 'Built & ready' },
  unbuilt: { emoji: '⚠️', title: 'Not built (missing dist/)' },
};

export function Launcher({ apps, onLaunch, onClose }: LauncherProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = apps;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) => a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q),
      );
    }
    if (activeCategory) {
      list = list.filter((a) => a.category === activeCategory);
    }
    return list;
  }, [apps, search, activeCategory]);

  return (
    <div className="launcher-overlay" onClick={onClose}>
      <div className="launcher" onClick={(e) => e.stopPropagation()}>
        <input
          id="launcher-search-input"
          name="launcher-search-input"
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search apps..."
          className="launcher__search"
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'Enter' && filtered.length === 1) onLaunch(filtered[0].id);
          }}
        />

        <div className="launcher__categories">
          <button
            onClick={() => setActiveCategory(null)}
            className={`category-pill ${!activeCategory ? 'category-pill--active' : ''}`}
          >
            <WebIcon size={14} />
            <span>All</span>
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`category-pill ${activeCategory === cat.key ? 'category-pill--active' : ''}`}
            >
              {createElement(cat.icon, { size: 14 })}
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        <div className="launcher__grid">
          {filtered.map((app) => {
            const badge = HEALTH_BADGES[app.status];
            return (
              <button key={app.id} onClick={() => onLaunch(app.id)} className="launcher__app">
                <div className="launcher__app-icon">
                  {createElement(getAppIcon(app.name, app.category), { size: 32 })}
                  {badge && (
                    <span
                      className={`launcher__health-badge launcher__health-badge--${app.status}`}
                      title={badge.title}
                    >
                      {badge.emoji}
                    </span>
                  )}
                </div>
                <span className="launcher__app-name">{app.name}</span>
                <span className="launcher__app-desc">{app.description}</span>
                <span className="launcher__app-version">{app.version}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
