import { Chess, type Move } from 'chess.js';
import { chooseAiMove } from './chessAi';

export interface CoachHint {
  level: number;
  text: string;
}

export interface CoachFeedback {
  tone: 'good' | 'warning' | 'info';
  title: string;
  message: string;
  bestMove?: string;
}

const PIECE_NAMES: Record<string, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
};

const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 0,
};

function materialScore(chess: Chess) {
  return chess.board().flat().reduce((score, piece) => {
    if (!piece) return score;
    const value = PIECE_VALUES[piece.type] ?? 0;
    return piece.color === 'w' ? score + value : score - value;
  }, 0);
}

function scoreForColor(chess: Chess, color: 'w' | 'b') {
  const score = materialScore(chess);
  return color === 'w' ? score : -score;
}

function pieceName(move: Move) {
  if (move.piece === 'p') return 'pawn';
  return PIECE_NAMES[move.piece] ?? 'piece';
}

export function getCoachHints(fen: string): CoachHint[] {
  const chess = new Chess(fen);
  const bestMove = chooseAiMove(fen, 'hard');

  if (!bestMove) {
    return [{ level: 1, text: 'The game is over. Review how the position ended.' }];
  }

  const tacticalIdea = bestMove.san.includes('#')
    ? 'There is a checkmate available.'
    : bestMove.san.includes('+')
      ? 'Look for a forcing check.'
      : bestMove.captured
        ? `A ${PIECE_NAMES[bestMove.captured] ?? 'piece'} can be captured.`
        : chess.inCheck()
          ? 'First, get out of check.'
          : 'Improve your most active piece or fight for the center.';

  return [
    { level: 1, text: tacticalIdea },
    { level: 2, text: `Try moving the ${pieceName(bestMove)} from ${bestMove.from}.` },
    { level: 3, text: `Play ${bestMove.san}.` },
  ];
}

export function getPositionCoachMessage(fen: string): CoachFeedback {
  const chess = new Chess(fen);
  const bestMove = chooseAiMove(fen, 'hard');

  if (chess.isCheckmate()) {
    return {
      tone: 'info',
      title: 'Checkmate',
      message: `${chess.turn() === 'w' ? 'Black' : 'White'} finished the game.`,
    };
  }

  if (chess.isDraw()) {
    return {
      tone: 'info',
      title: 'Draw',
      message: 'The game is drawn. Start a new game or review the final position.',
    };
  }

  if (chess.inCheck()) {
    return {
      tone: 'warning',
      title: 'King in Check',
      message: 'Answer the check before thinking about anything else.',
      bestMove: bestMove?.san,
    };
  }

  return {
    tone: 'info',
    title: 'Coach',
    message: bestMove
      ? `A strong candidate is ${bestMove.san}. Look for checks, captures, and threats before moving.`
      : 'Look for checks, captures, and threats before moving.',
    bestMove: bestMove?.san,
  };
}

export function analyzeMove(beforeFen: string, moveSan: string): CoachFeedback {
  const before = new Chess(beforeFen);
  const mover = before.turn();
  const bestMove = chooseAiMove(beforeFen, 'hard');
  const beforeScore = scoreForColor(before, mover);
  const after = new Chess(beforeFen);
  const move = after.move(moveSan);

  if (!move) {
    return {
      tone: 'warning',
      title: 'Illegal Move',
      message: 'That move is not legal in this position.',
      bestMove: bestMove?.san,
    };
  }

  if (after.isCheckmate()) {
    return {
      tone: 'good',
      title: 'Checkmate',
      message: `${move.san} ends the game. That is the goal.`,
      bestMove: bestMove?.san,
    };
  }

  const afterScore = scoreForColor(after, mover);
  const swing = afterScore - beforeScore;

  if (bestMove && move.san === bestMove.san) {
    return {
      tone: 'good',
      title: 'Best Move',
      message: `${move.san} matches the coach move for this position.`,
      bestMove: bestMove.san,
    };
  }

  if (swing <= -300) {
    return {
      tone: 'warning',
      title: 'Material Risk',
      message: `${move.san} may drop material. A stronger candidate was ${bestMove?.san ?? 'available'}.`,
      bestMove: bestMove?.san,
    };
  }

  if (move.captured) {
    return {
      tone: 'good',
      title: 'Good Capture',
      message: `${move.san} wins a ${PIECE_NAMES[move.captured] ?? 'piece'}.`,
      bestMove: bestMove?.san,
    };
  }

  if (move.san.includes('+')) {
    return {
      tone: 'good',
      title: 'Forcing Move',
      message: `${move.san} gives check, so the opponent has to respond to the king threat.`,
      bestMove: bestMove?.san,
    };
  }

  return {
    tone: 'info',
    title: 'Legal Move',
    message: bestMove
      ? `${move.san} is playable. Compare it with ${bestMove.san} and ask what threat it creates.`
      : `${move.san} is playable. Keep looking for checks, captures, and threats.`,
    bestMove: bestMove?.san,
  };
}
