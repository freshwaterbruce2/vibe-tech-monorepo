import { Pause } from 'lucide-react';
import React from 'react';
import type { WordSearchGrid as WordSearchGridType } from '../../../services/puzzleGenerator';

interface WordSearchGridProps {
  puzzle: WordSearchGridType;
  foundWords: Set<string>;
  selectedCells: Set<string>;
  revealedCells: Set<string>;
  isPaused: boolean;
  highContrast?: boolean;
  onPauseToggle: () => void;
  onCellMouseDown: (row: number, col: number) => void;
  onCellMouseEnter: (row: number, col: number) => void;
  onCellMouseUp: () => void;
  onTouchStart: (row: number, col: number) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  onMouseLeave: () => void;
  getCellKey: (row: number, col: number) => string;
  subject: string;
}

/** Check if a cell at (rowIndex, colIndex) is part of a found word */
function isCellInFoundWord(
  puzzle: WordSearchGridType,
  foundWords: Set<string>,
  rowIndex: number,
  colIndex: number
): boolean {
  return puzzle.words.some((w) => {
    try {
      if (!foundWords.has(w.word)) return false;
      const { startRow, startCol, endRow, endCol } = w;

      if (
        startRow === undefined ||
        startCol === undefined ||
        endRow === undefined ||
        endCol === undefined
      ) {
        return false;
      }

      const rowDiff = endRow - startRow;
      const colDiff = endCol - startCol;
      const rowStep = rowDiff === 0 ? 0 : rowDiff / Math.abs(rowDiff);
      const colStep = colDiff === 0 ? 0 : colDiff / Math.abs(colDiff);
      const steps = Math.max(Math.abs(rowDiff), Math.abs(colDiff));

      for (let i = 0; i <= steps; i++) {
        const r = startRow + i * rowStep;
        const c = startCol + i * colStep;
        if (Math.round(r) === rowIndex && Math.round(c) === colIndex) {
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error checking if cell is found:', error, w);
      return false;
    }
  });
}

function getCellClassName(
  isFound: boolean,
  isRevealed: boolean,
  isSelected: boolean,
  highContrast: boolean
): string {
  if (highContrast) {
    if (isFound) return 'bg-green-600 text-white border-green-400 animate-pulse-once';
    if (isRevealed) return 'bg-yellow-600 text-black border-yellow-400 animate-bounce';
    if (isSelected) return 'bg-cyan-600 text-white border-cyan-400 scale-110 shadow-2xl';
    return 'bg-gray-900 text-white border-gray-600 hover:bg-gray-800';
  }
  if (isFound) return 'bg-green-500/30 text-green-300 border-green-500/50 animate-pulse-once';
  if (isRevealed) return 'bg-yellow-500/30 text-yellow-300 border-yellow-500/50 animate-bounce';
  if (isSelected) return 'bg-cyan-500 text-white scale-110 shadow-lg';
  return 'bg-purple-900/30 text-white hover:bg-purple-700/50 active:scale-95';
}

const WordSearchGrid = ({
  puzzle,
  foundWords,
  selectedCells,
  revealedCells,
  isPaused,
  highContrast = false,
  onPauseToggle,
  onCellMouseDown,
  onCellMouseEnter,
  onCellMouseUp,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onMouseLeave,
  getCellKey,
  subject,
}: WordSearchGridProps) => {
  const borderBase = highContrast ? 'border-2 font-extrabold text-lg sm:text-xl' : 'border border-purple-500/30 font-bold text-base sm:text-lg';

  return (
    <div className="lg:col-span-2 glass-card p-6">
      <h2 className="text-2xl font-bold text-center mb-4 neon-text-primary">{subject} Word Search</h2>

      <div className="flex justify-center overflow-hidden relative">
        {/* Pause overlay */}
        {isPaused && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 backdrop-blur-sm rounded-lg">
            <div className="text-center">
              <Pause size={64} className="mx-auto mb-4 text-yellow-400 animate-pulse" />
              <h3 className="text-2xl font-bold text-white mb-2">Game Paused</h3>
              <p className="text-gray-300 mb-4">Grid hidden to prevent cheating</p>
              <button
                onClick={onPauseToggle}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-bold text-white"
              >
                Resume Game
              </button>
            </div>
          </div>
        )}

        <div
          className={`inline-grid gap-0 transition-all ${isPaused ? 'blur-xl' : ''}`}
          style={{
            gridTemplateColumns: `repeat(${puzzle.grid[0]?.length ?? 0}, minmax(0, 1fr))`,
            maxWidth: '100%',
            aspectRatio: '1/1',
            width: 'min(100%, 600px)',
            touchAction: 'none',
          }}
          onMouseLeave={onMouseLeave}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {puzzle.grid.map((row, rowIndex) =>
            row.map((letter, colIndex) => {
              const cellKey = getCellKey(rowIndex, colIndex);
              const isSelected = selectedCells.has(cellKey);
              const isRevealed = revealedCells.has(cellKey);
              const isFound = isCellInFoundWord(puzzle, foundWords, rowIndex, colIndex);
              const stateClass = getCellClassName(isFound, isRevealed, isSelected, highContrast);

              return (
                <div
                  key={cellKey}
                  data-row={rowIndex}
                  data-col={colIndex}
                  className={`flex items-center justify-center font-mono cursor-pointer select-none transition-all ${borderBase} ${stateClass}`}
                  style={{ aspectRatio: '1/1', touchAction: 'none' }}
                  onMouseDown={() => onCellMouseDown(rowIndex, colIndex)}
                  onMouseEnter={() => onCellMouseEnter(rowIndex, colIndex)}
                  onMouseUp={onCellMouseUp}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    onTouchStart(rowIndex, colIndex);
                  }}
                >
                  {letter}
                </div>
              );
            })
          )}
        </div>
      </div>

      <p className="text-center text-sm text-gray-400 mt-4">
        💡 Swipe from first to last letter to find words!
      </p>
    </div>
  );
};

export default WordSearchGrid;
