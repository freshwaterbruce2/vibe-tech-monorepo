import { useEffect, useState } from 'react';
import {
  executeQuery,
  getTables,
  getTableSchema,
  listDatabases,
  QueryResult,
  TableSchema,
  TableSummary,
} from '../../lib/database';

export function DatabaseExplorer() {
  const [databases, setDatabases] = useState<string[]>([]);
  const [selectedDb, setSelectedDb] = useState<string | null>(null);
  const [tables, setTables] = useState<TableSummary[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [schema, setSchema] = useState<TableSchema[]>([]);
  const [query, setQuery] = useState('SELECT * FROM sqlite_master LIMIT 20;');
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listDatabases().then(setDatabases).catch(console.error);
  }, []);

  const handleSelectDb = async (db: string) => {
    setSelectedDb(db);
    setSelectedTable(null);
    setSchema([]);
    setResult(null);
    setError(null);
    try {
      const t = await getTables(db);
      setTables(t);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleSelectTable = async (table: string) => {
    if (!selectedDb) return;
    setSelectedTable(table);
    try {
      const s = await getTableSchema(selectedDb, table);
      setSchema(s);
      setQuery(`SELECT * FROM "${table}" LIMIT 50;`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleExecute = async () => {
    if (!selectedDb) return;
    setLoading(true);
    setError(null);
    try {
      const res = await executeQuery(selectedDb, query);
      setResult(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cp-root">
      <div className="cp-header">
        <h2 className="cp-title">
          <span>🗄️</span> Database Explorer
        </h2>
      </div>

      <div className="dbx-layout">
        {/* Databases panel */}
        <div className="dbx-panel dbx-panel--narrow">
          <div className="dbx-panel__title">Databases</div>
          <div className="dbx-panel__list">
            {databases.map((db) => (
              <button
                key={db}
                onClick={() => void handleSelectDb(db)}
                className={`dbx-item${selectedDb === db ? ' dbx-item--active' : ''}`}
              >
                {db.split(/[\\/]/).pop()}
              </button>
            ))}
            {databases.length === 0 && (
              <div
                style={{
                  padding: '12px',
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  fontStyle: 'italic',
                }}
              >
                Scanning D:\databases\...
              </div>
            )}
          </div>
        </div>

        {/* Tables panel */}
        <div className="dbx-panel dbx-panel--narrow">
          <div className="dbx-panel__title">Tables</div>
          <div className="dbx-panel__list">
            {tables.map((t) => (
              <button
                key={t.name}
                onClick={() => void handleSelectTable(t.name)}
                className={`dbx-item${selectedTable === t.name ? ' dbx-item--active' : ''}`}
              >
                <span>{t.name}</span>
                <span className="dbx-item__badge">{t.row_count}</span>
              </button>
            ))}
            {selectedDb && tables.length === 0 && (
              <div
                style={{
                  padding: '12px',
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  fontStyle: 'italic',
                }}
              >
                No tables found
              </div>
            )}
          </div>

          {/* Schema */}
          {schema.length > 0 && (
            <div className="dbx-schema">
              {schema.map((col) => (
                <div key={col.cid} className="dbx-schema__row">
                  <span className="dbx-schema__col">
                    {col.name}
                    {col.pk ? <span className="dbx-schema__pk">PK</span> : null}
                  </span>
                  <span className="dbx-schema__type">{col.type_name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Query + Results */}
        <div className="dbx-panel dbx-panel--wide">
          <div className="dbx-panel__title">Query</div>
          <div style={{ padding: '8px 12px' }}>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && e.ctrlKey && void handleExecute()}
              className="dbx-query__input"
              rows={3}
            />
          </div>
          <div className="dbx-query__actions">
            <button
              onClick={() => void handleExecute()}
              disabled={loading || !selectedDb}
              className="dbx-query__run"
            >
              {loading ? 'Running...' : 'Execute (Ctrl+Enter)'}
            </button>
          </div>

          {error && (
            <div className="cp-error" style={{ margin: '0 12px' }}>
              {error}
            </div>
          )}

          <div className="dbx-results">
            {loading ? (
              <div className="cp-empty">
                <div className="cp-spinner" style={{ marginBottom: '8px' }} />
                Executing query...
              </div>
            ) : result ? (
              <table className="dbx-table">
                <thead>
                  <tr>
                    {result.columns.map((col) => (
                      <th key={col}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j} title={cell}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="cp-empty">Select a database and run a query</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
