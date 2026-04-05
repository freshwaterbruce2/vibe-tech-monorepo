import confetti from 'canvas-confetti';
import { ArrowLeft, Clock, Lightbulb, RotateCcw, TriangleAlert } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import * as SudokuModule from 'sudoku-umd';
import { useGameAudio } from '../../hooks/useGameAudio';
import GameCompletionModal from './GameCompletionModal';

interface SudokuModuleType {
  generate?: () => string;
  solve?: (puzzle: string) => string | false | null;
  makepuzzle?: () => (number | null)[];
  solvepuzzle?: (puzzle: (number | null)[]) => (number | null)[] | null;
  default?: {
    generate?: () => string;
    solve?: (puzzle: string) => string | false | null;
    makepuzzle?: () => (number | null)[];
    solvepuzzle?: (puzzle: (number | null)[]) => (number | null)[] | null;
  };
}

interface SudokuGameProps {
  onComplete: (score: number, stars: number, timeSpent: number) => void;
  onBack: () => void;
}

interface SudokuState {
  puzzle: (number | null)[];
  solution: (number | null)[];
  userGrid: (number | null)[];
  isLoading: boolean;
}

interface SudokuFinalResult {
  score: number;
  stars: number;
  time: number;
  filled: number;
  mistakes: number;
  hintPenalty: number;
}

function parseBoardString(board: string): (number | null)[] | null {
  if (board.length !== 81) return null;
  const parsed: (number | null)[] = [];
  for (const cell of board) {
    if (cell === '.' || cell === '0') {
      parsed.push(null);
      continue;
    }
    const value = Number(cell);
    if (!Number.isInteger(value) || value < 1 || value > 9) {
      return null;
    }
    parsed.push(value);
  }
  return parsed;
}

function normalizeLegacyGrid(grid: (number | null)[]): (number | null)[] | null {
  if (grid.length !== 81) return null;
  return grid.map((cell) => {
    if (cell === null) return null;
    if (cell >= 1 && cell <= 9) return cell;
    if (cell >= 0 && cell <= 8) return cell + 1;
    return null;
  });
}

function createEmptySudokuState(): SudokuState {
  return { puzzle: [], solution: [], userGrid: [], isLoading: false };
}

function createInitialSudokuState(): SudokuState {
  try {
    const typedModule = SudokuModule as unknown as SudokuModuleType;
    const generate = typedModule.generate ?? typedModule.default?.generate;
    const solve = typedModule.solve ?? typedModule.default?.solve;
    const makepuzzle = typedModule.makepuzzle ?? typedModule.default?.makepuzzle;
    const solvepuzzle = typedModule.solvepuzzle ?? typedModule.default?.solvepuzzle;

    if (generate && solve) {
      for (let attempt = 0; attempt < 3; attempt++) {
        const puzzleString = generate();
        const solutionString = solve(puzzleString);
        if (!solutionString || typeof solutionString !== 'string') continue;

        const puzzle = parseBoardString(puzzleString);
        const solution = parseBoardString(solutionString);
        if (puzzle && solution?.every((cell) => cell !== null)) {
          return { puzzle, solution, userGrid: [...puzzle], isLoading: false };
        }
      }
    }

    if (!makepuzzle || !solvepuzzle) {
      console.error('Sudoku functions not available');
      return createEmptySudokuState();
    }

    const legacyPuzzle = makepuzzle();
    const legacySolution = solvepuzzle(legacyPuzzle);
    if (!legacySolution) {
      return createEmptySudokuState();
    }

    const puzzle = normalizeLegacyGrid(legacyPuzzle);
    const solution = normalizeLegacyGrid(legacySolution);
    if (!puzzle || !solution || solution.some((cell) => cell === null)) {
      return createEmptySudokuState();
    }

    return { puzzle, solution, userGrid: [...puzzle], isLoading: false };
  } catch (error) {
    console.error('Failed to generate Sudoku:', error);
    return createEmptySudokuState();
  }
}

