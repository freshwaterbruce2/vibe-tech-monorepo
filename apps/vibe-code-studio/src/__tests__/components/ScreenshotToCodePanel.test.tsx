import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => (
      <div {...props}>{children}</div>
    ),
    button: ({
      children,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
      <button type="button" {...props}>
        {children}
      </button>
    ),
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

const convertScreenshotToCode = vi.hoisted(() => vi.fn());

vi.mock('../../services/ImageToCodeService', () => ({
  ImageToCodeService: class {
    convertScreenshotToCode = convertScreenshotToCode;
  },
}));

import { ScreenshotToCodePanel } from '../../components/ScreenshotToCodePanel';

describe('ScreenshotToCodePanel', () => {
  beforeEach(() => {
    convertScreenshotToCode.mockReset();
  });

  it('renders upload zone and rejects non-image files', async () => {
    render(<ScreenshotToCodePanel apiKey="k" />);
    expect(screen.getByTestId('screenshot-to-code-panel')).toBeInTheDocument();
    expect(screen.getByTestId('screenshot-upload-zone')).toBeInTheDocument();

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const bad = new File(['x'], 'a.txt', { type: 'text/plain' });
    fireEvent.change(input, { target: { files: [bad] } });
    await waitFor(() =>
      expect(screen.getByText(/Please select an image file/i)).toBeInTheDocument()
    );
  });

  it('loads an image via file input and toggles options', async () => {
    render(<ScreenshotToCodePanel apiKey="k" onInsertCode={vi.fn()} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    class MockFileReader {
      result: string | null = null;
      onload: ((e: ProgressEvent<FileReader>) => void) | null = null;
      readAsDataURL() {
        this.result = 'data:image/png;base64,abc';
        this.onload?.({ target: this } as unknown as ProgressEvent<FileReader>);
      }
    }
    vi.stubGlobal('FileReader', MockFileReader);

    const img = new File(['img'], 'shot.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [img] } });

    await waitFor(() => expect(screen.getByAltText('Screenshot')).toBeInTheDocument());

    // Framework + styling selects appear after image load
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThanOrEqual(2);
    fireEvent.change(selects[0]!, { target: { value: 'html' } });
    fireEvent.change(selects[1]!, { target: { value: 'css' } });

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]!);
    fireEvent.click(checkboxes[1]!);
  });

  it('handles drag-drop of an image file', async () => {
    render(<ScreenshotToCodePanel apiKey="k" />);
    class MockFileReader {
      result: string | null = null;
      onload: ((e: ProgressEvent<FileReader>) => void) | null = null;
      readAsDataURL() {
        this.result = 'data:image/png;base64,xy';
        this.onload?.({ target: this } as unknown as ProgressEvent<FileReader>);
      }
    }
    vi.stubGlobal('FileReader', MockFileReader);

    const zone = screen.getByTestId('screenshot-upload-zone');
    const file = new File(['i'], 'd.png', { type: 'image/png' });
    fireEvent.drop(zone, {
      dataTransfer: { files: [file] },
      preventDefault: () => undefined,
    });
    await waitFor(() => expect(screen.getByAltText('Screenshot')).toBeInTheDocument());
  });
});
