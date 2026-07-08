/**
 * MarkdownContent tests — spec 05 sanitized markdown host: rendered HTML for
 * real markdown (with XSS stripped) and the explicit empty state.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MarkdownContent } from '../../components/ArtifactsPanel/MarkdownContent';

describe('MarkdownContent', () => {
  it('renders sanitized markdown HTML', () => {
    render(<MarkdownContent markdown={'# Plan\n\n- step one\n\n<script>alert(1)</script>'} />);
    const body = screen.getByTestId('markdown-content');
    expect(body.querySelector('h1')?.textContent).toBe('Plan');
    expect(body.querySelector('li')?.textContent).toBe('step one');
    expect(body.innerHTML).not.toContain('<script');
  });

  it('shows the empty state for blank markdown', () => {
    render(<MarkdownContent markdown="" />);
    expect(screen.getByTestId('markdown-content-empty').textContent).toBe('No content.');
    expect(screen.queryByTestId('markdown-content')).toBeNull();
  });
});
