/**
 * markdownRender tests — sanitized markdown pipeline (spec 05): blank input,
 * structural rendering, XSS stripping, the breaks option, the escapeHtml
 * helper, and the never-throws fallback when marked itself fails.
 */
import { marked } from 'marked';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { escapeHtml, renderMarkdownToSafeHtml } from '../../utils/markdownRender';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('renderMarkdownToSafeHtml', () => {
  it('returns an empty string for blank input', () => {
    expect(renderMarkdownToSafeHtml('')).toBe('');
    expect(renderMarkdownToSafeHtml('   \n\t  ')).toBe('');
  });

  it('renders headings, lists, and code', () => {
    const html = renderMarkdownToSafeHtml('# Title\n\n- item one\n- item two\n\n`inline`');
    expect(html).toContain('<h1>');
    expect(html).toContain('Title');
    expect(html).toContain('<li>item one</li>');
    expect(html).toContain('<code>inline</code>');
  });

  it('strips script tags and event-handler attributes', () => {
    const html = renderMarkdownToSafeHtml('hello <script>alert(1)</script> world');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('alert(1)');
    expect(html).toContain('hello');

    const imgHtml = renderMarkdownToSafeHtml('<img src="x" onerror="alert(1)">safe');
    expect(imgHtml).not.toContain('onerror');
    expect(imgHtml).toContain('safe');
  });

  it('honors the breaks option in both settings', () => {
    expect(renderMarkdownToSafeHtml('line one\nline two', { breaks: true })).toContain('<br');
    expect(renderMarkdownToSafeHtml('line one\nline two', { breaks: false })).not.toContain('<br');
    // default (options omitted) matches breaks: false
    expect(renderMarkdownToSafeHtml('line one\nline two')).not.toContain('<br');
  });

  it('falls back to escaped preformatted text when marked throws', () => {
    vi.spyOn(marked, 'parse').mockImplementationOnce(() => {
      throw new Error('parser exploded');
    });
    const html = renderMarkdownToSafeHtml('<b>raw & risky</b>');
    expect(html).toContain('<pre>');
    expect(html).toContain('&lt;b&gt;raw &amp; risky&lt;/b&gt;');
    expect(html).not.toContain('<b>');
  });
});

describe('escapeHtml', () => {
  it('escapes all five HTML entities', () => {
    expect(escapeHtml('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#39;');
  });

  it('leaves plain text untouched', () => {
    expect(escapeHtml('plain text 123')).toBe('plain text 123');
  });
});
