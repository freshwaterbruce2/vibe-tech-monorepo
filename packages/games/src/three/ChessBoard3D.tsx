import { Canvas, type ThreeEvent } from '@react-three/fiber';
import {
  ContactShadows,
  Environment,
  OrbitControls,
  PerspectiveCamera as DreiPerspectiveCamera,
} from '@react-three/drei';
import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  CYAN,
  ChessPiece3D as CrystalChessPiece3D,
  GOLD,
  GlowMaterial as CrystalGlowMaterial,
  MAGENTA,
  getPieceTheme,
  type PieceColor,
  type PieceKind,
} from './ChessPieces3D';

type BoardOrientation = 'white' | 'black';
type BoardCameraMode = 'play' | 'showcase';

interface BoardPiece {
  color: PieceColor;
  kind: PieceKind;
  square: string;
}

export interface ChessBoard3DProps {
  boardOrientation?: BoardOrientation;
  fen: string;
  optionSquares?: Record<string, CSSProperties>;
  pieceSet?: string;
  selectedSquare?: string | null;
  onSquareClick?: (square: string) => void;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const CAMERA_MODES: Array<{ id: BoardCameraMode; label: string }> = [
  { id: 'play', label: 'Play' },
  { id: 'showcase', label: 'Showcase' },
];

function parseFenPieces(fen: string): BoardPiece[] {
  const board = fen.split(' ')[0] ?? '';
  const ranks = board.split('/');
  const pieces: BoardPiece[] = [];

  ranks.forEach((rank, rankIndex) => {
    let fileIndex = 0;

    for (const char of rank) {
      const skip = Number.parseInt(char, 10);
      if (Number.isFinite(skip)) {
        fileIndex += skip;
        continue;
      }

      const file = FILES[fileIndex];
      const rankNumber = 8 - rankIndex;
      if (!file || rankNumber < 1 || rankNumber > 8) continue;

      pieces.push({
        color: char === char.toUpperCase() ? 'w' : 'b',
        kind: char.toLowerCase() as PieceKind,
        square: `${file}${rankNumber}`,
      });
      fileIndex += 1;
    }
  });

  return pieces;
}

function squareToBoardPosition(square: string, orientation: BoardOrientation) {
  const fileIndex = FILES.indexOf(square[0] ?? 'a');
  const rankIndex = Number(square[1] ?? '1') - 1;

  if (orientation === 'black') {
    return {
      x: 3.5 - fileIndex,
      z: rankIndex - 3.5,
    };
  }

  return {
    x: fileIndex - 3.5,
    z: 3.5 - rankIndex,
  };
}

function boardPointToSquare(x: number, z: number, orientation: BoardOrientation) {
  for (const file of FILES) {
    for (let rank = 1; rank <= 8; rank += 1) {
      const square = `${file}${rank}`;
      const center = squareToBoardPosition(square, orientation);

      if (Math.abs(x - center.x) <= 0.5 && Math.abs(z - center.z) <= 0.5) {
        return square;
      }
    }
  }

  return null;
}

function boardPositionToSquare(
  fileIndex: number,
  rankNumber: number,
  orientation: BoardOrientation,
) {
  const file = orientation === 'black' ? FILES[7 - fileIndex] : FILES[fileIndex];

  if (orientation === 'black') {
    return `${file}${9 - rankNumber}`;
  }

  return `${file}${rankNumber}`;
}

function stopAndClick(event: ThreeEvent<PointerEvent>, onClick: () => void) {
  event.stopPropagation();
  onClick();
}

function getCameraPreset(mode: BoardCameraMode, orientation: BoardOrientation) {
  const side = orientation === 'black' ? -1 : 1;

  if (mode === 'showcase') {
    return {
      fov: 44,
      position: [4.8, 6.4, 6.6 * side] as const,
      target: [0, 0.05, 0] as const,
    };
  }

  return {
    fov: 40,
    position: [0, 14.5, 2.0 * side] as const,
    target: [0, 0, 0] as const,
  };
}

function BoardCamera({
  boardOrientation,
  cameraMode,
}: {
  boardOrientation: BoardOrientation;
  cameraMode: BoardCameraMode;
}) {
  const preset = getCameraPreset(cameraMode, boardOrientation);
  const [targetX, targetY, targetZ] = preset.target;

  return (
    <DreiPerspectiveCamera
      key={`${boardOrientation}-${cameraMode}`}
      makeDefault
      fov={preset.fov}
      near={0.1}
      far={100}
      position={preset.position}
      onUpdate={(camera) => {
        camera.lookAt(targetX, targetY, targetZ);
      }}
    />
  );
}

function BoardOrbitControls({
  boardOrientation,
  cameraMode,
}: {
  boardOrientation: BoardOrientation;
  cameraMode: BoardCameraMode;
}) {
  const preset = getCameraPreset(cameraMode, boardOrientation);

  return (
    <OrbitControls
      key={`${boardOrientation}-${cameraMode}`}
      target={preset.target}
      enableDamping
      dampingFactor={0.08}
      enablePan={false}
      enableRotate={cameraMode === 'showcase'}
      enableZoom
      minDistance={8.5}
      maxDistance={16}
      minPolarAngle={0.12}
      maxPolarAngle={Math.PI / 2.35}
      rotateSpeed={0.55}
      zoomSpeed={0.65}
      makeDefault
    />
  );
}

function CyberBoardFrame({ pieceSet }: { pieceSet?: string }) {
  const theme = getPieceTheme(pieceSet);

  return (
    <group>
      <mesh position={[0, -0.13, 0]}>
        <boxGeometry args={[8.45, 0.15, 8.45]} />
        <meshStandardMaterial color="#050915" metalness={0.5} roughness={0.45} />
      </mesh>
      <mesh position={[0, -0.04, -4.3]}>
        <boxGeometry args={[8.7, 0.06, 0.1]} />
        <CrystalGlowMaterial color={theme.accent} intensity={0.7} />
      </mesh>
      <mesh position={[0, -0.04, 4.3]}>
        <boxGeometry args={[8.7, 0.06, 0.1]} />
        <CrystalGlowMaterial color={MAGENTA} intensity={0.62} />
      </mesh>
      <mesh position={[-4.3, -0.04, 0]}>
        <boxGeometry args={[0.1, 0.06, 8.7]} />
        <CrystalGlowMaterial color={CYAN} intensity={0.62} />
      </mesh>
      <mesh position={[4.3, -0.04, 0]}>
        <boxGeometry args={[0.1, 0.06, 8.7]} />
        <CrystalGlowMaterial color={theme.accent} intensity={0.62} />
      </mesh>
    </group>
  );
}

function BoardSquare({
  fileIndex,
  rankNumber,
  orientation,
  optionSquares,
  selectedSquare,
  onSquareClick,
}: {
  fileIndex: number;
  rankNumber: number;
  orientation: BoardOrientation;
  optionSquares: Record<string, CSSProperties>;
  selectedSquare?: string | null;
  onSquareClick?: (square: string) => void;
}) {
  const square = boardPositionToSquare(fileIndex, rankNumber, orientation);
  const { x, z } = squareToBoardPosition(square, orientation);
  const isDark = (FILES.indexOf(square[0] ?? 'a') + Number(square[1] ?? '1')) % 2 === 1;
  const isSelected = square === selectedSquare;
  const isMoveOption = Boolean(optionSquares[square]);
  const baseColor = isDark ? '#101827' : '#233145';
  const highlightColor = isSelected ? GOLD : isMoveOption ? CYAN : baseColor;
  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    stopAndClick(event, () => onSquareClick?.(square));
  };

