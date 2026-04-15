import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChatMessage } from '../../../types';
import ChatWindow from '../ChatWindow';
import { secureClient } from '../../../services/secureClient';

// Mock scrollIntoView (not available in jsdom)
Element.prototype.scrollIntoView = vi.fn();

// Mock dependencies
vi.mock('../../../services/secureClient', () => ({
  secureClient: {
    healthCheck: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('@/services', () => ({
  syncService: {
    logEvent: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../../services/dataStore', () => ({
  dataStore: {
    getChatHistory: vi.fn().mockResolvedValue([]),
    saveChatHistory: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../LifeSkillsChecklist', () => ({
  default: () => <div data-testid="life-skills-checklist">Life Skills Checklist</div>,
}));

vi.mock('../SocialSkillsTips', () => ({
  default: ({ onAskBuddy }: any) => (
    <div data-testid="social-skills-tips">
      <button onClick={() => onAskBuddy('How do I make friends?')}>Ask Example</button>
    </div>
  ),
}));

describe('ChatWindow', () => {
  const mockOnSendMessage = vi.fn();

  const defaultProps = {
    title: 'AI Tutor',
    description: 'Get help with your homework',
    onSendMessage: mockOnSendMessage,
    type: 'tutor' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSendMessage.mockResolvedValue('This is a test response from AI');
    vi.mocked(secureClient.healthCheck).mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('renders chat window with title and description', () => {
      render(<ChatWindow {...defaultProps} />);

      expect(screen.getByText('AI Tutor')).toBeInTheDocument();
      expect(screen.getByText('Get help with your homework')).toBeInTheDocument();
    });

    it('renders input field with correct placeholder', () => {
      render(<ChatWindow {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Message your AI Tutor/i);
      expect(input).toBeInTheDocument();
    });

    it('renders send button', () => {
      render(<ChatWindow {...defaultProps} />);

      const sendButton = screen.getByLabelText('Send message');
      expect(sendButton).toBeInTheDocument();
    });

    it('renders AI Buddy tools when type is friend', () => {
      render(<ChatWindow {...defaultProps} type="friend" title="AI Buddy" />);

      expect(screen.getByText(/Life Skills/i)).toBeInTheDocument();
      expect(screen.getByText(/Social Tips/i)).toBeInTheDocument();
    });

    it('does not render AI Buddy tools when type is tutor', () => {
      render(<ChatWindow {...defaultProps} />);

      expect(screen.queryByText(/Life Skills/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Social Tips/i)).not.toBeInTheDocument();
    });
  });

  describe('Message Sending', () => {
    it('sends message when send button is clicked', async () => {
      render(<ChatWindow {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Message your AI Tutor/i);
      const sendButton = screen.getByLabelText('Send message');

      fireEvent.change(input, { target: { value: 'Hello AI' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(mockOnSendMessage).toHaveBeenCalledWith('Hello AI');
      });
    });

    it('sends message when Enter key is pressed', async () => {
      render(<ChatWindow {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Message your AI Tutor/i);

      fireEvent.change(input, { target: { value: 'Hello AI' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(mockOnSendMessage).toHaveBeenCalledWith('Hello AI');
      });
    });

    it('does not send message when Shift+Enter is pressed', async () => {
      render(<ChatWindow {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Message your AI Tutor/i);

      fireEvent.change(input, { target: { value: 'Hello AI' } });
      fireEvent.keyPress(input, { key: 'Enter', shiftKey: true, code: 'Enter', charCode: 13 });

      await waitFor(() => {
        expect(mockOnSendMessage).not.toHaveBeenCalled();
      });
    });

    it('sends message when Ctrl+Enter is pressed', async () => {
      render(<ChatWindow {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Message your AI Tutor/i);

      fireEvent.change(input, { target: { value: 'Hello AI' } });
      fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true, code: 'Enter' });

      await waitFor(() => {
        expect(mockOnSendMessage).toHaveBeenCalledWith('Hello AI');
      });
    });

    it('clears input after sending message', async () => {
      render(<ChatWindow {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Message your AI Tutor/i) as HTMLInputElement;
      const sendButton = screen.getByLabelText('Send message');

      fireEvent.change(input, { target: { value: 'Hello AI' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });

    it('displays user message immediately after sending', async () => {
      render(<ChatWindow {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Message your AI Tutor/i);
      const sendButton = screen.getByLabelText('Send message');

      fireEvent.change(input, { target: { value: 'Hello AI' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Hello AI')).toBeInTheDocument();
      });
    });

    it('displays AI response after receiving', async () => {
      render(<ChatWindow {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Message your AI Tutor/i);
      const sendButton = screen.getByLabelText('Send message');

      fireEvent.change(input, { target: { value: 'Hello AI' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('This is a test response from AI')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading indicator while waiting for response', async () => {
      mockOnSendMessage.mockImplementation(
        async () => new Promise((resolve) => setTimeout(() => resolve('Response'), 100)),
      );

      render(<ChatWindow {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Message your AI Tutor/i);
      const sendButton = screen.getByLabelText('Send message');

      fireEvent.change(input, { target: { value: 'Hello AI' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/AI Tutor is thinking/i)).toBeInTheDocument();
      });
    });

    it('disables input and send button while loading', async () => {
      mockOnSendMessage.mockImplementation(
        async () => new Promise((resolve) => setTimeout(() => resolve('Response'), 100)),
      );

      render(<ChatWindow {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Message your AI Tutor/i) as HTMLInputElement;
      const sendButton = screen.getByLabelText('Send message') as HTMLButtonElement;

      fireEvent.change(input, { target: { value: 'Hello AI' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(input.disabled).toBe(true);
        expect(sendButton.disabled).toBe(true);
      });
    });

    it('re-enables input after response (button stays disabled when input empty)', async () => {
      render(<ChatWindow {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Message your AI Tutor/i) as HTMLInputElement;
      const sendButton = screen.getByLabelText('Send message') as HTMLButtonElement;

      fireEvent.change(input, { target: { value: 'Hello AI' } });
      fireEvent.click(sendButton);

      // First wait for the response to appear
      await waitFor(() => {
        expect(screen.getByText('This is a test response from AI')).toBeInTheDocument();
      });

      // Then verify input is re-enabled
      await waitFor(() => {
        expect(input.disabled).toBe(false);
      });

      // Send button stays disabled because input is empty (correct behavior)
      expect(sendButton.disabled).toBe(true);
      expect(input.value).toBe(''); // Input was cleared after sending
    });
  });

  describe('Error Handling', () => {
    it('displays error message when API call fails', async () => {
      mockOnSendMessage.mockRejectedValue(new Error('Network error'));

      render(<ChatWindow {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Message your AI Tutor/i);
      const sendButton = screen.getByLabelText('Send message');

      fireEvent.change(input, { target: { value: 'Hello AI' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        // Check for any of the possible error messages
        expect(
          screen.getByText(
            /trouble connecting|technical difficulties|couldn't process|went wrong/i,
          ),
        ).toBeInTheDocument();
      });
    });

    it('displays error message when response is empty', async () => {
      mockOnSendMessage.mockResolvedValue('');

      render(<ChatWindow {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Message your AI Tutor/i);
      const sendButton = screen.getByLabelText('Send message');

      fireEvent.change(input, { target: { value: 'Hello AI' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        // Check for any of the possible error messages
        expect(
          screen.getByText(
            /trouble connecting|technical difficulties|couldn't process|went wrong/i,
          ),
        ).toBeInTheDocument();
      });
    });

    it('does not send empty messages', async () => {
      render(<ChatWindow {...defaultProps} />);

      const sendButton = screen.getByLabelText('Send message');
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(mockOnSendMessage).not.toHaveBeenCalled();
      });
    });

    it('does not send whitespace-only messages', async () => {
      render(<ChatWindow {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Message your AI Tutor/i);
      const sendButton = screen.getByLabelText('Send message');

      fireEvent.change(input, { target: { value: '   ' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(mockOnSendMessage).not.toHaveBeenCalled();
      });
    });
  });

  describe('Chat History', () => {
    it('loads chat history on mount', async () => {
      const mockHistory: ChatMessage[] = [
        { role: 'user', content: 'Hello', timestamp: Date.now() - 1000 },
        { role: 'model', content: 'Hi there!', timestamp: Date.now() },
      ];

      const { dataStore } = await import('../../../services/dataStore');
      vi.mocked(dataStore.getChatHistory).mockResolvedValue(mockHistory);

      render(<ChatWindow {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Hello')).toBeInTheDocument();
        expect(screen.getByText('Hi there!')).toBeInTheDocument();
      });
    });

    it('saves chat history when messages change', async () => {
      const { dataStore } = await import('../../../services/dataStore');

      render(<ChatWindow {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Message your AI Tutor/i);
      const sendButton = screen.getByLabelText('Send message');

      fireEvent.change(input, { target: { value: 'Hello AI' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(dataStore.saveChatHistory).toHaveBeenCalled();
      });
    });

    it('clears chat history when clear button is clicked', async () => {
      const mockHistory: ChatMessage[] = [
        { role: 'user', content: 'Hello', timestamp: Date.now() },
      ];

      const { dataStore } = await import('../../../services/dataStore');
      vi.mocked(dataStore.getChatHistory).mockResolvedValue(mockHistory);

      render(<ChatWindow {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Hello')).toBeInTheDocument();
      });

      const clearButton = screen.getByText('Clear Chat');
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(screen.queryByText('Hello')).not.toBeInTheDocument();
        expect(dataStore.saveChatHistory).toHaveBeenCalledWith('tutor', []);
      });
    });
  });

  describe('AI Buddy Features', () => {
    it('opens life skills checklist when button is clicked', async () => {
      render(<ChatWindow {...defaultProps} type="friend" title="AI Buddy" />);

      const lifeSkillsButton = screen.getByText(/Life Skills/i);
      fireEvent.click(lifeSkillsButton);

      await waitFor(() => {
        expect(screen.getByTestId('life-skills-checklist')).toBeInTheDocument();
      });
    });

    it('opens social tips when button is clicked', async () => {
      render(<ChatWindow {...defaultProps} type="friend" title="AI Buddy" />);

      const socialTipsButton = screen.getByText(/Social Tips/i);
      fireEvent.click(socialTipsButton);

      await waitFor(() => {
        expect(screen.getByTestId('social-skills-tips')).toBeInTheDocument();
      });
    });

    it('closes overlay when X button is clicked', async () => {
      render(<ChatWindow {...defaultProps} type="friend" title="AI Buddy" />);

      const lifeSkillsButton = screen.getByText(/Life Skills/i);
      fireEvent.click(lifeSkillsButton);

      await waitFor(() => {
        expect(screen.getByTestId('life-skills-checklist')).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: /close panel/i });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByTestId('life-skills-checklist')).not.toBeInTheDocument();
      });
    });

    it('populates input from social tips', async () => {
      render(<ChatWindow {...defaultProps} type="friend" title="AI Buddy" />);

      const socialTipsButton = screen.getByText(/Social Tips/i);
      fireEvent.click(socialTipsButton);

      await waitFor(() => {
        expect(screen.getByTestId('social-skills-tips')).toBeInTheDocument();
      });

      const askButton = screen.getByText('Ask Example');
      fireEvent.click(askButton);

      const input = screen.getByPlaceholderText(/Message your AI Buddy/i) as HTMLInputElement;
      expect(input.value).toBe('How do I make friends?');
    });
  });

  describe('Emoji Limiting', () => {
    it('limits AI response to 2 emojis', async () => {
      mockOnSendMessage.mockResolvedValue('Hello 😀😁😂😃😄 friend!');

      render(<ChatWindow {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Message your AI Tutor/i);
      const sendButton = screen.getByLabelText('Send message');

      fireEvent.change(input, { target: { value: 'Hello' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        const responseText = screen.getByText(/Hello.*friend!/);
        // Count emojis in the response
        const emojiRegex = /[\u{1F300}-\u{1F9FF}]/gu;
        const emojis = responseText.textContent?.match(emojiRegex) ?? [];
        expect(emojis.length).toBeLessThanOrEqual(2);
      });
    });
  });

  describe('Message Formatting', () => {
    it('preserves single newlines in messages', async () => {
      render(<ChatWindow {...defaultProps} />);

      const input = screen.getByPlaceholderText(/Message your AI Tutor/i);
      const sendButton = screen.getByLabelText('Send message');

      fireEvent.change(input, { target: { value: 'Line 1\nLine 2' } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        const message = screen.getByText(/Line 1.*Line 2/s);
        expect(message).toBeInTheDocument();
      });
    });

    it('displays message timestamps', async () => {
      const mockHistory: ChatMessage[] = [
        { role: 'user', content: 'Hello', timestamp: Date.now() },
      ];

      const { dataStore } = await import('../../../services/dataStore');
      vi.mocked(dataStore.getChatHistory).mockResolvedValue(mockHistory);

      render(<ChatWindow {...defaultProps} />);

      await waitFor(() => {
        const ts = mockHistory[0]?.timestamp ?? Date.now();
        const time = new Date(ts).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
        expect(screen.getByText(time)).toBeInTheDocument();
      });
    });
  });

  describe('Connection Status', () => {
    it('starts in "checking" state with amber pulsing dot', () => {
      // Make healthCheck never resolve so we stay in checking state
      vi.mocked(secureClient.healthCheck).mockImplementation(async () => new Promise(() => {}));

      render(<ChatWindow {...defaultProps} />);

      const statusEl = screen.getByRole('status');
      expect(statusEl).toHaveAttribute('aria-label', 'Checking AI connection');
    });

    it('shows green dot when healthCheck resolves true', async () => {
      vi.mocked(secureClient.healthCheck).mockResolvedValue(true);

      render(<ChatWindow {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'AI Tutor connected');
      });
    });

    it('shows red dot and offline banner when healthCheck resolves false', async () => {
      vi.mocked(secureClient.healthCheck).mockResolvedValue(false);

      render(<ChatWindow {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'AI Tutor offline');
      });
      // Offline banner should appear
      expect(screen.getByText(/AI Tutor is offline/i)).toBeInTheDocument();
    });

    it('shows offline banner when healthCheck throws', async () => {
      vi.mocked(secureClient.healthCheck).mockRejectedValue(new Error('Network error'));

      render(<ChatWindow {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'AI Tutor offline');
      });
    });

    it('shows offline banner when healthCheck times out (3s)', async () => {
      vi.useFakeTimers();
      vi.mocked(secureClient.healthCheck).mockImplementation(async () => new Promise(() => {})); // never resolves

      render(<ChatWindow {...defaultProps} />);

      // Advance past 3-second timeout — flushes the setTimeout in Promise.race
      await act(async () => {
        vi.advanceTimersByTime(3100);
      });

      // Restore real timers BEFORE waitFor (waitFor uses setTimeout internally)
      vi.useRealTimers();

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'AI Tutor offline');
      });
    });

    it('dismisses offline banner when close button is clicked', async () => {
      vi.mocked(secureClient.healthCheck).mockResolvedValue(false);

      render(<ChatWindow {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'AI Tutor offline');
      });

      // Banner should be visible
      expect(screen.getByText(/AI Tutor is offline/i)).toBeInTheDocument();

      // Click the dismiss button on the banner
      fireEvent.click(screen.getByRole('button', { name: /dismiss offline warning/i }));

      // Banner disappears; status dot still shows offline (connection unchanged)
      await waitFor(() => {
        expect(screen.queryByText(/AI Tutor is offline/i)).not.toBeInTheDocument();
      });
    });
  });
});
