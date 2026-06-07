import { useEffect, useState } from 'react';
import { executeQuery, listDatabases } from '../../lib/database';

interface MemoryItem {
  id: string;
  source: string;
  content: string;
  timestamp: string;
}

export function MemoryVisualizer() {
  const [search, setSearch] = useState('');
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dbPath, setDbPath] = useState<string | null>(null);

  useEffect(() => {
    listDatabases()
      .then((dbs) => {
        const memDb = dbs.find(
          (d) => d.includes('agent_learning.db') || d.includes('memory.db') || d.includes('learning'),
        );
        if (memDb) setDbPath(memDb);
      })
      .catch(console.error);
  }, []);

  const handleSearch = async () => {
    if (!dbPath) {
      setError('No memory database found (e.g. agent_learning.db or memory.db).');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const testQuery = `SELECT name FROM sqlite_master WHERE type='table' AND (name='memories' OR name='entities' OR name='messages') LIMIT 1;`;
      const tableRes = await executeQuery(dbPath, testQuery);

      if (tableRes.rows.length === 0) {
        throw new Error('Could not find a memories or entities table in ' + dbPath);
      }

      const table = tableRes.rows[0][0];
      const q = `
        SELECT * FROM "${table}"
        WHERE CAST(id AS TEXT) LIKE '%${search.replace(/'/g, "''")}%'
           OR CAST(content AS TEXT) LIKE '%${search.replace(/'/g, "''")}%'
        ORDER BY rowid DESC LIMIT 50;
      `;

      const res = await executeQuery(dbPath, q);

      const colId = res.columns.findIndex((c) => c.toLowerCase() === 'id');
      const colContent = res.columns.findIndex(
        (c) =>
          c.toLowerCase() === 'content' ||
          c.toLowerCase() === 'text' ||
          c.toLowerCase() === 'message',
      );
      const colTime = res.columns.findIndex(
        (c) =>
          c.toLowerCase().includes('time') ||
          c.toLowerCase().includes('date') ||
          c.toLowerCase() === 'created_at',
      );
      const colSource = res.columns.findIndex(
        (c) => c.toLowerCase() === 'source' || c.toLowerCase() === 'role',
      );

      const mapped = res.rows.map((r, i) => ({
        id: colId >= 0 ? r[colId] : String(i),
        content: colContent >= 0 ? r[colContent] : JSON.stringify(r),
        timestamp: colTime >= 0 ? r[colTime] : 'Unknown',
        source: colSource >= 0 ? r[colSource] : table,
      }));

      setMemories(mapped);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cp-root">
      <div className="cp-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <h2 className="cp-title">
            <span>🕸️</span> Neural Memory
          </h2>
          {dbPath && <span className="cp-subtitle">{dbPath}</span>}
        </div>

        <div className="mem-search">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleSearch()}
            placeholder="Search entities, concepts, or raw memories..."
            className="mem-search__input"
          />
          <button
            onClick={() => void handleSearch()}
            disabled={loading || !dbPath}
            className="mem-search__btn"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      <div className="cp-body">
        {error && <div className="cp-error">{error}</div>}

        {loading ? (
          <div className="cp-empty">
            <div className="cp-spinner" style={{ marginBottom: '8px' }} />
            Retrieving memories...
          </div>
        ) : memories.length > 0 ? (
          <div className="mem-list">
            {memories.map((mem) => (
              <div key={mem.id} className="mem-card">
                <div className="mem-card__head">
                  <div className="mem-card__meta">
                    <span className="mem-card__source">{mem.source}</span>
                    <span className="mem-card__id">{mem.id}</span>
                  </div>
                  <span className="mem-card__time">{mem.timestamp}</span>
                </div>
                <div className="mem-card__body">{mem.content}</div>
              </div>
            ))}
          </div>
        ) : (
          !error && <div className="cp-empty">Enter a query to explore neural patterns...</div>
        )}
      </div>
    </div>
  );
}
