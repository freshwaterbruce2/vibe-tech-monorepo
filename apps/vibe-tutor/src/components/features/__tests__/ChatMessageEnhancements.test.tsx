import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CodeBlock from '../chat/CodeBlock';
import FormattedMessageContent from '../chat/FormattedMessageContent';
import ChatMessageActions from '../chat/ChatMessageActions';
import type { ChatMessage } from '../../../types';

describe('Chat UX Subcomponents', () => {
  describe('CodeBlock', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      });
    });

    it('renders code and language badge', () => {
      render(<CodeBlock language="typescript" code="const x: number = 42;" />);
      expect(screen.getByText('typescript')).toBeInTheDocument();
      expect(screen.getByText('const x: number = 42;')).toBeInTheDocument();
    });

    it('copies code to clipboard and shows temporary confirmation', async () => {
      render(<CodeBlock language="python" code="print('hello world')" />);
      const copyBtn = screen.getByLabelText('Copy code block');
      fireEvent.click(copyBtn);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("print('hello world')");
      await waitFor(() => {
        expect(screen.getByLabelText('Code copied')).toBeInTheDocument();
        expect(screen.getByText('Copied')).toBeInTheDocument();
      });
    });
  });

  describe('FormattedMessageContent', () => {
    it('renders user messages with whitespace-pre-wrap faithfully', () => {
      render(<FormattedMessageContent content="Line 1\nLine 2" role="user" />);
      expect(screen.getByText(/Line 1.*Line 2/s)).toBeInTheDocument();
    });

    it('renders model bold text and inline code blocks', () => {
      render(
        <FormattedMessageContent
          content="Here is **important** information with `console.log()` inside."
          role="model"
        />
      );
      expect(screen.getByText('important')).toBeInTheDocument();
      expect(screen.getByText('console.log()')).toBeInTheDocument();
    });

    it('renders model fenced code blocks cleanly', () => {
      const markdown = "Check this Python code:\n```python\ndef solve():\n    return 42\n```\nGood luck!";
      render(<FormattedMessageContent content={markdown} role="model" />);

      expect(screen.getByText('python')).toBeInTheDocument();
      expect(screen.getByText(/def solve\(\):/)).toBeInTheDocument();
      expect(screen.getByText('Good luck!')).toBeInTheDocument();
    });

    it('renders bullet lists and numbered lists', () => {
      const listContent = "Tasks:\n- Step one\n- Step two\n1. Number one\n2. Number two";
      render(<FormattedMessageContent content={listContent} role="model" />);

      expect(screen.getByText('Step one')).toBeInTheDocument();
      expect(screen.getByText('Step two')).toBeInTheDocument();
      expect(screen.getByText('Number one')).toBeInTheDocument();
      expect(screen.getByText('Number two')).toBeInTheDocument();
    });
  });

  describe('ChatMessageActions', () => {
    const mockMessage: ChatMessage = {
      role: 'model',
      content: 'Here is an answer to your question.',
      timestamp: 1726000000000,
    };

    beforeEach(() => {
      vi.clearAllMocks();
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      });
    });

    it('copies message text to clipboard', async () => {
      render(
        <ChatMessageActions
          message={mockMessage}
          role="model"
          onReportRequest={vi.fn()}
          isReported={false}
          isReporting={false}
        />
      );

      const copyBtn = screen.getByLabelText('Copy message text');
      fireEvent.click(copyBtn);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockMessage.content);
      await waitFor(() => {
        expect(screen.getByLabelText('Message copied')).toBeInTheDocument();
      });
    });

    it('triggers helpful and unhelpful feedback toggles', () => {
      const onFeedback = vi.fn();
      render(
        <ChatMessageActions
          message={mockMessage}
          role="model"
          feedback={null}
          onFeedback={onFeedback}
          onReportRequest={vi.fn()}
          isReported={false}
          isReporting={false}
        />
      );

      fireEvent.click(screen.getByLabelText('Mark helpful'));
      expect(onFeedback).toHaveBeenCalledWith(mockMessage.timestamp, 'helpful');

      fireEvent.click(screen.getByLabelText('Mark unhelpful'));
      expect(onFeedback).toHaveBeenCalledWith(mockMessage.timestamp, 'unhelpful');
    });

    it('hides feedback buttons on user messages', () => {
      const userMessage: ChatMessage = {
        role: 'user',
        content: 'My user question',
        timestamp: 1726000000000,
      };

      render(
        <ChatMessageActions
          message={userMessage}
          role="user"
          onFeedback={vi.fn()}
          onReportRequest={vi.fn()}
          isReported={false}
          isReporting={false}
        />
      );

      expect(screen.queryByLabelText('Mark helpful')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Report this message')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Copy message text')).toBeInTheDocument();
    });
  });
});
