import { ArrowLeft, Clock, RotateCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import * as SudokuModule from 'sudoku-umd';

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

const SudokuGame = ({ onComplete, onBack }: SudokuGameProps) => {
  const [initialSudoku] = useState<SudokuState>(() => createInitialSudokuState());
  const [startTime] = useState(() => Date.now());
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [puzzle] = useState<(number | null)[]>(initialSudoku.puzzle);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const [solution] = useState<(number | null)[]>(initialSudoku.solution);
  const [userGrid, setUserGrid] = useState<(number | null)[]>(initialSudoku.userGrid);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [isLoading] = useState(initialSudoku.isLoading);

  const handleCellClick = (index: number) => {
    if (puzzle[index] !== null) return; // Can't edit given numbers
    setSelectedCell(index);
  };

  const handleNumberInput = (num: number) => {
    if (selectedCell === null || puzzle[selectedCell] !== null) return;
    const newGrid = [...userGrid];
    newGrid[selectedCell] = num;
    setUserGrid(newGrid);

    // Check if puzzle is complete
    if (checkComplete(newGrid)) {
      const timeSpent = Math.floor((currentTime - startTime) / 1000);
      const score = Math.max(50, 100 - Math.floor(timeSpent / 30));
      const stars = score >= 90 ? 5 : score >= 75 ? 4 : score >= 60 ? 3 : score >= 40 ? 2 : 1;
      setTimeout(() => onComplete(score, stars, timeSpent), 500);
    }
  };

  const handleClear = () => {
    if (selectedCell === null || puzzle[selectedCell] !== null) return;
    const newGrid = [...userGrid];
    newGrid[selectedCell] = null;
    setUserGrid(newGrid);
  };

  const checkComplete = (grid: (number | null)[]) => {
    return grid.every((cell, i) => cell !== null && cell === solution[i]);
  };

  const handleReset = () => {
    setUserGrid([...puzzle]);
    setSelectedCell(null);
  };

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
              {puzzle.filter((c) => c === null).length} filled
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
                        : isHighlighted
                          ? 'bg-blue-50'
                          : 'bg-white hover:bg-blue-50'
                    } ${isSelected ? 'ring-2 ring-blue-500 bg-blue-100' : ''}`}
                  >
                    {cell !== null && (
                      <span className={isGiven ? 'text-black' : 'text-blue-600'}>{cell}</span>
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
              onClick={handleClear}
              className="w-12 h-12 bg-red-600 hover:bg-red-700 rounded-lg font-bold text-white transition-all transform hover:scale-110"
            >
              X
            </button>
          </div>

          <p className="text-center text-white/80 mt-6">
            Fill the grid so each row, column, and 3x3 box contains 1-9
          </p>
        </div>
      </div>
    </div>
  );
};

export default SudokuGame;
