/**
 * GlobalSearch Component & useGlobalSearch Hook Tests
 *
 * Tests the REAL component (src/components/GlobalSearch) and the REAL hook
 * (useGlobalSearch) against actual behavior: rendering, controlled inputs,
 * option/scope toggling, the debounced search, result rendering / expansion,
 * navigation, and replace-all.
 */
import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GlobalSearch, useGlobalSearch } from '../../components/GlobalSearch';
import type {
  GlobalSearchProps,
  SearchOptions,
  SearchResult,
  SearchScope,
} from '../../components/GlobalSearch';
import { vibeTheme } from '../../styles/theme';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type SearchInFiles = (
  searchText: string,
  files: string[],
  options: SearchOptions,
  scope?: SearchScope
) => Promise<Record<string, SearchResult[]>>;

const makeResult = (overrides: Partial<SearchResult> = {}): SearchResult => ({
  file: 'src/foo.ts',
  line: 12,
  column: 4,
  text: 'const foo = bar;',
  match: 'foo',
  before: 'const ',
  after: ' = bar;',
  ...overrides,
});

interface Handlers {
  onClose: ReturnType<typeof vi.fn<GlobalSearchProps['onClose']>>;
  onOpenFile: ReturnType<typeof vi.fn<GlobalSearchProps['onOpenFile']>>;
  onReplaceInFile: ReturnType<typeof vi.fn<GlobalSearchProps['onReplaceInFile']>>;
  onSearchInFiles: ReturnType<typeof vi.fn<SearchInFiles>>;
}

const makeHandlers = (searchResults: Record<string, SearchResult[]> = {}): Handlers => ({
  onClose: vi.fn<GlobalSearchProps['onClose']>(),
  onOpenFile: vi.fn<GlobalSearchProps['onOpenFile']>(),
  onReplaceInFile: vi.fn<GlobalSearchProps['onReplaceInFile']>().mockResolvedValue(undefined),
  onSearchInFiles: vi.fn<SearchInFiles>().mockResolvedValue(searchResults),
});

const renderComponent = (
  props: Partial<React.ComponentProps<typeof GlobalSearch>> = {},
  handlers: Handlers = makeHandlers()
) => {
  const merged = {
    isOpen: true,
    workspaceFiles: ['src/foo.ts', 'src/bar.ts'],
    workspaceRoot: '/workspace',
    onClose: handlers.onClose,
    onOpenFile: handlers.onOpenFile,
    onReplaceInFile: handlers.onReplaceInFile,
    onSearchInFiles: handlers.onSearchInFiles,
    ...props,
  };
  const utils = render(
    <ThemeProvider theme={vibeTheme}>
      <GlobalSearch {...merged} />
    </ThemeProvider>
  );
  return { ...utils, handlers };
};

const renderTheHook = (
  overrides: Partial<Parameters<typeof useGlobalSearch>[0]> = {},
  handlers: Handlers = makeHandlers()
) =>
  renderHook(() =>
    useGlobalSearch({
      isOpen: true,
      onClose: handlers.onClose,
      onOpenFile: handlers.onOpenFile,
      onReplaceInFile: handlers.onReplaceInFile,
      onSearchInFiles: handlers.onSearchInFiles,
      workspaceFiles: ['src/foo.ts', 'src/bar.ts'],
      workspaceRoot: '/workspace',
      ...overrides,
    })
  );

// ---------------------------------------------------------------------------
// Component: rendering
// ---------------------------------------------------------------------------

