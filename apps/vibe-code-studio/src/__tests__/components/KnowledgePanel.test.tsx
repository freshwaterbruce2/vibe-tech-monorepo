/**
 * KnowledgePanel component tests — Host gating + load-on-open, panel
 * add/filter/empty flows, card edit/delete, and the host `run` helper's
 * error logging. knowledgeIntegration is mocked; the UI store is real.
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KnowledgePanelHost } from '../../components/KnowledgePanel/KnowledgePanelHost';
import type { KnowledgeItem } from '../../services/knowledge/types';
import { logger } from '../../services/Logger';
import { useKnowledgeStore } from '../../stores/knowledgeStore';

vi.mock('../../services/knowledge/knowledgeIntegration', () => ({
  addKnowledgeItem: vi.fn().mockResolvedValue(undefined),
  deleteKnowledgeItem: vi.fn().mockResolvedValue(true),
  loadKnowledge: vi.fn().mockResolvedValue([]),
  updateKnowledgeItem: vi.fn().mockResolvedValue(undefined),
}));

import * as integration from '../../services/knowledge/knowledgeIntegration';

const item = (id: string, overrides: Partial<KnowledgeItem> = {}): KnowledgeItem => ({
  id,
  title: `Title ${id}`,
  content: `Body of ${id}`,
  category: 'general',
  scopeGlobs: [],
  sourceSessionId: 'manual',
  createdAt: '2026-07-05T00:00:00.000Z',
  updatedAt: '2026-07-05T00:00:00.000Z',
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  useKnowledgeStore.setState({ items: [], panelOpen: false, categoryFilter: null });
});

describe('KnowledgePanelHost', () => {
  it('renders nothing and skips loading while the panel is closed', () => {
    render(<KnowledgePanelHost />);
    expect(screen.queryByTestId('knowledge-panel')).toBeNull();
    expect(integration.loadKnowledge).not.toHaveBeenCalled();
  });

  it('loads knowledge and renders the panel when the store opens it', async () => {
    render(<KnowledgePanelHost />);
    useKnowledgeStore.getState().actions.setPanelOpen(true);
    expect(await screen.findByTestId('knowledge-panel')).toBeTruthy();
    expect(integration.loadKnowledge).toHaveBeenCalledTimes(1);
  });

  it('closes via the store when Close is clicked', () => {
    useKnowledgeStore.setState({ panelOpen: true });
    render(<KnowledgePanelHost />);
    fireEvent.click(screen.getByText('Close'));
    expect(useKnowledgeStore.getState().panelOpen).toBe(false);
    expect(screen.queryByTestId('knowledge-panel')).toBeNull();
  });

  it('logs and swallows load rejections (run helper error path)', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    vi.mocked(integration.loadKnowledge).mockRejectedValueOnce(new Error('load boom'));
    useKnowledgeStore.setState({ panelOpen: true });
    render(<KnowledgePanelHost />);
    await waitFor(() =>
      expect(errorSpy).toHaveBeenCalledWith('[knowledge] load failed', expect.any(Error))
    );
    errorSpy.mockRestore();
  });
});

describe('KnowledgePanel add flow', () => {
  it('adds an item from the form and clears the fields', async () => {
    useKnowledgeStore.setState({ panelOpen: true });
    render(<KnowledgePanelHost />);

    fireEvent.change(screen.getByTestId('knowledge-title'), { target: { value: 'Ports' } });
    fireEvent.change(screen.getByTestId('knowledge-content'), {
      target: { value: 'Vite uses 5173' },
    });
    fireEvent.change(screen.getByTestId('knowledge-category'), {
      target: { value: 'architecture' },
    });
    fireEvent.click(screen.getByTestId('knowledge-add'));

    expect(integration.addKnowledgeItem).toHaveBeenCalledWith({
      title: 'Ports',
      content: 'Vite uses 5173',
      category: 'architecture',
    });
    expect((screen.getByTestId('knowledge-title') as HTMLInputElement).value).toBe('');
    expect((screen.getByTestId('knowledge-content') as HTMLTextAreaElement).value).toBe('');
    expect((screen.getByTestId('knowledge-category') as HTMLInputElement).value).toBe('');
  });

  it('passes category undefined when the category field is blank', () => {
    useKnowledgeStore.setState({ panelOpen: true });
    render(<KnowledgePanelHost />);

    fireEvent.change(screen.getByTestId('knowledge-title'), { target: { value: 'Fact' } });
    fireEvent.change(screen.getByTestId('knowledge-content'), { target: { value: 'Body' } });
    fireEvent.click(screen.getByTestId('knowledge-add'));

    expect(integration.addKnowledgeItem).toHaveBeenCalledWith({
      title: 'Fact',
      content: 'Body',
      category: undefined,
    });
  });

  it('disables Add while title or content is blank', () => {
    useKnowledgeStore.setState({ panelOpen: true });
    render(<KnowledgePanelHost />);
    const add = screen.getByTestId('knowledge-add') as HTMLButtonElement;

    expect(add.disabled).toBe(true);
    fireEvent.change(screen.getByTestId('knowledge-title'), { target: { value: 'Only title' } });
    expect(add.disabled).toBe(true); // content still blank
    fireEvent.change(screen.getByTestId('knowledge-title'), { target: { value: '   ' } });
    fireEvent.change(screen.getByTestId('knowledge-content'), { target: { value: 'Body' } });
    expect(add.disabled).toBe(true); // whitespace title
    fireEvent.change(screen.getByTestId('knowledge-title'), { target: { value: 'Title' } });
    expect(add.disabled).toBe(false);
  });

  it('logs and swallows add rejections', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    vi.mocked(integration.addKnowledgeItem).mockRejectedValueOnce(new Error('add boom'));
    useKnowledgeStore.setState({ panelOpen: true });
    render(<KnowledgePanelHost />);

    fireEvent.change(screen.getByTestId('knowledge-title'), { target: { value: 'Fact' } });
    fireEvent.change(screen.getByTestId('knowledge-content'), { target: { value: 'Body' } });
    fireEvent.click(screen.getByTestId('knowledge-add'));

    await waitFor(() =>
      expect(errorSpy).toHaveBeenCalledWith('[knowledge] add failed', expect.any(Error))
    );
    errorSpy.mockRestore();
  });
});

describe('KnowledgePanel list, filter, and empty state', () => {
  it('shows the empty state when there are no items', () => {
    useKnowledgeStore.setState({ panelOpen: true });
    render(<KnowledgePanelHost />);
    expect(screen.getByTestId('knowledge-empty')).toBeTruthy();
  });

  it('narrows the list via the category filter and restores it on "all"', () => {
    useKnowledgeStore.setState({
      panelOpen: true,
      items: [
        item('knowledge-a', { category: 'architecture' }),
        item('knowledge-b', { category: 'workflow' }),
      ],
    });
    render(<KnowledgePanelHost />);

    expect(screen.getByTestId('knowledge-item-knowledge-a')).toBeTruthy();
    expect(screen.getByTestId('knowledge-item-knowledge-b')).toBeTruthy();

    fireEvent.change(screen.getByTestId('knowledge-filter'), {
      target: { value: 'architecture' },
    });
    expect(useKnowledgeStore.getState().categoryFilter).toBe('architecture');
    expect(screen.getByTestId('knowledge-item-knowledge-a')).toBeTruthy();
    expect(screen.queryByTestId('knowledge-item-knowledge-b')).toBeNull();

    fireEvent.change(screen.getByTestId('knowledge-filter'), { target: { value: '' } });
    expect(useKnowledgeStore.getState().categoryFilter).toBeNull();
    expect(screen.getByTestId('knowledge-item-knowledge-b')).toBeTruthy();
  });
});

describe('KnowledgeItemCard', () => {
  it('renders title, category tag, source meta, and markdown body', () => {
    useKnowledgeStore.setState({
      panelOpen: true,
      items: [item('knowledge-a', { category: 'architecture' })],
    });
    render(<KnowledgePanelHost />);

    const card = within(screen.getByTestId('knowledge-item-knowledge-a'));
    expect(card.getByText('Title knowledge-a')).toBeTruthy();
    expect(card.getByText('architecture')).toBeTruthy();
    expect(card.getByText(/source: manual/)).toBeTruthy();
    expect(card.getByText('Body of knowledge-a')).toBeTruthy();
  });

  it('edits content through the Edit → textarea → Save flow', () => {
    useKnowledgeStore.setState({ panelOpen: true, items: [item('knowledge-a')] });
    render(<KnowledgePanelHost />);

    fireEvent.click(screen.getByTestId('knowledge-edit'));
    const editor = screen.getByTestId('knowledge-editor') as HTMLTextAreaElement;
    expect(editor.value).toBe('Body of knowledge-a');
    fireEvent.change(editor, { target: { value: 'Updated body' } });
    fireEvent.click(screen.getByTestId('knowledge-save'));

    expect(integration.updateKnowledgeItem).toHaveBeenCalledWith('knowledge-a', {
      content: 'Updated body',
    });
    expect(screen.queryByTestId('knowledge-editor')).toBeNull(); // back to view mode
  });

  it('deletes via the Delete button', () => {
    useKnowledgeStore.setState({ panelOpen: true, items: [item('knowledge-a')] });
    render(<KnowledgePanelHost />);
    fireEvent.click(screen.getByTestId('knowledge-delete'));
    expect(integration.deleteKnowledgeItem).toHaveBeenCalledWith('knowledge-a');
  });
});
