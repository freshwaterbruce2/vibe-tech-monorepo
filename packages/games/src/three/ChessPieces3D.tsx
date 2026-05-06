import { CatmullRomCurve3, Vector3 } from 'three';
import {
  AccentMaterial,
  CrystalCore,
  CrystalProfile,
  DetailRing,
  FacetBand,
  GlassFacetShard,
  GlowMaterial,
  GOLD,
  InternalNeonVein,
  PieceMaterial,
  RoyalTrimMaterial,
  RoyalTrimRing,
  SurfaceGrain,
  VerticalLines,
  pieceAccent,
  pieceCoreAccent,
  usesPremiumDetails,
  type PieceColor,
  type PieceKind,
} from './ChessPiecePrimitives3D';

export {
  CYAN,
  GOLD,
  GREEN,
  GlowMaterial,
  MAGENTA,
  VIOLET,
  getPieceTheme,
} from './ChessPiecePrimitives3D';
export type { PieceColor, PieceKind } from './ChessPiecePrimitives3D';

export interface CrystalChessPiece {
  color: PieceColor;
  kind: PieceKind;
  square: string;
}

function PremiumFinish({
  color,
  height,
  radius,
  y,
}: {
  color: PieceColor;
  height: number;
  radius: number;
  y: number;
}) {
  const grainColor = color === 'w' ? '#b6863f' : '#c08442';
  const trimColor = color === 'w' ? '#d7b46a' : '#a66732';

  return (
    <>
      <SurfaceGrain color={grainColor} height={height} radius={radius} y={y} count={10} />
      <RoyalTrimRing y={y - height / 2 + 0.04} radius={radius * 1.04} color={trimColor} />
      <RoyalTrimRing y={y + height / 2 - 0.05} radius={radius * 0.9} color={trimColor} thickness={0.014} />
    </>
  );
}

function BasePiece({ color, pieceSet }: { color: PieceColor; pieceSet?: string }) {
  const accent = pieceAccent(color, pieceSet);
  const coreAccent = pieceCoreAccent(pieceSet);
  const premiumDetail = usesPremiumDetails(pieceSet);

  return (
    <>
      <CrystalProfile
        color={color}
        pieceSet={pieceSet}
        points={[
          [0, 0],
          [0.46, 0.02],
          [0.48, 0.07],
          [0.41, 0.12],
          [0.39, 0.18],
          [0.32, 0.23],
          [0.29, 0.31],
          [0.24, 0.37],
          [0, 0.39],
        ]}
      />
      <DetailRing y={0.07} radius={0.45} color={accent} />
      <DetailRing y={0.14} radius={0.39} color={coreAccent} />
      <DetailRing y={0.24} radius={0.31} color={accent} />
      <DetailRing y={0.35} radius={0.24} color={accent} />
      <FacetBand accent={accent} height={0.18} radius={0.35} y={0.18} count={12} />
      {premiumDetail && <PremiumFinish color={color} height={0.22} radius={0.34} y={0.2} />}
      {Array.from({ length: 6 }, (_, index) => {
        const angle = (Math.PI * 2 * index) / 6;

        return (
          <GlassFacetShard
            key={angle}
            accent={index % 2 === 0 ? accent : coreAccent}
            position={[Math.cos(angle) * 0.31, 0.28, Math.sin(angle) * 0.31]}
            rotation={[0.35, angle, 0.42]}
            scale={[0.7, 1.2, 0.7]}
          />
        );
      })}
    </>
  );
}

function PawnPiece({ color, pieceSet }: { color: PieceColor; pieceSet?: string }) {
  const accent = pieceAccent(color, pieceSet);
  const coreAccent = pieceCoreAccent(pieceSet);
  const premiumDetail = usesPremiumDetails(pieceSet);

  return (
    <group>
      <BasePiece color={color} pieceSet={pieceSet} />
      <CrystalProfile
        color={color}
        pieceSet={pieceSet}
        points={[
          [0, 0.34],
          [0.18, 0.37],
          [0.26, 0.45],
          [0.22, 0.57],
          [0.16, 0.7],
          [0.12, 0.77],
          [0, 0.8],
        ]}
      />
      <mesh position={[0, 0.91, 0]} scale={[1, 1.16, 1]}>
        <sphereGeometry args={[0.24, 40, 26]} />
        <PieceMaterial color={color} pieceSet={pieceSet} />
      </mesh>
      <DetailRing y={0.61} radius={0.2} color={accent} />
      <DetailRing y={0.79} radius={0.15} color={coreAccent} />
      <DetailRing y={0.91} radius={0.19} color={accent} tilt={0.26} />
      {premiumDetail ? (
        <PremiumFinish color={color} height={0.4} radius={0.16} y={0.58} />
      ) : (
        <InternalNeonVein accent={accent} secondary={coreAccent} height={0.72} y={0.63} radius={0.018} />
      )}
      {!premiumDetail && <CrystalCore y={0.91} color={accent} scale={0.76} />}
    </group>
  );
}

