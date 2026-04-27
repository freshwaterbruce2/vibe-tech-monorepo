import React, { useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { CheckCircle2, ChevronRight, RefreshCcw } from 'lucide-react';
import { PUZZLES } from '../lib/puzzles';
import { analyzeMove, getCoachHints, getPositionCoachMessage, type CoachFeedback } from '../lib/coach';
import { CoachPanel } from './CoachPanel';
import {
  customBoardStyle,
  customDarkSquareStyle,
  customDropSquareStyle,
  customLightSquareStyle,
  piecesConfig,
} from '../lib/boardStyle';

export function PuzzleMode({ pieceSet }: { pieceSet: string }) {
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const [fen, setFen] = useState(PUZZLES[0].initialFen);
  const [moveFrom, setMoveFrom] = useState<string | null>(null);
  const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});
  const [isSolved, setIsSolved] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [coachEnabled, setCoachEnabled] = useState(true);
  const [hintLevel, setHintLevel] = useState(0);
  const [coachFeedback, setCoachFeedback] = useState<CoachFeedback>(() =>
    getPositionCoachMessage(PUZZLES[0].initialFen),
  );

  const puzzle = PUZZLES[currentPuzzleIndex];
  const game = useMemo(() => new Chess(fen), [fen]);
  const customPieces = useMemo(() => piecesConfig(pieceSet), [pieceSet]);

  useEffect(() => {
    const newGame = new Chess(puzzle.initialFen);
    setFen(newGame.fen());
    setMoveFrom(null);
    setOptionSquares({});
    setIsSolved(false);
    setErrorMsg('');
    setHintLevel(0);
    setCoachFeedback(getPositionCoachMessage(newGame.fen()));
  }, [puzzle]);

  function resetPuzzle() {
    const newGame = new Chess(puzzle.initialFen);
    setFen(newGame.fen());
    setMoveFrom(null);
    setOptionSquares({});
    setIsSolved(false);
    setErrorMsg('');
    setHintLevel(0);
    setCoachFeedback(getPositionCoachMessage(newGame.fen()));
  }

  function getMoveOptions(square: string) {
    const moves = game.moves({ square: square as never, verbose: true });
    if (moves.length === 0) {
      setOptionSquares({});
      return false;
    }

    const nextSquares: Record<string, React.CSSProperties> = {};
    moves.forEach((move) => {
      nextSquares[move.to] = {
        background: game.get(move.to as never)
          ? 'radial-gradient(transparent 0%, transparent 60%, rgba(0,0,0,0.4) 61%, rgba(0,0,0,0.4) 80%, transparent 81%)'
          : 'radial-gradient(circle, rgba(0,0,0,.4) 22%, transparent 23%)',
        borderRadius: '50%',
      };
    });
    nextSquares[square] = { background: 'rgba(255, 215, 0, 0.4)' };
    setOptionSquares(nextSquares);
    return true;
  }

  function makeMove(from: string, to: string) {
    if (isSolved) return false;

    const nextGame = new Chess(fen);
    const beforeFen = nextGame.fen();

    try {
      const moveResult = nextGame.move({ from, to, promotion: 'q' });

      if (!moveResult) return false;

      setFen(nextGame.fen());
      setCoachFeedback(analyzeMove(beforeFen, moveResult.san));
      setMoveFrom(null);
      setOptionSquares({});
      setHintLevel(0);

      if (moveResult.san === puzzle.targetMove) {
        setIsSolved(true);
        setErrorMsg('');
      } else {
        setErrorMsg(`That was legal, but the puzzle answer is stronger. Try again.`);
        window.setTimeout(resetPuzzle, 1100);
      }

      return true;
    } catch {
      return false;
    }
  }

  function onSquareClick(square: string) {
    if (!moveFrom) {
      if (getMoveOptions(square)) setMoveFrom(square);
      return;
    }

    if (!makeMove(moveFrom, square)) {
      setMoveFrom(getMoveOptions(square) ? square : null);
    }
  }

  function onDrop({
    sourceSquare,
    targetSquare,
  }: {
    sourceSquare: string;
    targetSquare: string | null;
  }) {
    if (!targetSquare) return false;
    return makeMove(sourceSquare, targetSquare);
  }

  function nextPuzzle() {
    if (currentPuzzleIndex < PUZZLES.length - 1) {
      setCurrentPuzzleIndex((index) => index + 1);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-3 pb-40 pt-3 md:px-6 md:py-6 lg:min-h-screen lg:flex-row lg:items-center lg:gap-8 lg:pb-6">
      <div className="mx-auto flex w-full max-w-[min(100%,620px)] flex-col gap-3 lg:flex-1">
        <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-3">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{puzzle.theme}</span>
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-300">
            {currentPuzzleIndex + 1} / {PUZZLES.length}
          </span>
        </div>

        <div className="flex justify-center rounded-lg border border-white/10 bg-white/5 p-2 shadow-2xl sm:p-3 md:p-4">
          <div className="w-full max-w-[600px]" style={{ touchAction: 'none', width: 'min(100%, calc(100dvh - 13rem))' }}>
            <Chessboard
              key={`${pieceSet}-${puzzle.id}`}
              options={{
                position: fen,
                allowDragging: true,
                onPieceDrop: onDrop,
                onSquareClick: ({ square }) => onSquareClick(square),
                onPieceClick: ({ square }) => {
                  if (square) onSquareClick(square);
                },
                squareStyles: optionSquares,
                boardStyle: customBoardStyle,
                darkSquareStyle: customDarkSquareStyle,
                lightSquareStyle: customLightSquareStyle,
                dropSquareStyle: customDropSquareStyle,
                pieces: customPieces,
              }}
            />
          </div>
        </div>

        <button
          onClick={resetPuzzle}
          className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-xs font-bold uppercase tracking-widest text-slate-300"
        >
          <RefreshCcw size={16} /> Reset Puzzle
        </button>
      </div>

      <div className="flex w-full flex-col justify-center lg:flex-1">
        <div className="mb-4 inline-flex w-max rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-200">
          Puzzle Trainer
        </div>
        <h2 className="mb-3 text-2xl font-bold tracking-tight text-white md:text-3xl">{puzzle.title}</h2>
        <p className="mb-5 text-base font-medium leading-relaxed text-slate-300 md:text-lg">{puzzle.prompt}</p>

        {errorMsg && (
          <div className="mb-5 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm font-bold text-amber-100">
            {errorMsg}
          </div>
        )}

        <div className="mb-5">
          <CoachPanel
            enabled={coachEnabled}
            feedback={coachFeedback}
            hintLevel={hintLevel}
            hints={getCoachHints(fen)}
            onHint={() => setHintLevel((level) => (level >= 3 ? 0 : level + 1))}
            onToggle={() => setCoachEnabled((enabled) => !enabled)}
          />
        </div>

        {isSolved && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-5">
            <div className="mb-3 flex items-center gap-2 text-lg font-bold text-emerald-300">
              <CheckCircle2 size={22} /> Solved
            </div>
            <p className="mb-4 text-sm font-medium leading-relaxed text-emerald-100">{puzzle.successMessage}</p>
            {currentPuzzleIndex < PUZZLES.length - 1 && (
              <button
                onClick={nextPuzzle}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 font-bold text-white"
              >
                Next Puzzle <ChevronRight size={18} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
