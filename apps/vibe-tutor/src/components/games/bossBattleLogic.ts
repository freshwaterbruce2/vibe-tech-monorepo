/**
 * Pure combat-resolution logic for the Boss Battle game.
 *
 * Extracted so the win/lose rules can be unit-tested deterministically (the
 * component itself shuffles questions and loads avatar state asynchronously).
 * This is where the two historical bugs lived:
 *  - true/false answers were compared by label instead of option index, and
 *  - a winning blow on the final question was overwritten by a defeat verdict
 *    because the question-advance branch read stale React state.
 */

export type BossOutcome = 'playing' | 'victory' | 'defeat';

export interface BossTurnInput {
  isCorrect: boolean;
  bossHp: number;
  playerHp: number;
  currentQIndex: number;
  totalQuestions: number;
  /** Damage dealt to the boss on a correct answer. */
  attackDamage: number;
  /** Damage dealt to the player on a wrong answer. */
  bossDamage: number;
}

export interface BossTurnResult {
  bossHp: number;
  playerHp: number;
  nextQIndex: number;
  outcome: BossOutcome;
  damageDealt: number;
}

/**
 * Compare a submitted answer against a question's correct answer. Works for
 * multiple-choice / true-false (numeric option index) and fill-blank (string),
 * case-insensitively.
 */
export function isAnswerCorrect(answer: string | number, correctAnswer: string | number): boolean {
  return String(answer).toLowerCase() === String(correctAnswer).toLowerCase();
}

/**
 * Resolve a single combat turn from freshly-computed HP values. The terminal
 * verdict (victory/defeat) is derived from the NEW hp — never from prior state —
 * so defeating the boss on the last question correctly yields a victory.
 */
export function resolveBossTurn(input: BossTurnInput): BossTurnResult {
  const { isCorrect, currentQIndex, totalQuestions, attackDamage, bossDamage } = input;
  let { bossHp, playerHp } = input;
  let damageDealt = 0;

  if (isCorrect) {
    damageDealt = attackDamage;
    bossHp = Math.max(0, bossHp - attackDamage);
  } else {
    playerHp = Math.max(0, playerHp - bossDamage);
  }

  if (bossHp <= 0) {
    return { bossHp, playerHp, nextQIndex: currentQIndex, outcome: 'victory', damageDealt };
  }
  if (playerHp <= 0) {
    return { bossHp, playerHp, nextQIndex: currentQIndex, outcome: 'defeat', damageDealt };
  }
  if (currentQIndex < totalQuestions - 1) {
    return { bossHp, playerHp, nextQIndex: currentQIndex + 1, outcome: 'playing', damageDealt };
  }
  // Ran out of questions without defeating the boss.
  return { bossHp, playerHp, nextQIndex: currentQIndex, outcome: 'defeat', damageDealt };
}
