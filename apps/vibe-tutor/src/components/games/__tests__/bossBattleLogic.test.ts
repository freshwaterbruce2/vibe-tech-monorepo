import { describe, expect, it } from 'vitest';
import { isAnswerCorrect, resolveBossTurn } from '../bossBattleLogic';

describe('isAnswerCorrect', () => {
  it('matches numeric option indices (multiple-choice / true-false)', () => {
    expect(isAnswerCorrect(0, 0)).toBe(true);
    expect(isAnswerCorrect(1, 0)).toBe(false);
  });

  it('matches fill-blank strings case-insensitively', () => {
    expect(isAnswerCorrect('Genesis', 'genesis')).toBe(true);
    expect(isAnswerCorrect('wrong', 'right')).toBe(false);
  });

  it('treats a true/false option index the same as multiple-choice', () => {
    // correctAnswer 0 = the first option ("True"/"Yes"); clicking index 0 wins.
    expect(isAnswerCorrect(0, 0)).toBe(true);
  });
});

describe('resolveBossTurn', () => {
  const base = {
    bossHp: 100,
    playerHp: 100,
    currentQIndex: 0,
    totalQuestions: 10,
    attackDamage: 20,
    bossDamage: 15,
  };

  it('damages the boss and advances on a correct answer', () => {
    const r = resolveBossTurn({ ...base, isCorrect: true });
    expect(r.bossHp).toBe(80);
    expect(r.playerHp).toBe(100);
    expect(r.outcome).toBe('playing');
    expect(r.nextQIndex).toBe(1);
    expect(r.damageDealt).toBe(20);
  });

  it('damages the player and advances on a wrong answer', () => {
    const r = resolveBossTurn({ ...base, isCorrect: false });
    expect(r.playerHp).toBe(85);
    expect(r.bossHp).toBe(100);
    expect(r.outcome).toBe('playing');
    expect(r.damageDealt).toBe(0);
  });

  it('declares victory when the boss is killed', () => {
    const r = resolveBossTurn({ ...base, bossHp: 20, isCorrect: true });
    expect(r.bossHp).toBe(0);
    expect(r.outcome).toBe('victory');
  });

  it('declares victory even on the FINAL question (no stale defeat overwrite)', () => {
    const r = resolveBossTurn({
      ...base,
      bossHp: 20,
      currentQIndex: 9,
      totalQuestions: 10,
      isCorrect: true,
    });
    expect(r.bossHp).toBe(0);
    expect(r.outcome).toBe('victory');
  });

  it('declares defeat when the player HP hits zero', () => {
    const r = resolveBossTurn({ ...base, playerHp: 10, isCorrect: false });
    expect(r.playerHp).toBe(0);
    expect(r.outcome).toBe('defeat');
  });

  it('declares defeat when questions run out without a kill', () => {
    const r = resolveBossTurn({
      ...base,
      bossHp: 50,
      currentQIndex: 9,
      totalQuestions: 10,
      isCorrect: true,
    });
    expect(r.bossHp).toBe(30);
    expect(r.outcome).toBe('defeat');
  });

  it('never lets HP go below zero', () => {
    const boss = resolveBossTurn({ ...base, bossHp: 5, isCorrect: true });
    expect(boss.bossHp).toBe(0);
    const player = resolveBossTurn({ ...base, playerHp: 5, isCorrect: false });
    expect(player.playerHp).toBe(0);
  });
});
