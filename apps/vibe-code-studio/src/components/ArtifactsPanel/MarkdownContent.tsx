/**
 * MarkdownContent — sanitized markdown renderer (spec 05). Replaces the
 * preformatted fallback for plan-kind artifacts; also reused by Knowledge
 * Items (spec 04). All sanitization lives in utils/markdownRender.
 * Spec: FEATURE_SPECS/competitive-gaps/05-PLAN-MODE.md
 */
import { useMemo } from 'react';
import styled from 'styled-components';
import { renderMarkdownToSafeHtml } from '../../utils/markdownRender';

const Body = styled.div`
  padding: 12px 16px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-primary, #d4d4d4);
  overflow-wrap: break-word;

  h1,
  h2,
  h3 {
    margin: 0.8em 0 0.4em;
    line-height: 1.3;
  }

  ul,
  ol {
    padding-left: 1.4em;
  }

  code {
    font-family: 'JetBrains Mono', Consolas, monospace;
    font-size: 12px;
    background: rgba(255, 255, 255, 0.08);
    padding: 1px 4px;
    border-radius: 3px;
  }

  pre {
    background: rgba(0, 0, 0, 0.3);
    padding: 10px;
    border-radius: 6px;
    overflow-x: auto;
  }

  blockquote {
    margin: 0.6em 0;
    padding-left: 10px;
    border-left: 3px solid var(--accent-color, #4f8cff);
    opacity: 0.85;
  }
`;

export interface MarkdownContentProps {
  markdown: string;
}

export const MarkdownContent = ({ markdown }: MarkdownContentProps) => {
  const html = useMemo(() => renderMarkdownToSafeHtml(markdown), [markdown]);
  if (!html) {
    return <Body data-testid="markdown-content-empty">No content.</Body>;
  }
  // Sanitized by DOMPurify inside renderMarkdownToSafeHtml.
  return <Body data-testid="markdown-content" dangerouslySetInnerHTML={{ __html: html }} />;
};
