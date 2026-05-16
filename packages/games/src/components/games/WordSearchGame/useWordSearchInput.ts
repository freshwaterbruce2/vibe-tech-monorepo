import React, { useCallback, useState } from 'react';
import { logger } from '../../../utils/logger';
import type { WordSearchGrid } from '../../../services/puzzleGenerator';
import { appStore } from '../../../utils/electronStore';

interface UseWordSearchInputProps {
  puzzle: WordSearchGrid | null;
  foundWords: Set<string>;
  setFoundWords: React.Dispatch<React.SetStateAction<Set<string>>>;
  setCelebrate: React.Dispatch<React.SetStateAction<boolean>>;
  config: { soundEnabled?: boolean };
  isActive: boolean;
  playSound: (type: 'success' | 'error' | 'pop' | 'victory' | 'levelUp') => void;
}

export function useWordSearchInput({
  puzzle,
  foundWords,
  setFoundWords,
  setCelebrate,
  config,
  isActive,
  playSound,
}: UseWordSearchInputProps) {
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [selecting, setSelecting] = useState(false);
  const [startCell, setStartCell] = useState<{ row: number; col: number } | null>(null);

  const getCellKey = (row: number, col: number) => `${row}-${col}`;

  const handleCellMouseDown = useCallback((row: number, col: number) => {
    if (!isActive || !puzzle) return;
    setSelecting(true);
    setStartCell({ row, col });
    setSelectedCells(new Set([getCellKey(row, col)]));
    if (config.soundEnabled) {
      playSound('pop');
    }
  }, [config.soundEnabled, getCellKey, isActive, playSound, puzzle]);

  const handleCellMouseEnter = useCallback(
    (row: number, col: number) => {
      if (!isActive || !selecting || !startCell || !puzzle) return;

      const newSelected = new Set<string>();
      const rowDiff = row - startCell.row;
      const colDiff = col - startCell.col;

      // Straight line selection (horizontal, vertical, or diagonal)
      if (rowDiff === 0 || colDiff === 0 || Math.abs(rowDiff) === Math.abs(colDiff)) {
        const steps = Math.max(Math.abs(rowDiff), Math.abs(colDiff));
        const rowStep = rowDiff === 0 ? 0 : rowDiff / Math.abs(rowDiff);
        const colStep = colDiff === 0 ? 0 : colDiff / Math.abs(colDiff);

        for (let i = 0; i <= steps; i++) {
          const r = startCell.row + i * rowStep;
          const c = startCell.col + i * colStep;
          newSelected.add(getCellKey(r, c));
        }
      }

      setSelectedCells(newSelected);
    },
    [isActive, selecting, startCell, puzzle],
  );

  const handleCellMouseUp = useCallback(() => {
    if (!isActive) {
      setSelecting(false);
      setSelectedCells(new Set());
      setStartCell(null);
      return;
    }

    try {
      if (!puzzle || !startCell || selectedCells.size === 0) {
        setSelecting(false);
        setSelectedCells(new Set());
        setStartCell(null);
        return;
      }

      // Build selected word from cells (preserve selection order)
      const cellsArray = Array.from(selectedCells);

      // Sort by position relative to start cell
      cellsArray.sort((a, b) => {
        const parts1 = a.split('-').map(Number);
        const parts2 = b.split('-').map(Number);
        const r1 = parts1[0] ?? 0,
          c1 = parts1[1] ?? 0;
        const r2 = parts2[0] ?? 0,
          c2 = parts2[1] ?? 0;
        const dist1 = Math.abs(r1 - startCell.row) + Math.abs(c1 - startCell.col);
        const dist2 = Math.abs(r2 - startCell.row) + Math.abs(c2 - startCell.col);
        return dist1 - dist2;
      });

      let selectedWord = '';
      cellsArray.forEach((cellKey) => {
        const parts = cellKey.split('-').map(Number);
        const r = parts[0] ?? 0,
          c = parts[1] ?? 0;
        if (puzzle.grid?.[r]?.[c]) {
          selectedWord += puzzle.grid[r][c];
        }
      });

      // Check if it matches any word in the list
      if (selectedWord && puzzle.words) {
        const matchedWord = puzzle.words.find(
          (w) =>
            w.word.toUpperCase() === selectedWord.toUpperCase() ||
            w.word.toUpperCase() === selectedWord.split('').reverse().join('').toUpperCase(),
        );

        if (matchedWord && !foundWords.has(matchedWord.word)) {
          try {
            const newFound = new Set(foundWords);
            newFound.add(matchedWord.word);
            setFoundWords(newFound);

            setCelebrate(true);
            setTimeout(() => setCelebrate(false), 1000);

            if (config.soundEnabled) {
              playSound('success');
            }

            // Haptic feedback
            try {
              const sensoryPrefs = appStore.get<Record<string, unknown>>('sensory-prefs') ?? {};
              if (sensoryPrefs.hapticEnabled !== false && navigator.vibrate) {
                navigator.vibrate([50, 30, 50]);
              }
            } catch (e) {
              logger.debug('Vibration not supported:', e);
            }
          } catch (error) {
            logger.error('Error updating foundWords:', error);
            return;
          }
        }
      }
    } catch (error) {
      logger.error('Error in handleCellMouseUp:', error);
    } finally {
      setSelecting(false);
      setSelectedCells(new Set());
      setStartCell(null);
    }
  }, [
    isActive,
    puzzle,
    startCell,
    selectedCells,
    setFoundWords,
    setCelebrate,
    config.soundEnabled,
    playSound,
  ]);

  // Touch event handlers for mobile (A54 optimization)
  const handleTouchStart = useCallback(
    (row: number, col: number) => {
      if (!isActive) return;
      try {
        handleCellMouseDown(row, col);
      } catch (error) {
        logger.error('Touch start error:', error);
      }
    },
    [handleCellMouseDown],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isActive || !selecting || !puzzle) return;

      try {
        e.preventDefault();
        const touch = e.touches[0];
        if (!touch) return;

        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        if (element && element.hasAttribute('data-row') && element.hasAttribute('data-col')) {
          const row = parseInt(element.getAttribute('data-row') ?? '', 10);
          const col = parseInt(element.getAttribute('data-col') ?? '', 10);

          if (
            !isNaN(row) &&
            !isNaN(col) &&
            row >= 0 &&
            row < puzzle.grid.length &&
            col >= 0 &&
            col < (puzzle.grid[0]?.length ?? 0)
          ) {
            handleCellMouseEnter(row, col);
          }
        }
      } catch (error) {
        logger.error('Touch move error:', error);
        setSelecting(false);
      }
    },
    [isActive, selecting, puzzle, handleCellMouseEnter],
  );

  const handleTouchEnd = useCallback(() => {
    try {
      handleCellMouseUp();
    } catch (error) {
      logger.error('Touch end error:', error);
      setSelecting(false);
      setSelectedCells(new Set());
      setStartCell(null);
    }
  }, [handleCellMouseUp]);

  return {
    selectedCells,
    selecting,
    setSelecting,
    getCellKey,
    handleCellMouseDown,
    handleCellMouseEnter,
    handleCellMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
