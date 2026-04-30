import React from 'react';
import { defaultPieces, type PieceRenderObject } from 'react-chessboard';

export const customBoardStyle = {
  borderRadius: '4px',
  boxShadow:
    '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 2px #1e293b, 0 0 0 6px #0f172a, inset 0 0 4px rgba(0, 0, 0, 0.5)',
  backgroundColor: '#0f172a',
};

// Deep contrast dark squares - Neo Wood
export const customDarkSquareStyle = {
  backgroundColor: '#b58863',
  boxShadow: 'inset 0 0 8px rgba(0,0,0,0.4)',
};

// Crisp contrast light squares
export const customLightSquareStyle = {
  backgroundColor: '#f0d9b5',
  boxShadow: 'inset 0 0 4px rgba(0,0,0,0.1)',
};

export const customDropSquareStyle = {
  boxShadow: 'inset 0 0 1px 4px #4ade80, inset 0 0 25px rgba(74, 222, 128, 0.7)',
  backgroundColor: 'rgba(74, 222, 128, 0.2)',
};

const pieces = ['wP', 'wN', 'wB', 'wR', 'wQ', 'wK', 'bP', 'bN', 'bB', 'bR', 'bQ', 'bK'] as const;
type PieceCode = (typeof pieces)[number];

const pieceLooks: Record<
  string,
  {
    white: string;
    black: string;
    scale: number;
    yOffset: number;
  }
> = {
  fresca: { white: '#fff7e8', black: '#111827', scale: 0.94, yOffset: -1 },
  cburnett: { white: '#ffffff', black: '#05070d', scale: 0.96, yOffset: -1 },
  alpha: { white: '#f5fbff', black: '#152033', scale: 0.92, yOffset: 0 },
  merida: { white: '#fff0cf', black: '#241711', scale: 0.94, yOffset: -1 },
  california: { white: '#f8fafc', black: '#172554', scale: 0.9, yOffset: 0 },
  staunty: { white: '#fffbe6', black: '#18181b', scale: 0.95, yOffset: -1 },
};

function getPieceLook(pieceSet: string) {
  return pieceLooks[pieceSet] ?? pieceLooks.fresca;
}

function getPieceFill(piece: string, pieceSet: string) {
  const look = getPieceLook(pieceSet);
  return piece.startsWith('w') ? look.white : look.black;
}

export function getPieceSvgStyle(
  piece: string,
  pieceSet: string = 'fresca',
  squareWidth?: number,
): React.CSSProperties {
  const isWhite = piece.startsWith('w');
  const look = getPieceLook(pieceSet);
  const size = squareWidth ? `${Math.max(24, Math.floor(squareWidth))}px` : '100%';

  return {
    display: 'block',
    filter: isWhite
      ? 'drop-shadow(0 4px 3px rgba(0,0,0,0.48)) drop-shadow(0 0 1px rgba(255,255,255,0.9))'
      : 'drop-shadow(0 4px 3px rgba(0,0,0,0.58))',
    height: size,
    pointerEvents: 'none',
    position: 'relative',
    top: `${look.yOffset}px`,
    transform: `scale(${look.scale})`,
    transformOrigin: 'center',
    width: size,
  };
}

type LocalPieceProps = {
  fill?: string;
  square?: string;
  squareWidth?: number;
  svgStyle?: React.CSSProperties;
};

export function PiecePreview({
  piece = 'wN',
  pieceSet = 'fresca',
  size = 42,
}: {
  piece?: PieceCode;
  pieceSet?: string;
  size?: number;
}) {
  const renderer = defaultPieces[piece];

  return (
    <span
      aria-hidden="true"
      style={{
        alignItems: 'center',
        display: 'flex',
        height: size,
        justifyContent: 'center',
        width: size,
      }}
    >
      {renderer({
        fill: getPieceFill(piece, pieceSet),
        svgStyle: getPieceSvgStyle(piece, pieceSet, size),
      })}
    </span>
  );
}

export const piecesConfig = (pieceSet: string = 'fresca'): PieceRenderObject => {
  const returnPieces: PieceRenderObject = {};

  pieces.forEach((piece) => {
    returnPieces[piece] = (props?: LocalPieceProps) => {
      const renderer = defaultPieces[piece];

      return renderer({
        ...props,
        fill: getPieceFill(piece, pieceSet),
        svgStyle: {
          ...props?.svgStyle,
          ...getPieceSvgStyle(piece, pieceSet, props?.squareWidth),
        },
      });
    };
  });

  return returnPieces;
};
