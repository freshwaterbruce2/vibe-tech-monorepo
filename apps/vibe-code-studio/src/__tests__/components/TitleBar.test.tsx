/**
 * TitleBar menu-handler reachability tests.
 *
 * The Edit ▸ Find / Replace, View ▸ Source Control / Zoom In / Zoom Out, and
 * Help ▸ About menu items were dead (logger.debug stubs). These tests render the
 * REAL TitleBar + DropdownMenu and assert each item now invokes its wired prop
 * (or, for About, opens a real dialog).
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import TitleBar from '../../components/TitleBar';

/** Open a top-level menu (File/Edit/View/Help) so its submenu items render. */
function openMenu(container: HTMLElement, topLabel: string) {
  const trigger = container.querySelector('[aria-haspopup="true"]');
  if (!trigger) throw new Error('menu trigger not found');
  fireEvent.click(trigger);
  fireEvent.click(screen.getByText(topLabel));
}

describe('TitleBar — menu handlers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('Edit ▸ Find invokes onFind', () => {
    const onFind = vi.fn();
    const { container } = render(<TitleBar onFind={onFind} />);

    openMenu(container, 'Edit');
    fireEvent.click(screen.getByText('Find'));

    expect(onFind).toHaveBeenCalledTimes(1);
  });

  it('Edit ▸ Replace invokes onReplace', () => {
    const onReplace = vi.fn();
    const { container } = render(<TitleBar onReplace={onReplace} />);

    openMenu(container, 'Edit');
    fireEvent.click(screen.getByText('Replace'));

    expect(onReplace).toHaveBeenCalledTimes(1);
  });

  it('View ▸ Source Control invokes onToggleGitPanel', () => {
    const onToggleGitPanel = vi.fn();
    const { container } = render(<TitleBar onToggleGitPanel={onToggleGitPanel} />);

    openMenu(container, 'View');
    fireEvent.click(screen.getByText('Source Control'));

    expect(onToggleGitPanel).toHaveBeenCalledTimes(1);
  });

  it('View ▸ Zoom In / Zoom Out invoke their handlers', () => {
    const onZoomIn = vi.fn();
    const onZoomOut = vi.fn();
    const { container } = render(<TitleBar onZoomIn={onZoomIn} onZoomOut={onZoomOut} />);

    openMenu(container, 'View');
    fireEvent.click(screen.getByText('Zoom In'));
    expect(onZoomIn).toHaveBeenCalledTimes(1);

    openMenu(container, 'View');
    fireEvent.click(screen.getByText('Zoom Out'));
    expect(onZoomOut).toHaveBeenCalledTimes(1);
  });

  it('Help ▸ About opens a dialog with the app version and closes on Close', () => {
    const { container } = render(<TitleBar />);

    openMenu(container, 'Help');
    fireEvent.click(screen.getByText('About Vibe Code Studio'));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText(/Version/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Close'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Help ▸ About closes when the overlay backdrop is clicked', () => {
    const { container } = render(<TitleBar />);

    openMenu(container, 'Help');
    fireEvent.click(screen.getByText('About Vibe Code Studio'));

    fireEvent.click(screen.getByRole('dialog'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
