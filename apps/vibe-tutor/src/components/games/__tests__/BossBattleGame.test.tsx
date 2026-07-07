import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../services/dataStore', () => ({
  dataStore: { getAvatarState: vi.fn().mockResolvedValue(null) },
}));

// Deterministic question set: identical true/false questions whose correct
// answer is option index 0 ("True"). This is the case that was unwinnable
// before the fix (label was compared instead of the option index). The builder
// is defined INSIDE the factory because vi.mock is hoisted above the file body.
vi.mock('../../../services/questionBanks/math', () => {
  const q = (id: string) => ({
    id,
    subject: 'Math',
    difficulty: 'Beginner',
    question: 'Is 2 + 2 = 4?',
    correctAnswer: 0,
    options: ['True', 'False'],
    type: 'true-false',
  });
  return { MATH_QUESTIONS: { Beginner: Array.from({ length: 6 }, (_, i) => q(`m${i}`)) } };
});

import BossBattleGame from '../BossBattleGame';

describe('BossBattleGame', () => {
  it('lets the player win a true/false battle and shows victory', async () => {
    const onComplete = vi.fn();
    render(<BossBattleGame subject="Math" onComplete={onComplete} onBack={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: 'Engage in Battle!' }));

    // 20 damage per correct answer vs the 100 HP Math boss -> 5 correct = victory.
    for (let i = 0; i < 5; i++) {
      await waitFor(() => expect(screen.getByRole('button', { name: 'True' })).toBeInTheDocument());
      fireEvent.click(screen.getByRole('button', { name: 'True' }));
    }

    await waitFor(() => expect(screen.getByText('Boss Defeated!')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Claim Victory' }));
    // Winning awards 3 stars (was 0 before the stale-closure defeat overwrite).
    expect(onComplete).toHaveBeenCalledWith(expect.any(Number), 3, expect.any(Number));
  });

  it('renders the question options (not hardcoded True/False) for true/false', async () => {
    render(<BossBattleGame subject="Math" onComplete={() => {}} onBack={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Engage in Battle!' }));
    await waitFor(() => expect(screen.getByText('Is 2 + 2 = 4?')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'True' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'False' })).toBeInTheDocument();
  });
});