const SudokuGame = memo(function SudokuGame({ onComplete, onBack }: SudokuGameProps) {
  const { playSound } = useGameAudio();
  const [sudokuState, setSudokuState] = useState<SudokuState>(() => createInitialSudokuState());
  const [startTime, setStartTime] = useState(() => Date.now());
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const { puzzle, solution, isLoading } = sudokuState;
  const [userGrid, setUserGrid] = useState<(number | null)[]>(() => sudokuState.userGrid);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [mistakeCells, setMistakeCells] = useState<Set<number>>(new Set());
  const [showComplete, setShowComplete] = useState(false);
  const [finalResult, setFinalResult] = useState<SudokuFinalResult | null>(null);

  useEffect(() => {
    if (showComplete) return;
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [showComplete]);

  const editableCellCount = useMemo(
    () => puzzle.filter((cell) => cell === null).length,
    [puzzle],
  );

  const startNewGame = useCallback(() => {
    const nextState = createInitialSudokuState();
    setSudokuState(nextState);
    setUserGrid(nextState.userGrid);
    setSelectedCell(null);
    setMistakes(0);
    setHintsUsed(0);
    setMistakeCells(new Set());
    setShowComplete(false);
    setFinalResult(null);
    setStartTime(Date.now());
    setCurrentTime(Date.now());
  }, []);

  const checkComplete = useCallback(
    (grid: (number | null)[]) => {
      return grid.every((cell, i) => cell !== null && cell === solution[i]);
    },
    [solution],
  );

  const finishGame = useCallback(
    (grid: (number | null)[], nextMistakes: number, nextHintsUsed: number) => {
      if (!checkComplete(grid) || showComplete) return;

      playSound('victory');
      void confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      const score = Math.max(
        35,
        100 - Math.floor(timeSpent / 30) - nextMistakes * 5 - nextHintsUsed * 8,
      );
      const stars = score >= 92 ? 5 : score >= 80 ? 4 : score >= 65 ? 3 : score >= 50 ? 2 : 1;
      setShowComplete(true);
      setFinalResult({
        score,
        stars,
        time: timeSpent,
        filled: editableCellCount,
        mistakes: nextMistakes,
        hintPenalty: nextHintsUsed * 8,
      });
    },
    [checkComplete, editableCellCount, playSound, showComplete, startTime],
  );

  const handleCellClick = useCallback(
    (index: number) => {
      if (showComplete) return;
      if (puzzle[index] !== null) return; // Can't edit given numbers
      playSound('pop');
      setSelectedCell(index);
    },
    [showComplete, puzzle, playSound],
  );

  const handleNumberInput = useCallback(
    (num: number) => {
      if (showComplete) return;
      if (selectedCell === null || puzzle[selectedCell] !== null) return;
      const newGrid = [...userGrid];
      newGrid[selectedCell] = num;
      const isCorrect = solution[selectedCell] === num;
      const nextMistakes = isCorrect ? mistakes : mistakes + 1;

      if (isCorrect) {
        playSound('pop');
      } else {
        playSound('error');
        setMistakes(nextMistakes);
      }

      setMistakeCells((prev) => {
        const next = new Set(prev);
        if (isCorrect) next.delete(selectedCell);
        else next.add(selectedCell);
        return next;
      });
      setUserGrid(newGrid);
      finishGame(newGrid, nextMistakes, hintsUsed);
    },
    [showComplete, selectedCell, puzzle, userGrid, solution, mistakes, playSound, finishGame, hintsUsed],
  );

  const handleClear = useCallback(() => {
    if (showComplete) return;
    if (selectedCell === null || puzzle[selectedCell] !== null) return;
    playSound('pop');
    const newGrid = [...userGrid];
    newGrid[selectedCell] = null;
    setUserGrid(newGrid);
    setMistakeCells((prev) => {
      const next = new Set(prev);
      next.delete(selectedCell);
      return next;
    });
  }, [showComplete, selectedCell, puzzle, playSound, userGrid]);

  const handleHint = useCallback(() => {
    if (showComplete) return;
    if (selectedCell === null || puzzle[selectedCell] !== null || solution[selectedCell] === null) return;
    playSound('success');
    const newGrid = [...userGrid];
    newGrid[selectedCell] = solution[selectedCell] ?? null;
    const nextHints = hintsUsed + 1;
    setHintsUsed(nextHints);
    setUserGrid(newGrid);
    setMistakeCells((prev) => {
      const next = new Set(prev);
      next.delete(selectedCell);
      return next;
    });
    finishGame(newGrid, mistakes, nextHints);
  }, [showComplete, selectedCell, puzzle, solution, playSound, userGrid, hintsUsed, finishGame, mistakes]);

  const handleReset = useCallback(() => {
    if (showComplete) return;
    playSound('pop');
    setUserGrid([...puzzle]);
    setSelectedCell(null);
    setMistakes(0);
    setHintsUsed(0);
    setMistakeCells(new Set());
  }, [showComplete, playSound, puzzle]);

  const handleContinue = useCallback(() => {
    if (!finalResult) return;
    onComplete(finalResult.score, finalResult.stars, finalResult.time);
  }, [finalResult, onComplete]);

  if (isLoading || puzzle.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 p-6 flex items-center justify-center">
        <div className="text-white text-xl">Generating Sudoku puzzle...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-pink-900 p-6 pb-36 md:pb-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="glass-card p-4 mb-6 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
            Back
          </button>

          <div className="flex items-center gap-4">
            <div className="text-white/80 text-sm">
              {userGrid.filter((c, i) => c !== null && puzzle[i] === null).length}/
              {editableCellCount} filled
            </div>
            <div className="flex items-center gap-2 text-sm text-red-300">
              <TriangleAlert size={18} />
              <span>{mistakes} mistakes</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-yellow-300">
              <Lightbulb size={18} />
              <span>{hintsUsed} hints</span>
            </div>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors"
            >
              <RotateCcw size={20} />
              Reset
            </button>
            <div className="flex items-center gap-2">
              <Clock size={20} className="text-cyan-400" />
              <span className="text-white font-medium">
                {Math.floor((currentTime - startTime) / 1000)}s
              </span>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <h2 className="text-3xl font-bold text-center mb-6 neon-text-primary">Sudoku</h2>
          <div className="mb-6 grid gap-3 text-center text-sm text-white/80 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.14em] text-cyan-300">Grid Progress</div>
              <div className="mt-1 text-xl font-bold text-white">
                {userGrid.filter((c, i) => c !== null && puzzle[i] === null).length}/{editableCellCount}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.14em] text-cyan-300">Mistake Pressure</div>
              <div className="mt-1 text-xl font-bold text-white">{mistakes}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.14em] text-cyan-300">Hint Penalty</div>
              <div className="mt-1 text-xl font-bold text-white">-{hintsUsed * 8}</div>
            </div>
          </div>

          {/* Sudoku Grid */}
          <div className="inline-block mx-auto bg-white p-2 rounded-lg">
            <div className="grid grid-cols-9 gap-0">
              {userGrid.map((cell, index) => {
                const row = Math.floor(index / 9);
                const col = index % 9;
                const isGiven = puzzle[index] !== null;
                const selectedRow = selectedCell !== null ? Math.floor(selectedCell / 9) : -1;
                const selectedCol = selectedCell !== null ? selectedCell % 9 : -1;
                const isHighlighted = row === selectedRow || col === selectedCol;
                const isSelected = selectedCell === index;
                const isMistake = !isGiven && mistakeCells.has(index);
                const showThickBorder = {
                  right: col === 2 || col === 5,
                  bottom: row === 2 || row === 5,
                  left: col === 3 || col === 6,
                  top: row === 3 || row === 6,
                };

                return (
                  <div
                    key={index}
                    onClick={() => handleCellClick(index)}
                    className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center border border-gray-400 cursor-pointer transition-colors ${
                      showThickBorder.right ? 'border-r-2 border-r-black' : ''
                    } ${showThickBorder.bottom ? 'border-b-2 border-b-black' : ''} ${
                      showThickBorder.left ? 'border-l-2 border-l-black' : ''
                    } ${showThickBorder.top ? 'border-t-2 border-t-black' : ''} ${
                      isGiven
                        ? 'bg-gray-200 font-bold'
                        : isMistake
                          ? 'bg-red-100'
                        : isHighlighted
                          ? 'bg-blue-50'
                          : 'bg-white hover:bg-blue-50'
                    } ${isSelected ? 'ring-2 ring-blue-500 bg-blue-100' : ''}`}
                  >
                    {cell !== null && (
                      <span
                        className={
                          isGiven ? 'text-black' : isMistake ? 'text-red-600 font-bold' : 'text-blue-600'
                        }
                      >
                        {cell}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Number Pad */}
          <div className="mt-6 flex justify-center gap-2 flex-wrap">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleNumberInput(num)}
                className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-bold text-white text-xl transition-all transform hover:scale-110"
              >
                {num}
              </button>
            ))}
            <button
              onClick={handleHint}
              disabled={selectedCell === null || puzzle[selectedCell] !== null}
              className="w-auto px-4 h-12 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-bold text-white transition-all transform hover:scale-110 inline-flex items-center gap-2"
            >
              <Lightbulb size={18} />
              Hint
            </button>
            <button
              onClick={handleClear}
              className="w-12 h-12 bg-red-600 hover:bg-red-700 rounded-lg font-bold text-white transition-all transform hover:scale-110"
            >
              X
            </button>
          </div>

          <p className="text-center text-white/80 mt-6">
            Fill the grid so each row, column, and 3x3 box contains 1-9. Hints and mistakes lower your final score.
          </p>
        </div>
      </div>

      <GameCompletionModal
        open={showComplete && !!finalResult}
        title="Sudoku Complete"
        subtitle={`You cleared the full grid in ${finalResult?.time ?? 0}s with ${finalResult?.mistakes ?? 0} mistakes.`}
        stars={finalResult?.stars ?? 0}
        stats={[
          { label: 'Score', value: finalResult?.score ?? 0 },
          { label: 'Filled', value: `${finalResult?.filled ?? 0}/${editableCellCount}` },
          { label: 'Mistakes', value: finalResult?.mistakes ?? 0 },
          { label: 'Hint Penalty', value: `-${finalResult?.hintPenalty ?? 0}` },
        ]}
        primaryLabel="Continue"
        primaryAction={handleContinue}
        secondaryLabel="Play Again"
        secondaryAction={startNewGame}
      />
    </div>
  );
});

export default SudokuGame;