function RookPiece({ color, pieceSet }: { color: PieceColor; pieceSet?: string }) {
  const accent = pieceAccent(color, pieceSet);
  const coreAccent = pieceCoreAccent(pieceSet);
  const premiumDetail = usesPremiumDetails(pieceSet);

  return (
    <group>
      <BasePiece color={color} pieceSet={pieceSet} />
      <CrystalProfile
        color={color}
        pieceSet={pieceSet}
        points={[
          [0, 0.32],
          [0.27, 0.35],
          [0.32, 0.45],
          [0.28, 0.78],
          [0.34, 0.9],
          [0.39, 1],
          [0.32, 1.08],
          [0, 1.1],
        ]}
        segments={8}
      />
      <VerticalLines accent={accent} height={0.58} radius={0.28} y={0.66} count={8} />
      <DetailRing y={0.49} radius={0.3} color={accent} />
      <DetailRing y={0.89} radius={0.33} color={coreAccent} />
      <DetailRing y={1.08} radius={0.31} color={accent} />
      {premiumDetail ? (
        <PremiumFinish color={color} height={0.56} radius={0.26} y={0.71} />
      ) : (
        <InternalNeonVein accent={accent} secondary={coreAccent} height={0.84} y={0.72} radius={0.024} />
      )}
      {Array.from({ length: 8 }, (_, index) => (Math.PI * 2 * index) / 8).map((angle) => (
        <mesh
          key={angle}
          position={[Math.cos(angle) * 0.25, 1.21, Math.sin(angle) * 0.25]}
          rotation={[0, angle, 0]}
        >
          <boxGeometry args={[0.12, 0.25, 0.12]} />
          <PieceMaterial color={color} pieceSet={pieceSet} />
        </mesh>
      ))}
      <mesh position={[0, 1.23, 0]}>
        <cylinderGeometry args={[0.16, 0.18, 0.17, 8]} />
        <AccentMaterial color={accent} intensity={0.9} />
      </mesh>
      {premiumDetail && <RoyalTrimRing y={1.21} radius={0.23} color={color === 'w' ? GOLD : '#a66732'} />}
    </group>
  );
}

function KnightPiece({ color, pieceSet }: { color: PieceColor; pieceSet?: string }) {
  const accent = pieceAccent(color, pieceSet);
  const coreAccent = pieceCoreAccent(pieceSet);
  const premiumDetail = usesPremiumDetails(pieceSet);

  return (
    <group>
      <BasePiece color={color} pieceSet={pieceSet} />
      <CrystalProfile
        color={color}
        pieceSet={pieceSet}
        points={[
          [0, 0.32],
          [0.2, 0.36],
          [0.27, 0.48],
          [0.23, 0.62],
          [0.16, 0.74],
          [0, 0.78],
        ]}
      />
      <mesh position={[0, 0.68, 0.02]} rotation={[0.5, 0, -0.32]} scale={[0.8, 1.3, 0.72]}>
        <cylinderGeometry args={[0.2, 0.28, 0.62, 18]} />
        <PieceMaterial color={color} pieceSet={pieceSet} />
      </mesh>
      <mesh
        position={[0.04, 1.04, -0.08]}
        rotation={[0.18, 0.24, -0.34]}
        scale={[0.82, 1.15, 0.52]}
      >
        <sphereGeometry args={[0.31, 36, 22]} />
        <PieceMaterial color={color} pieceSet={pieceSet} />
      </mesh>
      <mesh position={[0.1, 1.04, -0.36]} rotation={[0.32, 0.08, -0.12]} scale={[0.78, 0.44, 1.12]}>
        <sphereGeometry args={[0.23, 30, 16]} />
        <PieceMaterial color={color} pieceSet={pieceSet} />
      </mesh>
      {[0.76, 0.88, 1, 1.12, 1.23].map((y, index) => (
        <mesh
          key={y}
          position={[0.08, y, -0.22 - index * 0.035]}
          rotation={[0.75, 0, 0.08]}
        >
          <coneGeometry args={[0.055, 0.24, 7]} />
          <AccentMaterial color={accent} intensity={1.05} />
        </mesh>
      ))}
      <mesh position={[-0.08, 1.35, -0.15]} rotation={[0.56, 0.1, -0.2]}>
        <coneGeometry args={[0.09, 0.32, 10]} />
        <AccentMaterial color={accent} intensity={0.98} />
      </mesh>
      <mesh position={[0.13, 1.36, -0.2]} rotation={[0.5, 0.2, 0.05]}>
        <coneGeometry args={[0.085, 0.3, 10]} />
        <AccentMaterial color={accent} intensity={0.98} />
      </mesh>
      <mesh position={[0.18, 1.08, -0.51]} scale={[1.25, 0.42, 0.5]}>
        <sphereGeometry args={[0.052, 14, 10]} />
        <GlowMaterial color={accent} intensity={1.25} />
      </mesh>
      <mesh position={[0.19, 1.03, -0.52]} rotation={[1.15, 0, 0]}>
        <coneGeometry args={[0.035, 0.12, 10]} />
        <AccentMaterial color={coreAccent} intensity={0.92} />
      </mesh>
      {premiumDetail ? (
        <PremiumFinish color={color} height={0.48} radius={0.18} y={0.68} />
      ) : (
        <InternalNeonVein accent={accent} secondary={coreAccent} height={0.62} y={0.66} radius={0.02} />
      )}
      <mesh position={[0.11, 1.02, -0.15]} rotation={[0.62, 0, -0.25]}>
        <tubeGeometry
          args={[
            new CatmullRomCurve3([
              new Vector3(0, -0.28, 0),
              new Vector3(0.06, -0.08, 0.04),
              new Vector3(-0.02, 0.16, -0.03),
              new Vector3(0.05, 0.32, 0.02),
            ]),
            28,
            0.014,
            8,
            false,
          ]}
        />
        <GlowMaterial color={coreAccent} intensity={0.95} />
      </mesh>
      <DetailRing y={0.73} radius={0.2} color={accent} tilt={0.18} />
      {premiumDetail && (
        <>
          <RoyalTrimRing y={0.44} radius={0.32} color={color === 'w' ? GOLD : '#a66732'} />
          <mesh position={[0.06, 1.02, -0.38]} rotation={[0.16, 0.18, -0.1]} scale={[1.05, 0.35, 0.44]}>
            <sphereGeometry args={[0.11, 18, 12]} />
            <RoyalTrimMaterial color={color === 'w' ? '#7f5b28' : '#f0b56b'} />
          </mesh>
        </>
      )}
    </group>
  );
}