describe('GlobalSearch component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the search & replace header and both text inputs', () => {
      renderComponent();
      expect(screen.getByText('Search & Replace')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search text...')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Replace with...')).toBeInTheDocument();
    });

    it('renders the option toggles, scope toggles, and filter inputs', () => {
      renderComponent();
      // Match-mode option buttons
      expect(screen.getByText('Aa')).toBeInTheDocument();
      expect(screen.getByText('Ab')).toBeInTheDocument();
      expect(screen.getByText('.*')).toBeInTheDocument();
      // Scope buttons
      expect(screen.getByText('Open Files')).toBeInTheDocument();
      expect(screen.getByText('Workspace (Recursive)')).toBeInTheDocument();
      // Filter inputs
      expect(screen.getByPlaceholderText('files to include')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('files to exclude')).toBeInTheDocument();
    });

    it('seeds the exclude filter from DEFAULT_SEARCH_OPTIONS', () => {
      renderComponent();
      const exclude = screen.getByPlaceholderText('files to exclude') as HTMLInputElement;
      expect(exclude.value).toBe('node_modules,dist,build');
    });

    it('disables the workspace-recursive scope button when there is no workspaceRoot', () => {
      renderComponent({ workspaceRoot: null });
      const workspaceBtn = screen.getByText('Workspace (Recursive)') as HTMLButtonElement;
      expect(workspaceBtn).toBeDisabled();
    });

    it('renders the Search and Replace All action buttons', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Replace All' })).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Component: controlled inputs & buttons
  // -------------------------------------------------------------------------

  describe('Controlled inputs', () => {
    it('reflects typed text in the search input (controlled value)', () => {
      renderComponent();
      const input = screen.getByPlaceholderText('Search text...') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'needle' } });
      expect(input.value).toBe('needle');
    });

    it('reflects typed text in the replace input', () => {
      renderComponent();
      const input = screen.getByPlaceholderText('Replace with...') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'replacement' } });
      expect(input.value).toBe('replacement');
    });

    it('keeps the Search button disabled while the query is empty', () => {
      renderComponent();
      expect(screen.getByRole('button', { name: 'Search' })).toBeDisabled();
    });

    it('enables the Search button once a non-blank query is entered', () => {
      renderComponent();
      fireEvent.change(screen.getByPlaceholderText('Search text...'), {
        target: { value: 'foo' },
      });
      expect(screen.getByRole('button', { name: 'Search' })).toBeEnabled();
    });

    it('calls onClose when the header close button is clicked', () => {
      const handlers = makeHandlers();
      renderComponent({}, handlers);
      // Close button is the only button with no text label in the header.
      const buttons = screen.getAllByRole('button');
      const closeBtn = buttons.find(b => b.textContent === '');
      expect(closeBtn).toBeDefined();
      fireEvent.click(closeBtn as HTMLElement);
      expect(handlers.onClose).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Component: Escape closes the overlay
  // -------------------------------------------------------------------------

  describe('Escape key', () => {
    it('calls onClose when Escape is pressed in the auto-focused search input', () => {
      const handlers = makeHandlers();
      renderComponent({}, handlers);
      // The search input is auto-focused on open — Escape from inside a form
      // element must still close the overlay (enableOnFormTags).
      const input = screen.getByPlaceholderText('Search text...');
      fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });
      expect(handlers.onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when Escape is pressed with focus outside the inputs', () => {
      const handlers = makeHandlers();
      renderComponent({}, handlers);
      fireEvent.keyDown(document.body, { key: 'Escape', code: 'Escape' });
      expect(handlers.onClose).toHaveBeenCalledTimes(1);
    });

    it('does not close during an active IME composition (isComposing)', () => {
      const handlers = makeHandlers();
      renderComponent({}, handlers);
      const input = screen.getByPlaceholderText('Search text...');
      fireEvent.keyDown(input, { key: 'Escape', code: 'Escape', isComposing: true });
      expect(handlers.onClose).not.toHaveBeenCalled();
    });

    it('does not fire onClose while the panel is closed', () => {
      const handlers = makeHandlers();
      renderComponent({ isOpen: false }, handlers);
      fireEvent.keyDown(document.body, { key: 'Escape', code: 'Escape' });
      expect(handlers.onClose).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Component: option / scope toggling drives the search call args
  // -------------------------------------------------------------------------

  describe('Options & scope', () => {
    it('toggles wholeWord, regex, and filter inputs', async () => {
      const { handlers } = renderComponent();
      fireEvent.click(screen.getByText('Ab'));
      fireEvent.click(screen.getByText('.*'));
      fireEvent.change(screen.getByPlaceholderText(/files to include/i), {
        target: { value: 'src/**' },
      });
      fireEvent.change(screen.getByPlaceholderText(/files to exclude/i), {
        target: { value: '**/*.test.ts' },
      });
      fireEvent.change(screen.getByPlaceholderText(/search|find/i), {
        target: { value: 'foo' },
      });
      fireEvent.click(screen.getByRole('button', { name: /search/i }));
      await waitFor(() => expect(handlers.onSearchInFiles).toHaveBeenCalled());
      const opts = handlers.onSearchInFiles.mock.calls.at(-1)?.[2] as SearchOptions;
      expect(opts.wholeWord).toBe(true);
      expect(opts.regex).toBe(true);
      expect(opts.includeFiles).toBe('src/**');
      expect(opts.excludeFiles).toBe('**/*.test.ts');
    });

    it('passes caseSensitive=true to onSearchInFiles after toggling "Aa"', async () => {
      const handlers = makeHandlers({});
      renderComponent({}, handlers);

      fireEvent.click(screen.getByText('Aa'));
      fireEvent.change(screen.getByPlaceholderText('Search text...'), {
        target: { value: 'foo' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Search' }));

      await waitFor(() => expect(handlers.onSearchInFiles).toHaveBeenCalled());
      const [, , optionsArg] = handlers.onSearchInFiles.mock.calls.at(-1)!;
      expect(optionsArg.caseSensitive).toBe(true);
    });

    it('passes scope="workspace-recursive" once that scope is selected', async () => {
      const handlers = makeHandlers({});
      renderComponent({}, handlers);

      fireEvent.click(screen.getByText('Workspace (Recursive)'));
      fireEvent.change(screen.getByPlaceholderText('Search text...'), {
        target: { value: 'foo' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Search' }));

      await waitFor(() => expect(handlers.onSearchInFiles).toHaveBeenCalled());
      const lastCall = handlers.onSearchInFiles.mock.calls.at(-1)!;
      expect(lastCall[3]).toBe('workspace-recursive');
    });

    it('selects open-files scope', async () => {
      const handlers = makeHandlers({});
      renderComponent({}, handlers);
      fireEvent.click(screen.getByText('Open Files'));
      fireEvent.change(screen.getByPlaceholderText('Search text...'), {
        target: { value: 'bar' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Search' }));
      await waitFor(() => expect(handlers.onSearchInFiles).toHaveBeenCalled());
      const lastCall = handlers.onSearchInFiles.mock.calls.at(-1)!;
      expect(lastCall[3]).toBe('open-files');
    });
  });

  // -------------------------------------------------------------------------
  // Component: search execution + results rendering
  // -------------------------------------------------------------------------

  describe('Search results', () => {
    const results: Record<string, SearchResult[]> = {
      'src/foo.ts': [
        makeResult({ file: 'src/foo.ts', line: 1, column: 0 }),
        makeResult({ file: 'src/foo.ts', line: 5, column: 2 }),
      ],
      'src/bar.ts': [makeResult({ file: 'src/bar.ts', line: 9, column: 3 })],
    };

    it('calls onSearchInFiles with the query + workspace files and renders the summary', async () => {
      const handlers = makeHandlers(results);
      renderComponent({}, handlers);

      fireEvent.change(screen.getByPlaceholderText('Search text...'), {
        target: { value: 'foo' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Search' }));

      await waitFor(() => expect(screen.getByText('3 results in 2 files')).toBeInTheDocument());

      const [queryArg, filesArg] = handlers.onSearchInFiles.mock.calls.at(-1)!;
      expect(queryArg).toBe('foo');
      expect(filesArg).toEqual(['src/foo.ts', 'src/bar.ts']);
    });

    it('shows file group headers with per-file result counts', async () => {
      renderComponent({}, makeHandlers(results));
      fireEvent.change(screen.getByPlaceholderText('Search text...'), {
        target: { value: 'foo' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Search' }));

      await waitFor(() => expect(screen.getByText('src/foo.ts')).toBeInTheDocument());
      expect(screen.getByText('src/bar.ts')).toBeInTheDocument();
    });

    it('auto-expands the first files and renders highlighted match text', async () => {
      renderComponent({}, makeHandlers(results));
      fireEvent.change(screen.getByPlaceholderText('Search text...'), {
        target: { value: 'foo' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Search' }));

      // Auto-expanded => result lines visible without clicking the header.
      await waitFor(() => expect(screen.getByText('Line 1, Column 0')).toBeInTheDocument());
      // The matched substring is rendered (highlighted) for every result.
      expect(screen.getAllByText('foo').length).toBeGreaterThan(0);
    });

    it('navigates to a result via onOpenFile when a result row is clicked', async () => {
      const handlers = makeHandlers(results);
      renderComponent({}, handlers);
      fireEvent.change(screen.getByPlaceholderText('Search text...'), {
        target: { value: 'foo' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Search' }));

      const row = await screen.findByText('Line 9, Column 3');
      fireEvent.click(row);
      expect(handlers.onOpenFile).toHaveBeenCalledWith('src/bar.ts', 9, 3);
    });

    it('collapses a file group when its header is clicked', async () => {
      renderComponent({}, makeHandlers(results));
      fireEvent.change(screen.getByPlaceholderText('Search text...'), {
        target: { value: 'foo' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Search' }));

      await waitFor(() => expect(screen.getByText('Line 1, Column 0')).toBeInTheDocument());
      // Click the file header (the FileName element) to collapse it.
      fireEvent.click(screen.getByText('src/foo.ts'));
      expect(screen.queryByText('Line 1, Column 0')).not.toBeInTheDocument();
    });

    it('shows "No results found" when a query yields nothing', async () => {
      const handlers = makeHandlers({});
      renderComponent({}, handlers);
      fireEvent.change(screen.getByPlaceholderText('Search text...'), {
        target: { value: 'nope' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Search' }));

      await waitFor(() => expect(handlers.onSearchInFiles).toHaveBeenCalled());
      await waitFor(() => expect(screen.getByText('No results found')).toBeInTheDocument());
    });
  });

  // -------------------------------------------------------------------------
  // Component: debounce
  // -------------------------------------------------------------------------

  describe('Debounced search', () => {
    it('debounces typing and only fires the search after the 300ms delay', async () => {
      vi.useFakeTimers();
      try {
        const handlers = makeHandlers({});
        render(
          <ThemeProvider theme={vibeTheme}>
            <GlobalSearch
              isOpen
              workspaceFiles={['src/foo.ts']}
              workspaceRoot="/workspace"
              onClose={handlers.onClose}
              onOpenFile={handlers.onOpenFile}
              onReplaceInFile={handlers.onReplaceInFile}
              onSearchInFiles={handlers.onSearchInFiles}
            />
          </ThemeProvider>
        );

        act(() => {
          fireEvent.change(screen.getByPlaceholderText('Search text...'), {
            target: { value: 'foo' },
          });
        });

        // Not yet — debounce window hasn't elapsed.
        expect(handlers.onSearchInFiles).not.toHaveBeenCalled();

        await act(async () => {
          vi.advanceTimersByTime(300);
          // Flush the resolved onSearchInFiles promise (state update) so the
          // post-search setState happens inside act().
          await vi.runAllTimersAsync();
        });

        expect(handlers.onSearchInFiles).toHaveBeenCalledTimes(1);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  // -------------------------------------------------------------------------
  // Component: replace
  // -------------------------------------------------------------------------

  describe('Replace All', () => {
    const results: Record<string, SearchResult[]> = {
      'src/foo.ts': [makeResult({ file: 'src/foo.ts' })],
    };

    it('keeps Replace All disabled until query, replacement, and results all exist', async () => {
      renderComponent({}, makeHandlers(results));
      const replaceBtn = screen.getByRole('button', { name: 'Replace All' });
      expect(replaceBtn).toBeDisabled();

      fireEvent.change(screen.getByPlaceholderText('Search text...'), {
        target: { value: 'foo' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Search' }));
      await waitFor(() => expect(screen.getByText('src/foo.ts')).toBeInTheDocument());

      // Still disabled without a replacement value.
      expect(screen.getByRole('button', { name: 'Replace All' })).toBeDisabled();

      fireEvent.change(screen.getByPlaceholderText('Replace with...'), {
        target: { value: 'bar' },
      });
      expect(screen.getByRole('button', { name: 'Replace All' })).toBeEnabled();
    });

    it('invokes onReplaceInFile for each matched file on Replace All', async () => {
      const handlers = makeHandlers(results);
      renderComponent({}, handlers);

      fireEvent.change(screen.getByPlaceholderText('Search text...'), {
        target: { value: 'foo' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Search' }));
      await waitFor(() => expect(screen.getByText('src/foo.ts')).toBeInTheDocument());

      fireEvent.change(screen.getByPlaceholderText('Replace with...'), {
        target: { value: 'bar' },
      });
      fireEvent.click(screen.getByRole('button', { name: 'Replace All' }));

      await waitFor(() => expect(handlers.onReplaceInFile).toHaveBeenCalled());
      const [fileArg, searchArg, replaceArg] = handlers.onReplaceInFile.mock.calls.at(-1)!;
      expect(fileArg).toBe('src/foo.ts');
      expect(searchArg).toBe('foo');
      expect(replaceArg).toBe('bar');
    });
  });
});

// ---------------------------------------------------------------------------
// Hook: useGlobalSearch
// ---------------------------------------------------------------------------

describe('useGlobalSearch hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with empty state and the default search options', () => {
    const { result } = renderTheHook();
    expect(result.current.searchText).toBe('');
    expect(result.current.replaceText).toBe('');
    expect(result.current.scope).toBe('open-files');
    expect(result.current.results).toEqual({});
    expect(result.current.totalResults).toBe(0);
    expect(result.current.fileCount).toBe(0);
    expect(result.current.options.excludeFiles).toBe('node_modules,dist,build');
  });

  it('toggleOption flips a boolean match-mode option', () => {
    const { result } = renderTheHook();
    expect(result.current.options.regex).toBe(false);
    act(() => result.current.toggleOption('regex'));
    expect(result.current.options.regex).toBe(true);
    act(() => result.current.toggleOption('regex'));
    expect(result.current.options.regex).toBe(false);
  });

  it('setFilterOption updates include/exclude filter strings', () => {
    const { result } = renderTheHook();
    act(() => result.current.setFilterOption('includeFiles', '*.ts'));
    expect(result.current.options.includeFiles).toBe('*.ts');
  });

  it('performSearch stores results and derives totalResults / fileCount', async () => {
    const results: Record<string, SearchResult[]> = {
      'a.ts': [makeResult({ file: 'a.ts' }), makeResult({ file: 'a.ts', line: 2 })],
      'b.ts': [makeResult({ file: 'b.ts' })],
    };
    const handlers = makeHandlers(results);
    const { result } = renderTheHook({}, handlers);

    act(() => result.current.setSearchText('foo'));
    await act(async () => {
      await result.current.performSearch();
    });

    expect(result.current.results).toEqual(results);
    expect(result.current.totalResults).toBe(3);
    expect(result.current.fileCount).toBe(2);
    // Auto-expands the first (up to 3) files.
    expect(result.current.expandedFiles.has('a.ts')).toBe(true);
    expect(result.current.expandedFiles.has('b.ts')).toBe(true);
  });

  it('performSearch short-circuits to empty results for a blank query', async () => {
    const handlers = makeHandlers({ 'a.ts': [makeResult()] });
    const { result } = renderTheHook({}, handlers);

    await act(async () => {
      await result.current.performSearch();
    });

    expect(handlers.onSearchInFiles).not.toHaveBeenCalled();
    expect(result.current.results).toEqual({});
  });

  it('performSearch skips the backend call for workspace-recursive without a workspaceRoot', async () => {
    const handlers = makeHandlers({ 'a.ts': [makeResult()] });
    const { result } = renderTheHook({ workspaceRoot: null }, handlers);

    act(() => result.current.setSearchText('foo'));
    act(() => result.current.setScope('workspace-recursive'));
    await act(async () => {
      await result.current.performSearch();
    });

    expect(handlers.onSearchInFiles).not.toHaveBeenCalled();
    expect(result.current.results).toEqual({});
  });

  it('toggleFileExpansion adds then removes a file from the expanded set', () => {
    const { result } = renderTheHook();
    act(() => result.current.toggleFileExpansion('x.ts'));
    expect(result.current.expandedFiles.has('x.ts')).toBe(true);
    act(() => result.current.toggleFileExpansion('x.ts'));
    expect(result.current.expandedFiles.has('x.ts')).toBe(false);
  });

  it('handleResultClick forwards file/line/column to onOpenFile', () => {
    const handlers = makeHandlers();
    const { result } = renderTheHook({}, handlers);
    const target = makeResult({ file: 'z.ts', line: 7, column: 3 });
    act(() => result.current.handleResultClick(target));
    expect(handlers.onOpenFile).toHaveBeenCalledWith('z.ts', 7, 3);
  });

  it('handleReplaceAll is a no-op when replaceText is blank', async () => {
    const handlers = makeHandlers({ 'a.ts': [makeResult({ file: 'a.ts' })] });
    const { result } = renderTheHook({}, handlers);

    act(() => result.current.setSearchText('foo'));
    await act(async () => {
      await result.current.performSearch();
    });
    handlers.onReplaceInFile.mockClear();

    await act(async () => {
      await result.current.handleReplaceAll();
    });
    expect(handlers.onReplaceInFile).not.toHaveBeenCalled();
  });

  it('handleReplaceAll replaces in every matched file then re-runs the search', async () => {
    const results: Record<string, SearchResult[]> = {
      'a.ts': [makeResult({ file: 'a.ts' })],
      'b.ts': [makeResult({ file: 'b.ts' })],
    };
    const handlers = makeHandlers(results);
    const { result } = renderTheHook({}, handlers);

    act(() => result.current.setSearchText('foo'));
    act(() => result.current.setReplaceText('bar'));
    await act(async () => {
      await result.current.performSearch();
    });
    handlers.onSearchInFiles.mockClear();

    await act(async () => {
      await result.current.handleReplaceAll();
    });

    expect(handlers.onReplaceInFile).toHaveBeenCalledTimes(2);
    expect(handlers.onReplaceInFile.mock.calls.map(c => c[0]).sort()).toEqual(['a.ts', 'b.ts']);
    // After replacing, the hook refreshes results via another search.
    expect(handlers.onSearchInFiles).toHaveBeenCalled();
  });
});
