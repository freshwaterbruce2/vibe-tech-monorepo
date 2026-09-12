import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { questionsRef } = vi.hoisted(() => ({
  questionsRef: {
    current: [
      {
        id: 'q1',
        type: 'multiple-choice',
        question: 'One?',
        options: ['Yes', 'No'],
        correctAnswer: 0,
      },
      {
        id: 'q2',
        type: 'multiple-choice',
        question: 'Two?',
        options: ['Yes', 'No'],
        correctAnswer: 1,
      },
    ],
  },
}));

vi.mock('../../../services/worksheetGenerator', () => ({
  generateWorksheet: () => questionsRef.current,
}));

import WorksheetView from '../WorksheetView';

const UUID_ONE = '11111111-1111-4111-8111-111111111111';
const UUID_TWO = '22222222-2222-4222-8222-222222222222';
const renderWorksheet = (onComplete = vi.fn().mockResolvedValue(true)) =>
  render(
    <WorksheetView
      subject="Math"
      difficulty="Beginner"
      onComplete={onComplete}
      onCancel={vi.fn()}
    />,
  );

const answerAndSubmit = (answer: 'Yes' | 'No') => {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(answer, 'i') }));
  fireEvent.click(screen.getByRole('button', { name: /submit answer/i }));
};

const finish = () => {
  answerAndSubmit('Yes');
  fireEvent.click(screen.getByRole('button', { name: /next question/i }));
  answerAndSubmit('No');
  fireEvent.click(screen.getByRole('button', { name: /finish quest/i }));
};

