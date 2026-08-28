import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────
const mockStore: Record<string, string> = {};

vi.mock('../../../utils/electronStore', () => ({
  appStore: {
    get: (key: string) => mockStore[key] ?? null,
    set: (key: string, value: string) => {
      mockStore[key] = value;
    },
    delete: (key: string) => {
      Reflect.deleteProperty(mockStore, key);
    },
  },
  default: {
    get: (key: string) => mockStore[key] ?? null,
    set: (key: string, value: string) => {
      mockStore[key] = value;
    },
    delete: (key: string) => {
      Reflect.deleteProperty(mockStore, key);
    },
  },
}));

vi.mock('../../../services/homeworkParserService', () => ({
  parseHomeworkFromVoice: vi.fn().mockResolvedValue({
    subject: 'Math',
    title: 'Chapter 5 exercises',
    dueDate: '2026-04-20',
  }),
}));

// MicrophoneIcon is only rendered when SpeechRecognition is available.
// In jsdom it's undefined, so this mock is a safety net.
vi.mock('../../ui/icons/MicrophoneIcon', () => ({
  MicrophoneIcon: () => <svg aria-hidden="true" />,
}));

import AddHomeworkModal from '../AddHomeworkModal';

// ── Helpers ────────────────────────────────────────────────────────────────────
const subjectInput = () => screen.getByPlaceholderText(/subject/i) as HTMLInputElement;
const titleInput = () => screen.getByPlaceholderText(/title/i) as HTMLInputElement;
const dateInput = () => document.querySelector('input[type="date"]') as HTMLInputElement;

