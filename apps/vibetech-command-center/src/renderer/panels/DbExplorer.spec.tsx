import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DbExplorer } from './DbExplorer';
import type { DbExplorerDatabase, DbTableSchema, DbExplorerResult } from '@shared/types';

const mockList = vi.fn();
const mockSchema = vi.fn();
const mockQuery = vi.fn();

function setupBridge(opts: {
  list?: DbExplorerDatabase[] | null;
  listError?: boolean;
  schema?: DbTableSchema[];
  query?: DbExplorerResult;
  queryError?: boolean;
}) {
  mockList.mockReset();
  mockSchema.mockReset();
  mockQuery.mockReset();

  if (opts.listError) {
    mockList.mockRejectedValue(new Error('list failure'));
  } else if (opts.list) {
    mockList.mockResolvedValue({ ok: true, data: opts.list, timestamp: Date.now() });
  } else if (opts.list === null) {
    mockList.mockReturnValue(new Promise(() => {}));
  } else {
    mockList.mockResolvedValue({ ok: true, data: [], timestamp: Date.now() });
  }

  mockSchema.mockResolvedValue({ ok: true, data: opts.schema ?? [], timestamp: Date.now() });

  if (opts.queryError) {
    mockQuery.mockRejectedValue(new Error('query failure'));
  } else {
    mockQuery.mockResolvedValue({ ok: true, data: opts.query ?? { columns: [], rows: [], rowCount: 0, truncated: false, executionMs: 0 }, timestamp: Date.now() });
  }

  Object.defineProperty(window, 'commandCenter', {
    value: {
      dbExplorer: { list: mockList, schema: mockSchema, query: mockQuery }
    },
    writable: true,
    configurable: true
  });
}

function renderWithQuery(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
  return { qc };
}

const mockDb: DbExplorerDatabase = {
  name: 'test.db',
  path: 'D:\\databases\\test.db',
  sizeBytes: 4096,
  walSizeBytes: 512,
  lastModifiedAt: 1_700_000_000_000,
  tables: []
};

const sampleSchema: DbTableSchema[] = [
  {
    name: 'users',
    columns: [
      { name: 'id', type: 'INTEGER', notNull: true, defaultValue: null },
      { name: 'email', type: 'TEXT', notNull: false, defaultValue: null }
    ],
    rowCount: 42,
    estimatedSizeBytes: 8192
  }
];

