import '@testing-library/jest-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import Contact from './Contact';
import Privacy from './Privacy';
import Terms from './Terms';

vi.mock('@/components/layout/PageLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ui/page-header', () => ({
  default: ({ title, subtitle }: { title: string; subtitle: string }) => (
    <header>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </header>
  ),
}));

const fillRequiredFields = (email = 'bruce@example.com') => {
  fireEvent.change(screen.getByLabelText('Your Name'), { target: { value: 'Bruce' } });
  fireEvent.change(screen.getByLabelText('Email Address'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Hello' } });
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('published contact details', () => {
  it('renders the current email and phone links on the contact page', () => {
    render(<Contact />);

    expect(screen.getByRole('link', { name: 'Bfreshwater@vibe-tech.org' })).toHaveAttribute(
      'href',
      'mailto:Bfreshwater@vibe-tech.org',
    );
    expect(screen.getByRole('link', { name: '(803) 825-2876' })).toHaveAttribute(
      'href',
      'tel:+18038252876',
    );
  });

  it('requires a name, email, and message', () => {
    render(<Contact />);

    fireEvent.click(screen.getByRole('button', { name: 'Send Message' }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Name, email, and message are required.',
    );
  });

  it('treats unavailable form values as empty', () => {
    vi.stubGlobal(
      'FormData',
      class {
        get = () => null;
      },
    );
    render(<Contact />);

    fireEvent.click(screen.getByRole('button', { name: 'Send Message' }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('rejects an invalid email address', () => {
    render(<Contact />);
    fillRequiredFields('not-an-email');

    fireEvent.click(screen.getByRole('button', { name: 'Send Message' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Please enter a valid email address.');
  });

  it('submits valid contact details and resets the form', async () => {
    let resolveRequest!: (response: Response) => void;
    const request = new Promise<Response>((resolve) => {
      resolveRequest = resolve;
    });
    const fetchMock = vi.fn().mockReturnValue(request);
    vi.stubGlobal('fetch', fetchMock);
    render(<Contact />);
    fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: 'Send Message' }));
    expect(await screen.findByRole('button', { name: 'Sending...' })).toBeDisabled();

    await act(async () => {
      resolveRequest({ ok: true } as Response);
      await request;
    });

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Thank you. Your message has been sent.',
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/contact',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(screen.getByLabelText('Your Name')).toHaveValue('');
  });

  it('shows an error when the contact request fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    render(<Contact />);
    fillRequiredFields();

    fireEvent.click(screen.getByRole('button', { name: 'Send Message' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Submission failed. Please try again.',
    );
    expect(screen.getByRole('button', { name: 'Send Message' })).toBeEnabled();

  });
  it('renders the current email on the privacy page', () => {
    render(<Privacy />);

    expect(screen.getByText(/Bfreshwater@vibe-tech\.org/)).toBeInTheDocument();
  });

  it('renders the current email on the terms page', () => {
    render(<Terms />);

    expect(screen.getByText(/Bfreshwater@vibe-tech\.org/)).toBeInTheDocument();
  });
});
