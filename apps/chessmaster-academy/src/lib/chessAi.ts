import { Chess, type Move } from 'chess.js';

export type Difficulty = 'easy' | 'medium' | 'hard';

const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0,
};

const CENTER_SQUARES = new Set(['d4', 'e4', 'd5', 'e5']);
const NEAR_CENTER_SQUARES = new Set(['c3', 'd3', 'e3', 'f3', 'c4', 'f4', 'c5', 'f5', 'c6', 'd6', 'e6', 'f6']);

const DIFFICULTY_DEPTH: Record<Difficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

const DIFFICULTY_NOISE: Record<Difficulty, number> = {
  easy: 170,
  medium: 55,
  hard: 8,
};

function materialScore(chess: Chess) {
  return chess.board().flat().reduce((score, piece) => {
    if (!piece) return score;

    const value = PIECE_VALUES[piece.type] ?? 0;
    return piece.color === 'w' ? score + value : score - value;
  }, 0);
}

function mobilityScore(chess: Chess) {
  const turn = chess.turn();
  const currentMobility = chess.moves().length;
  const fen = chess.fen();
  const parts = fen.split(' ');
  parts[1] = turn === 'w' ? 'b' : 'w';

  try {
    const opponent = new Chess(parts.join(' '));
    const opponentMobility = opponent.moves().length;
    return turn === 'w' ? currentMobility - opponentMobility : opponentMobility - currentMobility;
  } catch {
    return 0;
  }
}

function positionalScore(chess: Chess) {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  let score = 0;

  chess.board().forEach((rank, rankIndex) => {
    rank.forEach((piece, fileIndex) => {
      if (!piece) return;

      const square = `${files[fileIndex]}${8 - rankIndex}`;
      const centerBonus = CENTER_SQUARES.has(square)
        ? 18
        : NEAR_CENTER_SQUARES.has(square)
          ? 8
          : 0;

      score += piece.color === 'w' ? centerBonus : -centerBonus;
    });
  });

  return score;
}

function evaluate(chess: Chess) {
  if (chess.isCheckmate()) {
    return chess.turn() === 'w' ? -100000 : 100000;
  }

  if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition()) {
    return 0;
  }

  return materialScore(chess) + positionalScore(chess) + mobilityScore(chess) * 3;
}

function moveOrderingScore(move: Move) {
  let score = 0;

  if (move.captured) score += (PIECE_VALUES[move.captured] ?? 0) + 200;
  if (move.promotion) score += PIECE_VALUES[move.promotion] ?? 0;
  if (move.san.includes('#')) score += 100000;
  if (move.san.includes('+')) score += 500;
  if (CENTER_SQUARES.has(move.to)) score += 30;

  return score;
}

function minimax(chess: Chess, depth: number, alpha: number, beta: number): number {
  if (depth === 0 || chess.isGameOver()) return evaluate(chess);

  const moves = chess
    .moves({ verbose: true })
    .sort((a, b) => moveOrderingScore(b) - moveOrderingScore(a));

  if (chess.turn() === 'w') {
    let best = -Infinity;

    for (const move of moves) {
      chess.move(move);
      best = Math.max(best, minimax(chess, depth - 1, alpha, beta));
      chess.undo();
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }

    return best;
  }

  let best = Infinity;

  for (const move of moves) {
    chess.move(move);
    best = Math.min(best, minimax(chess, depth - 1, alpha, beta));
    chess.undo();
    beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }

  return best;
}

function deterministicNoise(seed: string, amount: number) {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return ((hash >>> 0) % (amount * 2 + 1)) - amount;
}

export function chooseAiMove(fen: string, difficulty: Difficulty): Move | null {
  const chess = new Chess(fen);
  const legalMoves = chess.moves({ verbose: true });

  if (legalMoves.length === 0) return null;

  const depth = DIFFICULTY_DEPTH[difficulty];
  const noise = DIFFICULTY_NOISE[difficulty];
  const isWhite = chess.turn() === 'w';

  const scoredMoves = legalMoves.map((move) => {
    chess.move(move);
    const score = minimax(chess, depth - 1, -Infinity, Infinity);
    chess.undo();

    return {
      move,
      score: score + deterministicNoise(`${fen}:${move.san}:${difficulty}`, noise),
    };
  });

  scoredMoves.sort((a, b) => (isWhite ? b.score - a.score : a.score - b.score));

  if (difficulty === 'easy' && scoredMoves.length > 2) {
    return scoredMoves[Math.min(2, scoredMoves.length - 1)].move;
  }

  return scoredMoves[0].move;
}

export function getDifficultyLabel(difficulty: Difficulty) {
  if (difficulty === 'easy') return 'Easy';
  if (difficulty === 'medium') return 'Medium';
  return 'Hard';
}