describe('WorksheetView completion identity', () => {
  beforeEach(() => vi.stubGlobal('crypto', { randomUUID: vi.fn(() => UUID_ONE) }));
  afterEach(() => {
    questionsRef.current = [
      {
        id: 'q1',
        type: 'multiple-choice',
        question: 'One?',
        options: ['Yes', 'No'],
        correctAnswer: 0,
      },
      {
        id: 'q2',
        type: 'multiple-choice',
        question: 'Two?',
        options: ['Yes', 'No'],
        correctAnswer: 1,
      },
    ];
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('publishes an exact lowercase v4 worksheet identity with the modern session fields', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(2_000);
    const onComplete = vi.fn().mockResolvedValue(true);
    renderWorksheet(onComplete);

    finish();

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    const session = onComplete.mock.calls[0]?.[0];
    expect(session).toMatchObject({
      id: `worksheet:${UUID_ONE}`,
      subject: 'Math',
      difficulty: 'Beginner',
      questions: [expect.objectContaining({ id: 'q1' }), expect.objectContaining({ id: 'q2' })],
      answers: [0, 1],
      score: 100,
      starsEarned: 5,
      completedAt: 2_000,
      timeSpent: 0,
    });
    expect(session.id).toMatch(
      /^worksheet:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('creates distinct UUID sessions across remounts even when the clock is identical', async () => {
    const randomUUID = vi.fn().mockReturnValueOnce(UUID_ONE).mockReturnValueOnce(UUID_TWO);
    vi.stubGlobal('crypto', { randomUUID });
    vi.spyOn(Date, 'now').mockReturnValue(7_000);
    const onComplete = vi.fn().mockResolvedValue(true);
    const first = renderWorksheet(onComplete);

    finish();
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    first.unmount();
    renderWorksheet(onComplete);
    finish();
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(2));

    const firstSession = onComplete.mock.calls[0]?.[0];
    const secondSession = onComplete.mock.calls[1]?.[0];
    expect(firstSession.id).toBe(`worksheet:${UUID_ONE}`);
    expect(secondSession.id).toBe(`worksheet:${UUID_TWO}`);
    expect(secondSession.id).not.toBe(firstSession.id);
    expect(firstSession.id).not.toContain('7000');
    expect(randomUUID).toHaveBeenCalledTimes(2);
  });

  it('prevents repeated Finish after primary persistence succeeds', async () => {
    const randomUUID = vi.fn(() => UUID_ONE);
    vi.stubGlobal('crypto', { randomUUID });
    vi.spyOn(Date, 'now').mockReturnValue(8_000);
    const onComplete = vi.fn().mockResolvedValue(true);
    renderWorksheet(onComplete);

    finish();
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /finish quest/i })).toBeDisabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: /finish quest/i }));

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0]?.[0]).toMatchObject({
      id: `worksheet:${UUID_ONE}`,
      completedAt: 8_000,
      timeSpent: 0,
      answers: [0, 1],
      score: 100,
      starsEarned: 5,
    });
    expect(randomUUID).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['missing', undefined],
    [
      'throwing',
      () => {
        throw new Error('unavailable');
      },
    ],
    ['invalid', () => 'not-a-v4-uuid'],
  ])(
    'does not publish a %s UUID and retries once after a valid UUID is restored',
    async (_kind, randomUUID) => {
      vi.stubGlobal('crypto', randomUUID === undefined ? undefined : { randomUUID });
      const onComplete = vi.fn().mockResolvedValue(true);
      renderWorksheet(onComplete);

      finish();

      expect(onComplete).not.toHaveBeenCalled();
      expect(screen.getByRole('alert')).toHaveTextContent(/identity is unavailable/i);
      vi.stubGlobal('crypto', { randomUUID: vi.fn(() => UUID_ONE) });
      fireEvent.click(screen.getByRole('button', { name: /retry finishing worksheet/i }));

      await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          id: `worksheet:${UUID_ONE}`,
          answers: [0, 1],
          score: 100,
          starsEarned: 5,
        }),
      );
      await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    },
  );

  it('preserves the existing navigation and answer flow before completion', () => {
    renderWorksheet();

    answerAndSubmit('Yes');
    fireEvent.click(screen.getByRole('button', { name: /next question/i }));
    expect(screen.getByRole('heading', { name: 'Two?' })).toBeInTheDocument();
    answerAndSubmit('No');
    fireEvent.click(screen.getByRole('button', { name: /previous/i }));
    expect(screen.getByRole('heading', { name: 'One?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit answer/i })).toBeInTheDocument();
  });

  it('normalizes a fill-blank answer for visible feedback and final score', async () => {
    questionsRef.current = [
      { id: 'fill', type: 'fill-blank', question: 'Type it', correctAnswer: 'ANSWER' },
    ];
    const onComplete = vi.fn().mockResolvedValue(true);
    renderWorksheet(onComplete);
    fireEvent.change(screen.getByPlaceholderText(/type your answer/i), {
      target: { value: '  ANSWER  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit answer/i }));
    expect(screen.getByText('Correct!')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /finish quest/i }));
    await waitFor(() =>
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({ score: 100, starsEarned: 5 }),
      ),
    );
  });

  it('retains the same session and UUID when a false primary save is retried successfully', async () => {
    const onComplete = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    renderWorksheet(onComplete);

    finish();

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/could not be saved/i));
    const firstSession = onComplete.mock.calls[0]?.[0];
    fireEvent.click(screen.getByRole('button', { name: /retry finishing worksheet/i }));
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(2));
    expect(onComplete.mock.calls[1]?.[0]).toBe(firstSession);
    expect(firstSession.id).toBe(`worksheet:${UUID_ONE}`);
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });

  it('shows a retry after a rejected primary save and deduplicates concurrent Finish clicks', async () => {
    let rejectSave: (error: Error) => void = () => undefined;
    const pending = new Promise<boolean>((_resolve, reject) => {
      rejectSave = reject;
    });
    const onComplete = vi.fn().mockReturnValueOnce(pending).mockResolvedValueOnce(true);
    renderWorksheet(onComplete);

    finish();
    fireEvent.click(screen.getByRole('button', { name: /finish quest/i }));
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    rejectSave(new Error('write failed'));

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/could not be saved/i));
    const firstSession = onComplete.mock.calls[0]?.[0];
    fireEvent.click(screen.getByRole('button', { name: /retry finishing worksheet/i }));
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(2));
    expect(onComplete.mock.calls[1]?.[0]).toBe(firstSession);
  });
});