function BishopPiece({ color, pieceSet }: { color: PieceColor; pieceSet?: string }) {
  const accent = pieceAccent(color, pieceSet);
  const coreAccent = pieceCoreAccent(pieceSet);
  const premiumDetail = usesPremiumDetails(pieceSet);

  return (
    <group>
      <BasePiece color={color} pieceSet={pieceSet} />
      <CrystalProfile
        color={color}
        pieceSet={pieceSet}
        points={[
          [0, 0.32],
          [0.24, 0.37],
          [0.32, 0.54],
          [0.28, 0.78],
          [0.18, 1.04],
          [0.08, 1.22],
          [0, 1.28],
        ]}
      />
      <VerticalLines accent={accent} height={0.58} radius={0.21} y={0.72} count={6} />
      <mesh position={[0.08, 0.92, 0.25]} rotation={[0.85, 0, -0.45]}>
        <boxGeometry args={[0.08, 0.58, 0.032]} />
        <AccentMaterial color={accent} intensity={1.15} />
      </mesh>
      <mesh position={[0.1, 0.92, 0.265]} rotation={[0.85, 0, -0.45]}>
        <boxGeometry args={[0.035, 0.64, 0.042]} />
        <GlowMaterial color={coreAccent} intensity={1.05} />
      </mesh>
      <mesh position={[0, 1.29, 0]}>
        <sphereGeometry args={[0.13, 24, 16]} />
        <PieceMaterial color={color} pieceSet={pieceSet} />
      </mesh>
      <DetailRing y={0.54} radius={0.3} color={accent} />
      <DetailRing y={0.99} radius={0.17} color={coreAccent} />
      {premiumDetail ? (
        <PremiumFinish color={color} height={0.68} radius={0.2} y={0.78} />
      ) : (
        <InternalNeonVein accent={accent} secondary={coreAccent} height={0.84} y={0.78} radius={0.023} />
      )}
      {!premiumDetail && <CrystalCore y={0.76} color={accent} scale={0.74} />}
    </group>
  );
}

