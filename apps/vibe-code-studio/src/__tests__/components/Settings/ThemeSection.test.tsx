import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ThemeSection } from '../../../components/Settings/ThemeSection';
import { THEME_PRESETS } from '../../../services/theme/ThemeRegistry';

const themeFile = (content: string, name = 'my-theme.json') =>
  new File([content], name, { type: 'application/json' });

const VALID_JSON = JSON.stringify({
  name: 'Imported Dark',
  type: 'dark',
  colors: { 'editor.background': '#101010' },
  tokenColors: [{ scope: 'comment', settings: { foreground: '#888888' } }],
});

describe('ThemeSection', () => {
  it('renders every preset plus a custom option', () => {
    render(<ThemeSection value="one-dark-pro" onChange={vi.fn()} />);
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(THEME_PRESETS.length + 1);
    expect(screen.getByLabelText('Custom JSON theme')).toBeInTheDocument();
  });

  it('marks the active preset as selected', () => {
    render(<ThemeSection value="dracula" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Dracula theme')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByLabelText('Nord theme')).toHaveAttribute('aria-selected', 'false');
  });

  it('reports the chosen preset id', async () => {
    const onChange = vi.fn();
    render(<ThemeSection value="one-dark-pro" onChange={onChange} />);
    await userEvent.click(screen.getByLabelText('GitHub Light theme'));
    expect(onChange).toHaveBeenCalledWith('github-light');
  });

  it('reports "custom" when the custom card is chosen', async () => {
    const onChange = vi.fn();
    render(<ThemeSection value="dracula" onChange={onChange} />);
    await userEvent.click(screen.getByLabelText('Custom JSON theme'));
    expect(onChange).toHaveBeenCalledWith('custom');
  });

  it('marks the custom card selected when active', () => {
    render(<ThemeSection value="custom" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Custom JSON theme')).toHaveAttribute('aria-selected', 'true');
  });

  it('imports a picked VS Code theme file and reports the parsed result', async () => {
    const onImport = vi.fn();
    render(<ThemeSection value="custom" onChange={vi.fn()} onImport={onImport} />);

    fireEvent.change(screen.getByLabelText('Theme file'), {
      target: { files: [themeFile(VALID_JSON)] },
    });

    await waitFor(() => expect(onImport).toHaveBeenCalledTimes(1));
    const result = onImport.mock.calls[0][0];
    expect(result.name).toBe('Imported Dark');
    expect(result.type).toBe('dark');
    expect(JSON.parse(result.customThemeJson).colors['editor.background']).toBe('#101010');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('opens the file picker from the Import theme button', async () => {
    render(<ThemeSection value="custom" onChange={vi.fn()} onImport={vi.fn()} />);
    const input = screen.getByLabelText<HTMLInputElement>('Theme file');
    const clickSpy = vi.spyOn(input, 'click');
    await userEvent.click(screen.getByText('Import theme…'));
    expect(clickSpy).toHaveBeenCalled();
  });

  it('shows a typed error and does not import on malformed JSON', async () => {
    const onImport = vi.fn();
    render(<ThemeSection value="custom" onChange={vi.fn()} onImport={onImport} />);

    fireEvent.change(screen.getByLabelText('Theme file'), {
      target: { files: [themeFile('{ not json')] },
    });

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('not valid JSON');
    expect(onImport).not.toHaveBeenCalled();
  });

  it('clears a previous error after a successful import', async () => {
    const onImport = vi.fn();
    render(<ThemeSection value="custom" onChange={vi.fn()} onImport={onImport} />);
    const input = screen.getByLabelText('Theme file');

    fireEvent.change(input, { target: { files: [themeFile('broken')] } });
    await screen.findByRole('alert');

    fireEvent.change(input, { target: { files: [themeFile(VALID_JSON)] } });
    await waitFor(() => expect(onImport).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('accepts a theme file dropped onto the custom card', async () => {
    const onImport = vi.fn();
    render(<ThemeSection value="dracula" onChange={vi.fn()} onImport={onImport} />);
    const card = screen.getByLabelText('Custom JSON theme');

    fireEvent.dragOver(card);
    fireEvent.drop(card, { dataTransfer: { files: [themeFile(VALID_JSON)] } });

    await waitFor(() => expect(onImport).toHaveBeenCalledTimes(1));
    expect(onImport.mock.calls[0][0].name).toBe('Imported Dark');
  });

  it('ignores a drop with no files and a change with no file selected', () => {
    const onImport = vi.fn();
    render(<ThemeSection value="custom" onChange={vi.fn()} onImport={onImport} />);

    fireEvent.drop(screen.getByLabelText('Custom JSON theme'), {
      dataTransfer: { files: [] },
    });
    fireEvent.change(screen.getByLabelText('Theme file'), { target: { files: [] } });

    expect(onImport).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a generic error when the file cannot be read', async () => {
    const onImport = vi.fn();
    render(<ThemeSection value="custom" onChange={vi.fn()} onImport={onImport} />);
    const unreadable = {
      name: 'x.json',
      text: () => Promise.reject(new Error('boom')),
    } as unknown as File;

    fireEvent.drop(screen.getByLabelText('Custom JSON theme'), {
      dataTransfer: { files: [unreadable] },
    });

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe('Could not read theme file');
    expect(onImport).not.toHaveBeenCalled();
  });
});
