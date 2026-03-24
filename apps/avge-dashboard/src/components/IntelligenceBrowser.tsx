import { useAVGEStore } from '../stores/avge-store';
import type { IntelligenceItem } from '../types';

const MOCK_TREE: IntelligenceItem[] = [
  {
    name: 'raw_material',
    path: 'D:\\avge\\raw_material',
    type: 'directory',
    children: [
      {
        name: 'transcripts',
        path: 'D:\\avge\\raw_material\\transcripts',
        type: 'directory',
        children: [],
      },
      { name: 'pdfs', path: 'D:\\avge\\raw_material\\pdfs', type: 'directory', children: [] },
      { name: 'urls.json', path: 'D:\\avge\\raw_material\\urls.json', type: 'file', size: 0 },
    ],
  },
  {
    name: 'intelligence_index',
    path: 'D:\\avge\\intelligence_index',
    type: 'directory',
    children: [],
  },
  {
    name: 'assets',
    path: 'D:\\avge\\assets',
    type: 'directory',
    children: [
      { name: 'audio', path: 'D:\\avge\\assets\\audio', type: 'directory', children: [] },
      { name: 'visuals', path: 'D:\\avge\\assets\\visuals', type: 'directory', children: [] },
      {
        name: 'video_final',
        path: 'D:\\avge\\assets\\video_final',
        type: 'directory',
        children: [],
      },
    ],
  },
  {
    name: 'brain.md',
    path: 'D:\\avge\\brain.md',
    type: 'file',
    size: 2048,
  },
];

const FILE_ICONS: Record<string, string> = {
  directory: '📁',
  file: '📄',
  md: '📝',
  json: '📋',
  pdf: '📕',
  mp3: '🎵',
  png: '🖼️',
  mp4: '🎬',
};

function getIcon(item: IntelligenceItem): string {
  if (item.type === 'directory') return FILE_ICONS.directory;
  const ext = item.name.split('.').pop()?.toLowerCase() ?? '';
  return FILE_ICONS[ext] ?? FILE_ICONS.file;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileTreeNode({ item, depth = 0 }: { item: IntelligenceItem; depth?: number }) {
  const setSelectedFile = useAVGEStore((s) => s.setSelectedFile);
  const selectedFile = useAVGEStore((s) => s.selectedFile);
  const isSelected = selectedFile?.path === item.path;

  return (
    <>
      <div
        className={`file-item ${isSelected ? 'selected' : ''}`}
        style={{ paddingLeft: `calc(var(--space-3) + ${depth * 14}px)` }}
        onClick={() => setSelectedFile(item)}
      >
        <span className="icon">{getIcon(item)}</span>
        <span style={{ flex: 1, fontSize: 'var(--text-xs)' }}>{item.name}</span>
        {item.type === 'file' && item.size !== undefined && (
          <span
            className="mono"
            style={{
              fontSize: '9px',
              color: 'var(--text-tertiary)',
            }}
          >
            {formatSize(item.size)}
          </span>
        )}
      </div>
      {item.type === 'directory' &&
        item.children?.map((child) => (
          <FileTreeNode key={child.path} item={child} depth={depth + 1} />
        ))}
    </>
  );
}

export function IntelligenceBrowser() {
  const tree = useAVGEStore((s) => s.intelligenceTree);
  const displayTree = tree.length > 0 ? tree : MOCK_TREE;

  return (
    <div className="glass-panel panel">
      <div className="panel-header">
        <span className="panel-title">📚 Intelligence</span>
        <span
          className="mono"
          style={{
            fontSize: '9px',
            color: 'var(--text-tertiary)',
          }}
        >
          D:\avge\
        </span>
      </div>

      <div className="panel-body" style={{ padding: 0 }}>
        <div className="file-tree stagger">
          {displayTree.map((item) => (
            <FileTreeNode key={item.path} item={item} />
          ))}
        </div>

        {displayTree.length === 0 && (
          <div className="empty-state">
            <span className="icon">📭</span>
            <p style={{ fontSize: 'var(--text-sm)' }}>
              No sources ingested yet.
              <br />
              Add URLs or transcripts to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