function QueenPiece({ color, pieceSet }: { color: PieceColor; pieceSet?: string }) {
  const accent = pieceAccent(color, pieceSet);
  const coreAccent = pieceCoreAccent(pieceSet);
  const premiumDetail = usesPremiumDetails(pieceSet);

  return (
    <group>
      <BasePiece color={color} pieceSet={pieceSet} />
      <CrystalProfile
        color={color}
        pieceSet={pieceSet}
        points={[
          [0, 0.32],
          [0.24, 0.37],
          [0.32, 0.54],
          [0.27, 0.86],
          [0.35, 1.02],
          [0.23, 1.16],
          [0, 1.18],
        ]}
      />
      <VerticalLines accent={accent} height={0.66} radius={0.25} y={0.7} count={8} />
      <DetailRing y={0.56} radius={0.3} color={accent} />
      <DetailRing y={1.01} radius={0.3} color={GOLD} />
      <DetailRing y={1.16} radius={0.2} color={accent} />
      {premiumDetail ? (
        <PremiumFinish color={color} height={0.72} radius={0.25} y={0.82} />
      ) : (
        <InternalNeonVein accent={accent} secondary={coreAccent} height={0.92} y={0.8} radius={0.027} />
      )}
      {[
        [0, 1.44, 0],
        [0.29, 1.27, 0],
        [-0.29, 1.27, 0],
        [0, 1.27, 0.29],
        [0, 1.27, -0.29],
        [0.2, 1.22, 0.2],
        [-0.2, 1.22, -0.2],
      ].map(([x, y, z]) => {
        const jewelColor = x === 0 && z === 0 ? GOLD : accent;

        return (
          <mesh key={`${x}-${z}`} position={[x, y, z]}>
            <octahedronGeometry args={[x === 0 && z === 0 ? 0.12 : 0.095, 0]} />
            {premiumDetail ? (
              <RoyalTrimMaterial color={jewelColor} intensity={0.14} />
            ) : (
              <GlowMaterial color={jewelColor} intensity={1.15} />
            )}
          </mesh>
        );
      })}
      {!premiumDetail && <CrystalCore y={0.78} color={accent} scale={0.84} />}
    </group>
  );
}

function KingPiece({ color, pieceSet }: { color: PieceColor; pieceSet?: string }) {
  const accent = pieceAccent(color, pieceSet);
  const coreAccent = pieceCoreAccent(pieceSet);
  const premiumDetail = usesPremiumDetails(pieceSet);

  return (
    <group>
      <BasePiece color={color} pieceSet={pieceSet} />
      <CrystalProfile
        color={color}
        pieceSet={pieceSet}
        points={[
          [0, 0.32],
          [0.25, 0.37],
          [0.34, 0.54],
          [0.28, 0.92],
          [0.21, 1.12],
          [0.13, 1.28],
          [0, 1.31],
        ]}
      />
      <VerticalLines accent={accent} height={0.7} radius={0.24} y={0.72} count={6} />
      <DetailRing y={0.57} radius={0.31} color={accent} />
      <DetailRing y={1.07} radius={0.23} color={GOLD} />
      {premiumDetail ? (
        <PremiumFinish color={color} height={0.78} radius={0.24} y={0.84} />
      ) : (
        <InternalNeonVein accent={accent} secondary={coreAccent} height={0.98} y={0.83} radius={0.028} />
      )}
      <mesh position={[0, 1.31, 0]}>
        <sphereGeometry args={[0.17, 24, 16]} />
        <PieceMaterial color={color} pieceSet={pieceSet} />
      </mesh>
      <mesh position={[0, 1.59, 0]}>
        <boxGeometry args={[0.1, 0.52, 0.1]} />
        {premiumDetail ? <RoyalTrimMaterial color={GOLD} intensity={0.16} /> : <GlowMaterial color={GOLD} intensity={1.18} />}
      </mesh>
      <mesh position={[0, 1.68, 0]}>
        <boxGeometry args={[0.4, 0.09, 0.09]} />
        {premiumDetail ? <RoyalTrimMaterial color={GOLD} intensity={0.16} /> : <GlowMaterial color={GOLD} intensity={1.18} />}
      </mesh>
      <mesh position={[0, 1.59, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[0.1, 0.34, 0.1]} />
        {premiumDetail ? (
          <RoyalTrimMaterial color={coreAccent} intensity={0.12} />
        ) : (
          <GlowMaterial color={coreAccent} intensity={0.82} />
        )}
      </mesh>
      {!premiumDetail && <CrystalCore y={0.8} color={accent} scale={0.86} />}
    </group>
  );
}

export function ChessPiece3D({
  piece,
  pieceSet,
  onClick,
}: {
  piece: CrystalChessPiece;
  pieceSet?: string;
  onClick: () => void;
}) {
  const sharedProps = { color: piece.color, pieceSet };

  return (
    <group onPointerDown={(event) => {
      event.stopPropagation();
      onClick();
    }} scale={[0.96, 1.04, 0.96]}>
      {piece.kind === 'p' && <PawnPiece {...sharedProps} />}
      {piece.kind === 'r' && <RookPiece {...sharedProps} />}
      {piece.kind === 'n' && <KnightPiece {...sharedProps} />}
      {piece.kind === 'b' && <BishopPiece {...sharedProps} />}
      {piece.kind === 'q' && <QueenPiece {...sharedProps} />}
      {piece.kind === 'k' && <KingPiece {...sharedProps} />}
    </group>
  );
}