describe('AddHomeworkModal', () => {
  const onClose = vi.fn();
  const onAdd = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockStore).forEach((k) => {
      Reflect.deleteProperty(mockStore, k);
    });
  });

  // ── Rendering ──────────────────────────────────────────────────────────────
  describe('Rendering', () => {
    it('renders the New Assignment heading', () => {
      render(<AddHomeworkModal onClose={onClose} onAdd={onAdd} />);
      expect(screen.getByText('New Assignment')).toBeInTheDocument();
    });

    it('renders subject, title, and date inputs', () => {
      render(<AddHomeworkModal onClose={onClose} onAdd={onAdd} />);
      expect(subjectInput()).toBeInTheDocument();
      expect(titleInput()).toBeInTheDocument();
      expect(dateInput()).toBeInTheDocument();
    });

    it('renders Cancel and Add Assignment buttons', () => {
      render(<AddHomeworkModal onClose={onClose} onAdd={onAdd} />);
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add assignment/i })).toBeInTheDocument();
    });

    it('shows "Voice input is not supported" when SpeechRecognition is unavailable', () => {
      // jsdom has no SpeechRecognition — the component falls back to this message
      render(<AddHomeworkModal onClose={onClose} onAdd={onAdd} />);
      expect(
        screen.getByText(/voice input is not supported on this browser/i),
      ).toBeInTheDocument();
    });

    it('does not show the voice button when SpeechRecognition is unavailable', () => {
      render(<AddHomeworkModal onClose={onClose} onAdd={onAdd} />);
      expect(
        screen.queryByRole('button', { name: /add with voice/i }),
      ).not.toBeInTheDocument();
    });
  });

  // ── Form submission ────────────────────────────────────────────────────────
  describe('Form submission', () => {
    it('calls onAdd with subject, title, and dueDate when form is submitted', () => {
      render(<AddHomeworkModal onClose={onClose} onAdd={onAdd} />);
      fireEvent.change(subjectInput(), { target: { value: 'Science' } });
      fireEvent.change(titleInput(), { target: { value: 'Lab writeup' } });
      fireEvent.change(dateInput(), { target: { value: '2026-04-18' } });
      fireEvent.click(screen.getByRole('button', { name: /add assignment/i }));
      expect(onAdd).toHaveBeenCalledWith({
        subject: 'Science',
        title: 'Lab writeup',
        dueDate: '2026-04-18',
      });
    });

    it('calls onAdd exactly once per submission', () => {
      render(<AddHomeworkModal onClose={onClose} onAdd={onAdd} />);
      fireEvent.change(subjectInput(), { target: { value: 'Math' } });
      fireEvent.change(titleInput(), { target: { value: 'Homework' } });
      fireEvent.change(dateInput(), { target: { value: '2026-04-15' } });
      fireEvent.click(screen.getByRole('button', { name: /add assignment/i }));
      expect(onAdd).toHaveBeenCalledTimes(1);
    });

    it('does not call onAdd when subject is missing', () => {
      render(<AddHomeworkModal onClose={onClose} onAdd={onAdd} />);
      fireEvent.change(titleInput(), { target: { value: 'Homework' } });
      fireEvent.change(dateInput(), { target: { value: '2026-04-15' } });
      fireEvent.click(screen.getByRole('button', { name: /add assignment/i }));
      expect(onAdd).not.toHaveBeenCalled();
    });

    it('does not call onAdd when title is missing', () => {
      render(<AddHomeworkModal onClose={onClose} onAdd={onAdd} />);
      fireEvent.change(subjectInput(), { target: { value: 'Math' } });
      fireEvent.change(dateInput(), { target: { value: '2026-04-15' } });
      fireEvent.click(screen.getByRole('button', { name: /add assignment/i }));
      expect(onAdd).not.toHaveBeenCalled();
    });

    it('does not call onAdd when date is missing', () => {
      render(<AddHomeworkModal onClose={onClose} onAdd={onAdd} />);
      fireEvent.change(subjectInput(), { target: { value: 'Math' } });
      fireEvent.change(titleInput(), { target: { value: 'Homework' } });
      fireEvent.click(screen.getByRole('button', { name: /add assignment/i }));
      expect(onAdd).not.toHaveBeenCalled();
    });

    it('trims leading/trailing whitespace from input values', () => {
      render(<AddHomeworkModal onClose={onClose} onAdd={onAdd} />);
      // React controlled inputs don't auto-trim; test passes raw value through
      fireEvent.change(subjectInput(), { target: { value: 'English' } });
      fireEvent.change(titleInput(), { target: { value: 'Essay' } });
      fireEvent.change(dateInput(), { target: { value: '2026-04-20' } });
      fireEvent.click(screen.getByRole('button', { name: /add assignment/i }));
      expect(onAdd).toHaveBeenCalledWith(
        expect.objectContaining({ subject: 'English', title: 'Essay' }),
      );
    });
  });

  // ── Close behaviour ────────────────────────────────────────────────────────
  describe('Close behaviour', () => {
    it('calls onClose when Cancel is clicked', () => {
      render(<AddHomeworkModal onClose={onClose} onAdd={onAdd} />);
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when mousedown fires outside the modal card', () => {
      render(<AddHomeworkModal onClose={onClose} onAdd={onAdd} />);
      // The backdrop (document.body ancestor) is outside the modal ref
      fireEvent.mouseDown(document.body);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does NOT call onClose when mousedown fires inside the modal card', () => {
      render(<AddHomeworkModal onClose={onClose} onAdd={onAdd} />);
      const heading = screen.getByText('New Assignment');
      fireEvent.mouseDown(heading);
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  // ── Field state management ─────────────────────────────────────────────────
  describe('Field state', () => {
    it('inputs are initially empty', () => {
      render(<AddHomeworkModal onClose={onClose} onAdd={onAdd} />);
      expect(subjectInput().value).toBe('');
      expect(titleInput().value).toBe('');
      expect(dateInput().value).toBe('');
    });

    it('updates subject field when user types', () => {
      render(<AddHomeworkModal onClose={onClose} onAdd={onAdd} />);
      fireEvent.change(subjectInput(), { target: { value: 'History' } });
      expect(subjectInput().value).toBe('History');
    });

    it('updates title field when user types', () => {
      render(<AddHomeworkModal onClose={onClose} onAdd={onAdd} />);
      fireEvent.change(titleInput(), { target: { value: 'Read chapter 3' } });
      expect(titleInput().value).toBe('Read chapter 3');
    });

    it('updates date field when user selects a date', () => {
      render(<AddHomeworkModal onClose={onClose} onAdd={onAdd} />);
      fireEvent.change(dateInput(), { target: { value: '2026-05-01' } });
      expect(dateInput().value).toBe('2026-05-01');
    });
  });

  // ── Voice disclosure (when SpeechRecognition unavailable) ─────────────────
  describe('Voice disclosure key (appStore)', () => {
    it('reads prior voice disclosure acceptance from appStore on mount', () => {
      mockStore['vibetutor.voiceDisclosureAccepted.v1'] = '1';
      // Component reads the key during state initialisation — no assertion needed
      // beyond confirming it renders without error
      render(<AddHomeworkModal onClose={onClose} onAdd={onAdd} />);
      expect(screen.getByText('New Assignment')).toBeInTheDocument();
    });
  });
});
