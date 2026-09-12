import React from 'react';
import CodeBlock from './CodeBlock';

export interface FormattedMessageContentProps {
  content: string;
  role: 'user' | 'model';
}

/**
 * Parses inline formatting: **bold**, `inline code`
 */
function renderInlineFormatting(text: string, keyPrefix: string): React.ReactNode[] {
  // Regex splitting by bold (**text**) or inline code (`code`)
  const parts = text.split(/(\*\*.*?\*\*|`[^`]+?`)/g);

  return parts.map((part, index) => {
    const key = `${keyPrefix}-inline-${index}`;
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      return (
        <strong key={key} className="font-semibold text-text-primary">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      return (
        <code
          key={key}
          className="px-1.5 py-0.5 mx-0.5 text-xs font-mono rounded bg-white/10 text-emerald-300 border border-[var(--glass-border)]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={key}>{part}</React.Fragment>;
  });
}

/**
 * Formats model & user messages with structured code blocks, bold text, and lists.
 * For user messages, simple whitespace-pre-wrap is used to preserve user input fidelity.
 */
export const FormattedMessageContent: React.FC<FormattedMessageContentProps> = ({
  content,
  role,
}) => {
  if (role === 'user') {
    return <p className="whitespace-pre-wrap leading-relaxed">{content}</p>;
  }

  // Tokenize fenced code blocks: ```lang ... ```
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n?([\s\S]*?)```/g;
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let segmentCount = 0;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const textBefore = content.substring(lastIndex, match.index);
    if (textBefore) {
      elements.push(
        <div key={`text-${segmentCount++}`} className="space-y-2">
          {renderTextParagraphs(textBefore, `pre-${segmentCount}`)}
        </div>
      );
    }

    const language = match[1]?.trim() || '';
    const code = match[2]?.trimEnd() || '';
    elements.push(<CodeBlock key={`code-${segmentCount++}`} language={language} code={code} />);

    lastIndex = match.index + match[0].length;
  }

  const remainingText = content.substring(lastIndex);
  if (remainingText) {
    elements.push(
      <div key={`text-${segmentCount++}`} className="space-y-2">
        {renderTextParagraphs(remainingText, `post-${segmentCount}`)}
      </div>
    );
  }

  return <div className="text-text-primary leading-relaxed space-y-2">{elements}</div>;
};

/**
 * Splits plain text into paragraphs and detects bullet lists or standard text.
 */
function renderTextParagraphs(text: string, prefix: string): React.ReactNode[] {
  const lines = text.split('\n');
  const result: React.ReactNode[] = [];
  let currentList: string[] = [];
  let listType: 'bullet' | 'ordered' | null = null;

  const flushList = (listIndex: number) => {
    if (currentList.length === 0) return;
    if (listType === 'bullet') {
      result.push(
        <ul key={`${prefix}-ul-${listIndex}`} className="list-disc list-inside space-y-1 my-1.5 pl-1">
          {currentList.map((item, i) => (
            <li key={`${prefix}-li-${i}`} className="text-text-primary">
              {renderInlineFormatting(item, `${prefix}-li-${i}`)}
            </li>
          ))}
        </ul>
      );
    } else {
      result.push(
        <ol key={`${prefix}-ol-${listIndex}`} className="list-decimal list-inside space-y-1 my-1.5 pl-1">
          {currentList.map((item, i) => (
            <li key={`${prefix}-oli-${i}`} className="text-text-primary">
              {renderInlineFormatting(item, `${prefix}-oli-${i}`)}
            </li>
          ))}
        </ol>
      );
    }
    currentList = [];
    listType = null;
  };

  lines.forEach((line, idx) => {
    const bulletMatch = line.match(/^(\s*[-*•]\s+)(.+)$/);
    const orderMatch = line.match(/^(\s*\d+\.\s+)(.+)$/);

    if (bulletMatch?.[2]) {
      if (listType === 'ordered') flushList(idx);
      listType = 'bullet';
      currentList.push(bulletMatch[2]);
    } else if (orderMatch?.[2]) {
      if (listType === 'bullet') flushList(idx);
      listType = 'ordered';
      currentList.push(orderMatch[2]);
    } else {
      flushList(idx);
      if (line.trim().length > 0) {
        result.push(
          <p key={`${prefix}-p-${idx}`} className="leading-relaxed">
            {renderInlineFormatting(line, `${prefix}-p-${idx}`)}
          </p>
        );
      }
    }
  });

  flushList(lines.length);
  return result;
}

export default FormattedMessageContent;