describe('DbExplorer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows spinner while DB list loads', () => {
    setupBridge({ list: null });
    renderWithQuery(<DbExplorer />);
    expect(screen.getByText(/loading/i)).toBeTruthy();
  });

  it('shows error message when list fails', async () => {
    setupBridge({ listError: true });
    renderWithQuery(<DbExplorer />);
    await waitFor(() => expect(screen.getByText(/list failure/i)).toBeTruthy());
  });

  it('shows "No databases found" when list is empty', async () => {
    setupBridge({ list: [] });
    renderWithQuery(<DbExplorer />);
    await waitFor(() => expect(screen.getByText(/no databases found/i)).toBeTruthy());
  });

  describe('DB list rendering', () => {
    it('renders database names, paths, sizes, and WAL warnings', async () => {
      setupBridge({ list: [mockDb] });
      renderWithQuery(<DbExplorer />);

      await waitFor(() => expect(screen.getByText('test.db')).toBeTruthy());
      expect(screen.getByText(/databases\\test.db/i)).toBeTruthy();
      expect(screen.getByText('4.0 KB')).toBeTruthy();
      expect(screen.getByText(/WAL 512 B/i)).toBeTruthy();
    });
  });

  describe('selection & schema', () => {
    it('clicking a DB loads its schema', async () => {
      const user = userEvent.setup();
      setupBridge({ list: [mockDb], schema: sampleSchema });
      renderWithQuery(<DbExplorer />);

      await waitFor(() => expect(screen.getByText('test.db')).toBeTruthy());
      await user.click(screen.getByText('test.db'));

      await waitFor(() => expect(mockSchema).toHaveBeenCalledWith('D:\\databases\\test.db'));
    });

    it('shows tables, row counts, and column names/types', async () => {
      const user = userEvent.setup();
      setupBridge({ list: [mockDb], schema: sampleSchema });
      renderWithQuery(<DbExplorer />);

      await waitFor(() => expect(screen.getByText('test.db')).toBeTruthy());
      await user.click(screen.getByText('test.db'));

      await waitFor(() => expect(screen.getByText('users')).toBeTruthy());
      expect(screen.getByText('42 rows')).toBeTruthy();

      await user.click(screen.getByText('users'));
      await waitFor(() => expect(screen.getByText('Columns')).toBeTruthy());
      expect(screen.getByText('id')).toBeTruthy();
      expect(screen.getByText('email')).toBeTruthy();
      expect(screen.getByText(/INTEGER NOT NULL/)).toBeTruthy();
      expect(screen.getByText(/TEXT/)).toBeTruthy();
    });

    it('clicking a table auto-fills query editor', async () => {
      const user = userEvent.setup();
      setupBridge({ list: [mockDb], schema: sampleSchema });
      renderWithQuery(<DbExplorer />);

      await waitFor(() => expect(screen.getByText('test.db')).toBeTruthy());
      await user.click(screen.getByText('test.db'));
      await waitFor(() => expect(screen.getByText('users')).toBeTruthy());

      await user.click(screen.getByText('users'));
      await waitFor(() => expect(screen.getByText('Columns')).toBeTruthy());

      // Click the column button to trigger auto-fill
      await user.click(screen.getByText('id'));

      const textarea = screen.getByPlaceholderText(/enter select query/i) as HTMLTextAreaElement;
      expect(textarea.value).toBe('SELECT * FROM "users" LIMIT 100');
    });
  });

  describe('query execution', () => {
    it('typing SQL and clicking Run calls query API', async () => {
      const user = userEvent.setup();
      const queryResult: DbExplorerResult = {
        columns: ['id', 'email'],
        rows: [[1, 'a@example.com'], [2, 'b@example.com']],
        rowCount: 2,
        truncated: false,
        executionMs: 12.5
      };
      setupBridge({ list: [mockDb], schema: sampleSchema, query: queryResult });
      renderWithQuery(<DbExplorer />);

      await waitFor(() => expect(screen.getByText('test.db')).toBeTruthy());
      await user.click(screen.getByText('test.db'));
      await waitFor(() => expect(screen.getByText('users')).toBeTruthy());

      // Auto-fill query
      await user.click(screen.getByText('users'));
      await waitFor(() => expect(screen.getByText('Columns')).toBeTruthy());
      await user.click(screen.getByText('id'));

      await user.click(screen.getByRole('button', { name: /run query/i }));

      await waitFor(() => expect(mockQuery).toHaveBeenCalled());
      expect(mockQuery).toHaveBeenCalledWith(
        'D:\\databases\\test.db',
        'SELECT * FROM "users" LIMIT 100'
      );
    });

    it('renders results with correct headers and rows', async () => {
      const user = userEvent.setup();
      const queryResult: DbExplorerResult = {
        columns: ['id', 'email'],
        rows: [[1, 'a@example.com'], [2, 'b@example.com']],
        rowCount: 2,
        truncated: false,
        executionMs: 12.5
      };
      setupBridge({ list: [mockDb], schema: sampleSchema, query: queryResult });
      renderWithQuery(<DbExplorer />);

      await waitFor(() => expect(screen.getByText('test.db')).toBeTruthy());
      await user.click(screen.getByText('test.db'));
      await waitFor(() => expect(screen.getByText('users')).toBeTruthy());

      await user.click(screen.getByText('users'));
      await waitFor(() => expect(screen.getByText('Columns')).toBeTruthy());
      await user.click(screen.getByText('id'));

      await user.click(screen.getByRole('button', { name: /run query/i }));
      await waitFor(() => expect(screen.getByText('Results')).toBeTruthy());

      // Table headers are rendered as <th> elements
      const headers = screen.getAllByRole('columnheader');
      expect(headers.map((h) => h.textContent)).toContain('id');
      expect(headers.map((h) => h.textContent)).toContain('email');

      expect(screen.getByText('a@example.com')).toBeTruthy();
      expect(screen.getByText('b@example.com')).toBeTruthy();
    });

    it('shows truncation warning when truncated is true', async () => {
      const user = userEvent.setup();
      const queryResult: DbExplorerResult = {
        columns: ['id'],
        rows: [[1]],
        rowCount: 1001,
        truncated: true,
        executionMs: 5
      };
      setupBridge({ list: [mockDb], schema: sampleSchema, query: queryResult });
      renderWithQuery(<DbExplorer />);

      await waitFor(() => expect(screen.getByText('test.db')).toBeTruthy());
      await user.click(screen.getByText('test.db'));
      await waitFor(() => expect(screen.getByText('users')).toBeTruthy());

      await user.click(screen.getByText('users'));
      await waitFor(() => expect(screen.getByText('Columns')).toBeTruthy());
      await user.click(screen.getByText('id'));

      await user.click(screen.getByRole('button', { name: /run query/i }));
      await waitFor(() => expect(screen.getByText(/truncated to 1,000 rows/i)).toBeTruthy());
    });

    it('shows error message when query fails', async () => {
      const user = userEvent.setup();
      setupBridge({ list: [mockDb], schema: sampleSchema, queryError: true });
      renderWithQuery(<DbExplorer />);

      await waitFor(() => expect(screen.getByText('test.db')).toBeTruthy());
      await user.click(screen.getByText('test.db'));
      await waitFor(() => expect(screen.getByText('users')).toBeTruthy());

      await user.click(screen.getByText('users'));
      await waitFor(() => expect(screen.getByText('Columns')).toBeTruthy());
      await user.click(screen.getByText('id'));

      await user.click(screen.getByRole('button', { name: /run query/i }));
      await waitFor(() => expect(screen.getByText(/query failure/i)).toBeTruthy());
    });
  });

  it('renders green Read-only badge', async () => {
    setupBridge({ list: [mockDb] });
    renderWithQuery(<DbExplorer />);
    await waitFor(() => expect(screen.getByText(/read-only/i)).toBeTruthy());
  });
});
