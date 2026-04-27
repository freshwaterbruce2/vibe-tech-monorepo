import React from 'react';

export const customBoardStyle = {
  borderRadius: '4px',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 2px #1e293b, 0 0 0 6px #0f172a, inset 0 0 4px rgba(0, 0, 0, 0.5)',
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
  backgroundColor: 'rgba(74, 222, 128, 0.2)'
};

export const piecesConfig = (pieceSet: string = 'fresca') => {
  const pieces = ["wP", "wN", "wB", "wR", "wQ", "wK", "bP", "bN", "bB", "bR", "bQ", "bK"];
  const returnPieces: Record<string, (props?: { squareWidth?: number; svgStyle?: React.CSSProperties }) => React.JSX.Element> = {};
  
  pieces.forEach((p) => {
    returnPieces[p] = (props) => {
      const size = props?.squareWidth ?? props?.svgStyle?.width ?? '100%';

      return (
        <img
          key={`${pieceSet}-${p}`}
          src={`https://lichess1.org/assets/piece/${pieceSet}/${p}.svg`}
          style={{
            ...props?.svgStyle,
            width: size,
            height: size,
            transform: "scale(0.95)",
            filter: p.startsWith('w')
              ? "drop-shadow(0 4px 3px rgba(0,0,0,0.4))"
              : "drop-shadow(0 4px 3px rgba(0,0,0,0.6))",
            position: "relative",
            pointerEvents: "none",
            top: "-1px" 
          }}
          alt={p}
        />
      );
    };
  });
  
  return returnPieces;
};
