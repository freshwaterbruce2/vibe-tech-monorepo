import React, { useEffect, useMemo, useState } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { Bot, RefreshCcw, Users } from 'lucide-react';
import {
  customBoardStyle,
  customDarkSquareStyle,
  customDropSquareStyle,
  customLightSquareStyle,
  piecesConfig,
} from '../lib/boardStyle';
import { chooseAiMove, getDifficultyLabel, type Difficulty } from '../lib/chessAi';
import { analyzeMove, getCoachHints, getPositionCoachMessage, type CoachFeedback } from '../lib/coach';
import { CoachPanel } from './CoachPanel';

type PlayModeType = 'ai' | 'local';
type PlayerColor = 'w' | 'b';

function getGameStatus(chess: Chess) {
  if (chess.isCheckmate()) return `Checkmate. ${chess.turn() === 'w' ? 'Black' : 'White'} wins.`;
  if (chess.isStalemate()) return 'Stalemate.';
  if (chess.isDraw()) return 'Draw.';
  if (chess.inCheck()) return `${chess.turn() === 'w' ? 'White' : 'Black'} is in check.`;
  return `${chess.turn() === 'w' ? 'White' : 'Black'} to move.`;
}

export function PlayMode({ pieceSet }: { pieceSet: string }) {
  const [mode, setMode] = useState<PlayModeType>('ai');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [humanColor, setHumanColor] = useState<PlayerColor>('w');
  const [fen, setFen] = useState(() => new Chess().fen());
  const [moveFrom, setMoveFrom] = useState<string | null>(null);
  const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});
  const [lastMove, setLastMove] = useState<string | null>(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [coachEnabled, setCoachEnabled] = useState(true);
  const [hintLevel, setHintLevel] = useState(0);
  const [coachFeedback, setCoachFeedback] = useState<CoachFeedback>(() => getPositionCoachMessage(new Chess().fen()));
  const [reviewItems, setReviewItems] = useState<CoachFeedback[]>([]);

  const customPieces = useMemo(() => piecesConfig(pieceSet), [pieceSet]);
  const game = useMemo(() => new Chess(fen), [fen]);

  const canHumanMove = mode === 'local' || game.turn() === humanColor;
  const boardOrientation = mode === 'ai' && humanColor === 'b' ? 'black' : 'white';

  useEffect(() => {
    if (mode !== 'ai' || game.isGameOver() || game.turn() === humanColor) return;

    setIsAiThinking(true);
    const timeoutId = window.setTimeout(() => {
      const aiGame = new Chess(fen);
      const aiMove = chooseAiMove(aiGame.fen(), difficulty);

      if (aiMove) {
        const beforeAiFen = aiGame.fen();
        const moveResult = aiGame.move(aiMove);
        setFen(aiGame.fen());
        setLastMove(`AI: ${moveResult.san}`);
        const feedback = analyzeMove(beforeAiFen, moveResult.san);
        setCoachFeedback(feedback);
        setReviewItems((items) => [...items.slice(-5), feedback]);
      }

      setIsAiThinking(false);
      setMoveFrom(null);
      setOptionSquares({});
    }, difficulty === 'hard' ? 550 : 300);

    return () => window.clearTimeout(timeoutId);
  }, [difficulty, fen, game, humanColor, mode]);

  function resetGame(nextMode = mode, nextHumanColor = humanColor) {
    const newGame = new Chess();
    setFen(newGame.fen());
    setMoveFrom(null);
    setOptionSquares({});
    setLastMove(null);
    setIsAiThinking(false);
    setHintLevel(0);
    setCoachFeedback(getPositionCoachMessage(newGame.fen()));
    setReviewItems([]);
    setMode(nextMode);
    setHumanColor(nextHumanColor);
  }

  function getMoveOptions(square: string) {
    if (!canHumanMove || isAiThinking) return false;

    const piece = game.get(square as never);
    if (!piece) {
      setOptionSquares({});
      return false;
    }

    if (mode === 'ai' && piece.color !== humanColor) {
      setOptionSquares({});
      return false;
    }

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
    if (!canHumanMove || isAiThinking) return false;

    try {
      const nextGame = new Chess(fen);
      const beforeFen = nextGame.fen();
      const moveResult = nextGame.move({ from, to, promotion: 'q' });

      if (!moveResult) return false;

      setFen(nextGame.fen());
      setLastMove(`${moveResult.color === 'w' ? 'White' : 'Black'}: ${moveResult.san}`);
      const feedback = analyzeMove(beforeFen, moveResult.san);
      setCoachFeedback(feedback);
      setReviewItems((items) => [...items.slice(-5), feedback]);
      setHintLevel(0);
      setMoveFrom(null);
      setOptionSquares({});
      return true;
    } catch {
      return false;
    }
  }

  function cycleHint() {
    setHintLevel((current) => (current >= 3 ? 0 : current + 1));
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

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-3 pb-40 pt-3 md:px-6 md:py-6 lg:min-h-screen lg:flex-row lg:items-center lg:gap-8 lg:pb-6">
      <div className="mx-auto flex w-full max-w-[min(100%,620px)] flex-col gap-3 lg:flex-1">
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-white/10 bg-white/5 p-2">
          <button
            onClick={() => resetGame('ai', humanColor)}
            className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-bold uppercase tracking-widest ${
              mode === 'ai' ? 'bg-indigo-500/25 text-indigo-200' : 'bg-white/5 text-slate-400'
            }`}
          >
            <Bot size={16} /> Vs AI
          </button>
          <button
            onClick={() => resetGame('local', 'w')}
            className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-xs font-bold uppercase tracking-widest ${
              mode === 'local' ? 'bg-indigo-500/25 text-indigo-200' : 'bg-white/5 text-slate-400'
            }`}
          >
            <Users size={16} /> 2 Player
          </button>
        </div>

        <div className="flex justify-center rounded-lg border border-white/10 bg-white/5 p-2 shadow-2xl sm:p-3 md:p-4">
          <div className="w-full max-w-[600px]" style={{ touchAction: 'none', width: 'min(100%, calc(100dvh - 13rem))' }}>
            <Chessboard
              key={`${pieceSet}-${boardOrientation}`}
              options={{
                position: fen,
                boardOrientation,
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

        <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 sm:px-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{isAiThinking ? 'AI is thinking...' : getGameStatus(game)}</p>
            {lastMove && <p className="truncate text-xs font-bold uppercase tracking-widest text-slate-500">{lastMove}</p>}
          </div>
          <button
            onClick={() => resetGame()}
            className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-widest text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <RefreshCcw size={16} /> Reset
          </button>
        </div>
      </div>

      <div className="flex w-full flex-col justify-center lg:flex-1">
        <div className="mb-4 inline-flex w-max rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-sky-200">
          {mode === 'ai' ? 'Game vs AI' : 'Local Multiplayer'}
        </div>
        <h2 className="mb-3 text-2xl font-bold tracking-tight text-white md:text-3xl">
          {mode === 'ai' ? 'Play the Training AI' : 'Play Across the Board'}
        </h2>
        <p className="mb-5 text-base font-medium leading-relaxed text-slate-300 md:text-lg">
          {mode === 'ai'
            ? 'Play a complete game against the built-in chess AI. The engine uses legal moves only and changes strength based on difficulty.'
            : 'Use the same board for two people on one device. White and Black alternate turns with normal legal-move enforcement.'}
        </p>

        {mode === 'ai' && (
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Difficulty</p>
              <div className="grid grid-cols-3 gap-2">
                {(['easy', 'medium', 'hard'] as Difficulty[]).map((level) => (
                  <button
                    key={level}
                    onClick={() => setDifficulty(level)}
                    className={`rounded-lg px-3 py-3 text-xs font-bold uppercase tracking-widest transition-colors ${
                      difficulty === level
                        ? 'bg-emerald-500/25 text-emerald-200'
                        : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {getDifficultyLabel(level)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Your Color</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => resetGame('ai', 'w')}
                  className={`rounded-lg px-3 py-3 text-xs font-bold uppercase tracking-widest ${
                    humanColor === 'w' ? 'bg-white text-slate-950' : 'bg-white/5 text-slate-400'
                  }`}
                >
                  White
                </button>
                <button
                  onClick={() => resetGame('ai', 'b')}
                  className={`rounded-lg px-3 py-3 text-xs font-bold uppercase tracking-widest ${
                    humanColor === 'b' ? 'bg-slate-900 text-white ring-1 ring-white/20' : 'bg-white/5 text-slate-400'
                  }`}
                >
                  Black
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-5">
          <CoachPanel
            enabled={coachEnabled}
            feedback={coachFeedback}
            hintLevel={hintLevel}
            hints={getCoachHints(fen)}
            onHint={cycleHint}
            onToggle={() => setCoachEnabled((enabled) => !enabled)}
          />
        </div>

        {reviewItems.length > 0 && (
          <div className="mt-5 rounded-lg border border-white/10 bg-white/5 p-4">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">Game Review</h3>
            <div className="space-y-2">
              {reviewItems.slice(-4).map((item, index) => (
                <div key={`${item.title}-${index}`} className="rounded-md bg-black/20 px-3 py-2">
                  <p className="text-sm font-bold text-white">{item.title}</p>
                  <p className="text-xs font-medium leading-relaxed text-slate-400">{item.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
