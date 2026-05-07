import { Suspense, lazy, useMemo, type CSSProperties } from 'react';
import { Chessboard } from 'react-chessboard';
import {
  customBoardStyle,
  customDarkSquareStyle,
  customDropSquareStyle,
  customLightSquareStyle,
  piecesConfig,
} from '../lib/boardStyle';

export type ChessBoardView = '2d' | '3d';
export type ChessBoardOrientation = 'white' | 'black';

type PieceDropHandler = (move: { sourceSquare: string; targetSquare: string | null }) => boolean;
type PieceDragHandler = (drag: { square: string | null }) => void;

export interface ChessBoardSurfaceProps {
  allowDragging?: boolean;
  boardKey: string;
  boardOrientation?: ChessBoardOrientation;
  boardView?: ChessBoardView;
  fen: string;
  optionSquares?: Record<string, CSSProperties>;
  pieceSet: string;
  selectedSquare?: string | null;
  onPieceDrag?: PieceDragHandler;
  onPieceDrop: PieceDropHandler;
  onSquareClick: (square: string) => void;
}

const LazyChessBoard3D = lazy(async () =>
  import('../../three/ChessBoard3D').then((module) => ({ default: module.ChessBoard3D })),
);

function Board3DFallback() {
  return (
    <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-cyan-300/20 bg-[#050915]">
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-cyan-200/20 border-t-cyan-200" />
    </div>
  );
}

export function ChessBoardSurface({
  allowDragging = true,
  boardKey,
  boardOrientation = 'white',
  boardView = '2d',
  fen,
  optionSquares = {},
  pieceSet,
  selectedSquare,
  onPieceDrag,
  onPieceDrop,
  onSquareClick,
}: ChessBoardSurfaceProps) {
  const customPieces = useMemo(() => piecesConfig(pieceSet), [pieceSet]);

  return (
    <div
      className="w-full max-w-[600px]"
      style={{ touchAction: 'none', width: 'min(100%, calc(100dvh - 13rem))' }}
    >
      {boardView === '3d' ? (
        <Suspense fallback={<Board3DFallback />}>
          <LazyChessBoard3D
            key={`${boardKey}-3d`}
            boardOrientation={boardOrientation}
            fen={fen}
            optionSquares={optionSquares}
            pieceSet={pieceSet}
            selectedSquare={selectedSquare}
            onSquareClick={onSquareClick}
          />
        </Suspense>
      ) : (
        <Chessboard
          key={`${boardKey}-2d`}
          options={{
            position: fen,
            boardOrientation,
            allowDragging,
            onPieceDrop,
            onSquareClick: ({ square }) => onSquareClick(square),
            onPieceClick: ({ square }) => {
              if (square) onSquareClick(square);
            },
            onPieceDrag,
            animationDurationInMs: 350,
            squareStyles: optionSquares,
            boardStyle: customBoardStyle,
            darkSquareStyle: customDarkSquareStyle,
            lightSquareStyle: customLightSquareStyle,
            dropSquareStyle: customDropSquareStyle,
            pieces: customPieces,
          }}
        />
      )}
    </div>
  );
}