  return (
    <group>
      <mesh position={[x, -0.02, z]} onPointerDown={handlePointerDown}>
        <boxGeometry args={[0.98, 0.08, 0.98]} />
        <meshStandardMaterial
          color={isSelected || isMoveOption ? highlightColor : baseColor}
          emissive={isSelected || isMoveOption ? highlightColor : '#050915'}
          emissiveIntensity={isSelected ? 0.32 : isMoveOption ? 0.22 : 0.03}
          metalness={0.12}
          roughness={0.7}
        />
      </mesh>
      {(isSelected || isMoveOption) && (
        <mesh position={[x, 0.035, z]} onPointerDown={handlePointerDown}>
          <boxGeometry args={[0.9, 0.015, 0.9]} />
          <meshStandardMaterial
            color={highlightColor}
            emissive={highlightColor}
            emissiveIntensity={0.6}
            transparent
            opacity={0.22}
          />
        </mesh>
      )}
    </group>
  );
}

function BoardHitPlane({
  orientation,
  onSquareClick,
}: {
  orientation: BoardOrientation;
  onSquareClick?: (square: string) => void;
}) {
  return (
    <mesh
      position={[0, 0.14, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerDown={(event) => {
        const square = boardPointToSquare(event.point.x, event.point.z, orientation);

        if (square) stopAndClick(event, () => onSquareClick?.(square));
      }}
    >
      <planeGeometry args={[8, 8]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

function ChessScene({
  boardOrientation,
  fen,
  optionSquares = {},
  pieceSet,
  selectedSquare,
  onSquareClick,
}: Required<Pick<ChessBoard3DProps, 'fen'>> & ChessBoard3DProps) {
  const pieces = useMemo(() => parseFenPieces(fen), [fen]);

  return (
    <>
      <Environment preset="studio" environmentIntensity={1.2} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={1.5} castShadow />
      <pointLight color={CYAN} intensity={20} position={[-3.6, 3.4, 3.6]} distance={8} />
      <pointLight color={MAGENTA} intensity={15} position={[3.8, 3.2, -3.4]} distance={8} />
      <CyberBoardFrame pieceSet={pieceSet} />
      <ContactShadows
        position={[0, -0.2, 0]}
        opacity={0.8}
        scale={12}
        blur={2.5}
        far={4}
        color="#000000"
      />
      <BoardHitPlane orientation={boardOrientation ?? 'white'} onSquareClick={onSquareClick} />
      {Array.from({ length: 8 }, (_, fileIndex) =>
        Array.from({ length: 8 }, (_, rankOffset) => (
          <BoardSquare
            key={`${fileIndex}-${rankOffset}`}
            fileIndex={fileIndex}
            rankNumber={rankOffset + 1}
            orientation={boardOrientation ?? 'white'}
            optionSquares={optionSquares}
            selectedSquare={selectedSquare}
            onSquareClick={onSquareClick}
          />
        )),
      )}
      {pieces.map((piece) => {
        const { x, z } = squareToBoardPosition(piece.square, boardOrientation ?? 'white');

        return (
          <group key={`${piece.square}-${piece.color}${piece.kind}`} position={[x, 0.05, z]}>
            <CrystalChessPiece3D
              piece={piece}
              pieceSet={pieceSet}
              onClick={() => onSquareClick?.(piece.square)}
            />
          </group>
        );
      })}
    </>
  );
}

export function ChessBoard3D({
  boardOrientation = 'white',
  fen,
  optionSquares = {},
  pieceSet,
  selectedSquare,
  onSquareClick,
}: ChessBoard3DProps) {
  const [cameraMode, setCameraMode] = useState<BoardCameraMode>('play');

  return (
    <div className="flex w-full flex-col gap-2">
      <div
        className={[
          'flex items-center justify-between gap-2 rounded-lg border border-cyan-300/20',
          'bg-black/30 p-1.5 text-cyan-100 shadow-[0_0_24px_rgba(56,232,255,0.12)]',
        ].join(' ')}
      >
        <div className="px-2 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/75">
          <span>3D Board</span>
          <span className="ml-2 text-cyan-100/45">{boardOrientation}</span>
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-md border border-white/10 bg-white/5 p-1">
          {CAMERA_MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setCameraMode(mode.id)}
              className={[
                'rounded px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.14em]',
                'transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-200/60',
                cameraMode === mode.id
                  ? 'bg-cyan-300/20 text-cyan-50 shadow-[0_0_16px_rgba(56,232,255,0.22)]'
                  : 'text-slate-400 hover:bg-white/10 hover:text-cyan-100',
              ].join(' ')}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>
      <div
        className={[
          'relative aspect-square w-full overflow-hidden rounded-lg',
          'border border-cyan-300/20 bg-[#050915]',
          'shadow-[0_0_40px_rgba(56,232,255,0.18)]',
        ].join(' ')}
        data-testid="chess-board-3d"
        style={{ aspectRatio: '1 / 1' }}
      >
        <Canvas
          camera={{ fov: 40, position: [0, 14.5, 2.0], near: 0.1, far: 100 }}
          dpr={[1.25, 2]}
          frameloop="demand"
          shadows
          gl={{ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true }}
        >
          <BoardCamera boardOrientation={boardOrientation} cameraMode={cameraMode} />
          <BoardOrbitControls boardOrientation={boardOrientation} cameraMode={cameraMode} />
          <color attach="background" args={['#050915']} />
          <ChessScene
            boardOrientation={boardOrientation}
            fen={fen}
            optionSquares={optionSquares}
            pieceSet={pieceSet}
            selectedSquare={selectedSquare}
            onSquareClick={onSquareClick}
          />
        </Canvas>
      </div>
    </div>
  );
}
