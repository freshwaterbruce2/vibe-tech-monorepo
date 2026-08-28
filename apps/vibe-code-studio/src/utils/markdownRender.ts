/**
 * markdownRender — shared marked@17 + DOMPurify pipeline (spec 05). Renders
 * untrusted markdown (AI plans, knowledge items) to sanitized HTML for
 * dangerouslySetInnerHTML hosts. Pure module so the pipeline is unit-testable
 * without a DOM component harness.
 */
import DOMPurify from 'isomorphic-dompurify';
import { marked } from 'marked';

export interface MarkdownRenderOptions {
  /** Render single newlines as <br> (GFM hard breaks). Default false. */
  breaks?: boolean;
}

/** Render markdown to sanitized HTML ('' for blank input). Never throws. */
export function renderMarkdownToSafeHtml(
  markdown: string,
  options: MarkdownRenderOptions = {}
): string {
  if (!markdown.trim()) {
    return '';
  }
  try {
    const html = marked.parse(markdown, {
      async: false,
      gfm: true,
      breaks: options.breaks ?? false,
    });
    return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
  } catch {
    // Malformed input must degrade to visible text, never a blank viewer.
    return DOMPurify.sanitize(`<pre>${escapeHtml(markdown)}</pre>`, {
      USE_PROFILES: { html: true },
    });
  }
}

/** Minimal HTML escape for the plain-text fallback path. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
