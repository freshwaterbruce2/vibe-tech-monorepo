import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Chess } from 'chess.js';
import { LESSONS } from '../lib/lessons';
import { CheckCircle2, ChevronRight, RefreshCcw, Sparkles } from 'lucide-react';
import { chooseAiMove, getDifficultyLabel, type Difficulty } from '../lib/chessAi';
import { analyzeMove, getCoachHints, getPositionCoachMessage, type CoachFeedback } from '../lib/coach';
import { CoachPanel } from './CoachPanel';
import { ChessBoardSurface, type ChessBoardView } from './ChessBoardSurface';

export function LessonMode({ boardView = '2d', pieceSet }: { boardView?: ChessBoardView; pieceSet: string }) {
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);
  const [game, setGame] = useState(new Chess(LESSONS[0].initialFen));
  const [fen, setFen] = useState(LESSONS[0].initialFen);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [aiLastMove, setAiLastMove] = useState<string | null>(null);
  const [coachEnabled, setCoachEnabled] = useState(true);
  const [hintLevel, setHintLevel] = useState(0);
  const [coachFeedback, setCoachFeedback] = useState<CoachFeedback>(() =>
    getPositionCoachMessage(LESSONS[0].initialFen),
  );
  const [moveFrom, setMoveFrom] = useState<string | null>(null);
  const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});
  const pendingTimers = useRef<number[]>([]);

  const lesson = LESSONS[currentLessonIndex];
  
  const coachHints = useMemo(() => (coachEnabled ? getCoachHints(fen) : []), [coachEnabled, fen]);

  function clearPendingTimers() {
    pendingTimers.current.forEach((timerId) => window.clearTimeout(timerId));
    pendingTimers.current = [];
  }

  function schedule(callback: () => void, delay: number) {
    const timerId = window.setTimeout(() => {
      pendingTimers.current = pendingTimers.current.filter((id) => id !== timerId);
      callback();
    }, delay);
    pendingTimers.current.push(timerId);
  }

  useEffect(() => () => clearPendingTimers(), []);

  useEffect(() => {
    clearPendingTimers();
    const newGame = new Chess(lesson.initialFen);
    setGame(newGame);
    setFen(newGame.fen());
    setIsSuccess(false);
    setErrorMsg("");
    setIsAiThinking(false);
    setAiLastMove(null);
    setHintLevel(0);
    setCoachFeedback(getPositionCoachMessage(newGame.fen()));
    setMoveFrom(null);
    setOptionSquares({});
  }, [currentLessonIndex, lesson]);

  function getMoveOptions(square: string) {
    const moves = game.moves({ square: square as any, verbose: true });
    if (moves.length === 0) {
      setOptionSquares({});
      return false;
    }

    const newSquares: Record<string, React.CSSProperties> = {};
    moves.map((move: any) => {
      newSquares[move.to] = {
        background:
          game.get(move.to as any) && game.get(move.to as any)?.color !== game.get(square as any)?.color
            ? 'radial-gradient(transparent 0%, transparent 60%, rgba(0,0,0,0.4) 61%, rgba(0,0,0,0.4) 80%, transparent 81%)'
            : 'radial-gradient(circle, rgba(0,0,0,.4) 22%, transparent 23%)',
        borderRadius: '50%',
      };
      return move;
    });
    newSquares[square] = {
      background: 'rgba(255, 215, 0, 0.4)', // Highlight selected square
    };
    setOptionSquares(newSquares);
    return true;
  }

  function makeMove(move: { from: string; to: string; promotion?: string }) {
    if (isSuccess || isAiThinking) return false;
    
    try {
      const nextGame = new Chess(fen);
      const beforeFen = nextGame.fen();
      const moveResult = nextGame.move(move);
      
      if (moveResult === null) return false;

      setGame(nextGame);
      setFen(nextGame.fen());

      const targetMoves = lesson.targetMoves ?? (lesson.targetMove ? [lesson.targetMove] : []);

      if (targetMoves.length > 0) {
        if (targetMoves.includes(moveResult.san)) {
          setErrorMsg("");
          setHintLevel(0);
          setCoachFeedback(analyzeMove(beforeFen, moveResult.san));
          playAiTrainingReply(nextGame.fen());
        } else {
          const targetLabel = targetMoves.join(" or ");
          setErrorMsg(`Good try, but "${moveResult.san}" isn't the move we are looking for. Try ${targetLabel}.`);
          schedule(() => {
            const restoredGame = new Chess(beforeFen);
            setGame(restoredGame);
            setFen(restoredGame.fen());
            setErrorMsg("");
            setCoachFeedback(getPositionCoachMessage(restoredGame.fen()));
          }, 1500);
        }
      }
      return true;
    } catch (error) {
      return false;
    }
  }

  function playAiTrainingReply(replyFen: string) {
    const replyGame = new Chess(replyFen);

    if (replyGame.isGameOver()) {
      setIsSuccess(true);
      return;
    }

    setIsAiThinking(true);

    schedule(() => {
      const beforeAiFen = replyGame.fen();
      const aiMove = lesson.aiResponseMove ?? chooseAiMove(replyGame.fen(), difficulty);
      const responseMove = aiMove ? replyGame.move(aiMove) : null;

      if (responseMove) {
        setAiLastMove(responseMove.san);
        setGame(replyGame);
        setFen(replyGame.fen());
        setCoachFeedback(analyzeMove(beforeAiFen, responseMove.san));
      }

      setIsAiThinking(false);
      setIsSuccess(true);
    }, difficulty === 'hard' ? 450 : 300);
  }

  function onSquareClick(square: string) {
    if (isSuccess) return;

    if (!moveFrom) {
      const hasOptions = getMoveOptions(square);
      if (hasOptions) setMoveFrom(square);
      return;
    }

    const success = makeMove({
      from: moveFrom,
      to: square,
      promotion: 'q',
    });

    if (success) {
      setMoveFrom(null);
      setOptionSquares({});
    } else {
      const hasOptions = getMoveOptions(square);
      setMoveFrom(hasOptions ? square : null);
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

    setMoveFrom(null);
    setOptionSquares({});

    const move = makeMove({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q', // always promote to a queen for simplicity
    });
    return move;
  }

  function nextLesson() {
    if (currentLessonIndex < LESSONS.length - 1) {
      setCurrentLessonIndex(currentLessonIndex + 1);
    }
  }

  function retryLesson() {
    clearPendingTimers();
    const newGame = new Chess(lesson.initialFen);
    setGame(newGame);
    setFen(newGame.fen());
    setIsSuccess(false);
    setErrorMsg("");
    setIsAiThinking(false);
    setAiLastMove(null);
    setHintLevel(0);
    setCoachFeedback(getPositionCoachMessage(newGame.fen()));
    setMoveFrom(null);
    setOptionSquares({});
  }

  function cycleHint() {
    setHintLevel((current) => (current >= 3 ? 0 : current + 1));
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-3 pb-40 pt-3 animate-in fade-in slide-in-from-bottom-4 duration-500 md:px-6 md:py-6 lg:min-h-screen lg:flex-row lg:items-center lg:gap-8 lg:pb-6 xl:gap-12">
      <div className="mx-auto flex w-full max-w-[min(100%,620px)] flex-col gap-3 lg:flex-1 lg:gap-4">
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-white/10 bg-white/5 p-2 backdrop-blur-md">
          {(['easy', 'medium', 'hard'] as Difficulty[]).map((level) => (
            <button
              key={level}
              onClick={() => setDifficulty(level)}
              className={`rounded-md px-2 py-2 text-[11px] font-bold uppercase tracking-widest transition-colors ${
                difficulty === level
                  ? 'bg-emerald-500/25 text-emerald-200'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              {getDifficultyLabel(level)}
            </button>
          ))}
          <div className="flex items-center justify-between rounded-md bg-indigo-500/15 px-2 py-2 text-[11px] font-bold uppercase tracking-widest text-indigo-200">
            <span>Pieces</span>
            <span>{pieceSet}</span>
          </div>
        </div>
        <div className="flex justify-center rounded-lg border border-white/10 bg-white/5 p-2 shadow-2xl backdrop-blur-md sm:p-3 md:p-4">
          <ChessBoardSurface
            boardKey={pieceSet}
            boardView={boardView}
            fen={fen}
            optionSquares={optionSquares}
            pieceSet={pieceSet}
            selectedSquare={moveFrom}
            onPieceDrag={({ square }) => {
              if (!square) return;
              getMoveOptions(square);
              setMoveFrom(square);
            }}
            onPieceDrop={onDrop}
            onSquareClick={onSquareClick}
          />
        </div>
        
        <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 sm:px-4">
          <div className="flex items-center gap-4 w-full sm:w-auto overflow-hidden">
            <div className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg shadow-sm border ${
              game.turn() === 'w' 
                ? 'bg-[#f0d9b5] text-slate-900 border-[#b58863]/50' 
                : 'bg-[#1e293b] text-[#f0d9b5] border-[#b58863]/50'
            }`}>
               <span className="text-xs font-bold uppercase tracking-wider">
                 {isAiThinking ? 'AI Thinking' : game.turn() === 'w' ? "♙ White's Move" : "♟ Black's Move"}
               </span>
            </div>
          </div>
          <button 
             onClick={retryLesson}
             className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-widest text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
           >
             <RefreshCcw size={16} /> Reset
          </button>
        </div>

        {isSuccess && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-2 fade-in lg:hidden">
            <div className="mb-2 flex items-center gap-2 text-base font-bold text-emerald-300">
              <CheckCircle2 size={20} />
              Lesson Completed!
            </div>
            {aiLastMove && (
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-sm font-bold text-sky-200">
                <Sparkles size={16} />
                AI replied: {aiLastMove}
              </div>
            )}
            <p className="mb-4 text-sm font-medium leading-relaxed text-emerald-100/90">
              {lesson.successMessage}
            </p>
            {currentLessonIndex < LESSONS.length - 1 && (
              <button 
                onClick={nextLesson}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-600 py-3 font-bold tracking-wide text-white shadow-lg transition-colors hover:bg-emerald-500"
              >
                Next Lesson <ChevronRight size={18} />
              </button>
            )}
          </div>
        )}
      </div>
      
      <div className="flex w-full flex-col justify-center lg:flex-1">
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-2 text-slate-400 font-bold uppercase tracking-widest">
            <span>Lesson Progress</span>
            <span>{Math.round(((currentLessonIndex + 1) / LESSONS.length) * 100)}%</span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden border border-white/5">
            <div 
              className="h-full bg-indigo-500 transition-all duration-500 ease-out" 
              style={{ width: `${((currentLessonIndex + 1) / LESSONS.length) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="mb-3 inline-flex w-max items-center rounded-full border border-indigo-500/20 bg-indigo-500/20 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-indigo-300">
          Lesson {currentLessonIndex + 1} of {LESSONS.length}
        </div>
        <h2 className="mb-3 text-2xl font-bold tracking-tight text-white md:text-3xl">{lesson.title}</h2>
        <div className="prose prose-slate prose-invert mb-5 text-base font-medium leading-relaxed text-slate-300 md:text-lg">
          <p>{lesson.description}</p>
        </div>

        {errorMsg && (
          <div className="mb-5 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 font-medium text-amber-200 backdrop-blur-md animate-in slide-in-from-top-2">
            {errorMsg}
          </div>
        )}

        <div className="mb-5">
          <CoachPanel
            enabled={coachEnabled}
            feedback={coachFeedback}
            hintLevel={hintLevel}
            hints={coachHints}
            onHint={cycleHint}
            onToggle={() => setCoachEnabled((enabled) => !enabled)}
          />
        </div>

        {isSuccess && (
          <div className="hidden rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-5 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-2 fade-in lg:block">
            <div className="mb-3 flex items-center gap-3 text-lg font-bold text-emerald-400 md:text-xl">
              <CheckCircle2 size={24} />
              Lesson Completed!
            </div>
            {aiLastMove && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-sm font-bold text-sky-200">
                <Sparkles size={16} />
                AI replied: {aiLastMove}
              </div>
            )}
            <p className="mb-5 font-medium leading-relaxed text-emerald-200/80">
              {lesson.successMessage}
            </p>
            {currentLessonIndex < LESSONS.length - 1 && (
              <button 
                onClick={nextLesson}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-600 py-3 font-bold tracking-wide text-white shadow-lg transition-colors hover:bg-emerald-500"
              >
                Next Lesson <ChevronRight size={18} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
