import { CatmullRomCurve3, Vector2, Vector3 } from 'three';

export type PieceKind = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type PieceColor = 'w' | 'b';

export const CYAN = '#38e8ff';
export const GOLD = '#ffd166';
export const GREEN = '#69ff9a';
export const MAGENTA = '#ff4fd8';
export const VIOLET = '#9b5cff';

interface PieceTheme {
  style: 'crystal' | 'metallic' | 'wood';
  white: string;
  black: string;
  whiteGlow?: string;
  blackGlow?: string;
  accent: string;
  roughness?: number;
  metalness?: number;
}

type ProfilePoint = [radius: number, y: number];
type Vec3 = [number, number, number];

export function getPieceTheme(pieceSet = 'fresca') {
  const themes: Record<string, PieceTheme> = {
    premium: {
      style: 'wood',
      white: '#ead3a1',
      black: '#2b1710',
      accent: '#c99a46',
      roughness: 0.68,
    },
    academy_classic: {
      style: 'wood',
      white: '#e8dcc4',
      black: '#1a1a1c',
      accent: GOLD,
      roughness: 0.85,
    },
    academy_patina: {
      style: 'metallic',
      white: '#a3a8ad',
      black: '#1f3c4d',
      accent: '#c86f42',
      metalness: 0.85,
      roughness: 0.35,
    },
    academy_aged: {
      style: 'metallic',
      white: '#9ca3af',
      black: '#4a3728',
      accent: '#1a1a1a',
      metalness: 0.9,
      roughness: 0.45,
    },
    alpha: {
      style: 'crystal',
      white: '#eefcff',
      black: '#111a46',
      whiteGlow: CYAN,
      blackGlow: '#4f8cff',
      accent: '#7dd3fc',
    },
    california: {
      style: 'crystal',
      white: '#f7fbff',
      black: '#10172a',
      whiteGlow: '#93f4ff',
      blackGlow: '#60a5fa',
      accent: '#38bdf8',
    },
    cburnett: {
      style: 'crystal',
      white: '#ffffff',
      black: '#080a18',
      whiteGlow: '#dbeafe',
      blackGlow: MAGENTA,
      accent: VIOLET,
    },
    fresca: {
      style: 'crystal',
      white: '#ecfeff',
      black: '#111827',
      whiteGlow: CYAN,
      blackGlow: MAGENTA,
      accent: GREEN,
    },
    merida: {
      style: 'crystal',
      white: '#fff7d6',
      black: '#24140f',
      whiteGlow: '#facc15',
      blackGlow: '#fb7185',
      accent: '#f59e0b',
    },
    staunty: {
      style: 'crystal',
      white: '#fffbe6',
      black: '#18181b',
      whiteGlow: '#fde68a',
      blackGlow: VIOLET,
      accent: '#c084fc',
    },
  };

  return themes[pieceSet] ?? themes.fresca;
}

export function pieceAccent(color: PieceColor, pieceSet?: string) {
  const theme = getPieceTheme(pieceSet);

  return color === 'w' ? theme.whiteGlow ?? theme.accent : theme.blackGlow ?? theme.accent;
}

export function pieceCoreAccent(pieceSet?: string) {
  return getPieceTheme(pieceSet).accent;
}

export function usesPremiumDetails(pieceSet?: string) {
  return getPieceTheme(pieceSet).style !== 'crystal';
}

export function PieceMaterial({ color, pieceSet }: { color: PieceColor; pieceSet?: string }) {
  const theme = getPieceTheme(pieceSet);

  if (theme.style === 'metallic') return <MetallicMaterial color={color} pieceSet={pieceSet} />;
  if (theme.style === 'wood') return <WoodMaterial color={color} pieceSet={pieceSet} />;

  return <CrystalMaterial color={color} pieceSet={pieceSet} />;
}

export function MetallicMaterial({ color, pieceSet }: { color: PieceColor; pieceSet?: string }) {
  const theme = getPieceTheme(pieceSet);
  const isWhite = color === 'w';

  return (
    <meshStandardMaterial
      color={isWhite ? theme.white : theme.black}
      emissive={isWhite ? '#e8f1f4' : theme.accent}
      emissiveIntensity={isWhite ? 0.015 : 0.025}
      envMapIntensity={2.5}
      metalness={theme.metalness ?? 0.85}
      roughness={theme.roughness ?? 0.35}
    />
  );
}

export function WoodMaterial({ color, pieceSet }: { color: PieceColor; pieceSet?: string }) {
  const theme = getPieceTheme(pieceSet);
  const isWhite = color === 'w';

  return (
    <meshStandardMaterial
      color={isWhite ? theme.white : theme.black}
      emissive={isWhite ? '#8a642a' : '#2b1308'}
      emissiveIntensity={isWhite ? 0.018 : 0.03}
      metalness={0.05}
      roughness={theme.roughness ?? 0.85}
    />
  );
}

export function CrystalMaterial({
  color,
  pieceSet,
}: {
  color: PieceColor;
  pieceSet?: string;
}) {
  const theme = getPieceTheme(pieceSet);
  const isWhite = color === 'w';

  return (
    <meshPhysicalMaterial
      color={isWhite ? theme.white : theme.black}
      emissive={isWhite ? theme.whiteGlow ?? CYAN : theme.blackGlow ?? MAGENTA}
      emissiveIntensity={isWhite ? 0.34 : 0.48}
      metalness={0.01}
      roughness={0.035}
      transmission={0.72}
      thickness={1.15}
      transparent
      opacity={isWhite ? 0.66 : 0.58}
      clearcoat={1}
      clearcoatRoughness={0.02}
      ior={1.56}
      specularIntensity={1.5}
      envMapIntensity={2.15}
    />
  );
}

export function CrystalProfile({
  color,
  pieceSet,
  points,
  position = [0, 0, 0],
  scale = [1, 1, 1],
  segments = 48,
}: {
  color: PieceColor;
  pieceSet?: string;
  points: ProfilePoint[];
  position?: Vec3;
  scale?: Vec3;
  segments?: number;
}) {
  return (
    <mesh position={position} scale={scale}>
      <latheGeometry args={[points.map(([radius, y]) => new Vector2(radius, y)), segments]} />
      <PieceMaterial color={color} pieceSet={pieceSet} />
    </mesh>
  );
}

export function GlowMaterial({
  color,
  intensity = 0.55,
}: {
  color: string;
  intensity?: number;
}) {
  return (
    <meshStandardMaterial
      color={color}
      emissive={color}
      emissiveIntensity={intensity}
      metalness={0.25}
      roughness={0.22}
    />
  );
}

export function RoyalTrimMaterial({ color = GOLD, intensity = 0.08 }: { color?: string; intensity?: number }) {
  return (
    <meshStandardMaterial
      color={color}
      emissive={color}
      emissiveIntensity={intensity}
      metalness={0.82}
      roughness={0.18}
    />
  );
}

export function AccentMaterial({
  color,
  intensity = 1.05,
}: {
  color: string;
  intensity?: number;
}) {
  return (
    <meshStandardMaterial
      color={color}
      emissive={color}
      emissiveIntensity={intensity}
      metalness={0.08}
      roughness={0.16}
      transparent
      opacity={0.9}
    />
  );
}

export function DetailRing({
  y,
  radius,
  color,
  tilt = 0,
}: {
  y: number;
  radius: number;
  color: string;
  tilt?: number;
}) {
  return (
    <mesh position={[0, y, 0]} rotation={[Math.PI / 2 + tilt, 0, 0]}>
      <torusGeometry args={[radius, 0.014, 12, 64]} />
      <GlowMaterial color={color} intensity={0.95} />
    </mesh>
  );
}

export function FacetBand({
  accent,
  count = 8,
  height,
  radius,
  y,
}: {
  accent: string;
  count?: number;
  height: number;
  radius: number;
  y: number;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => {
        const angle = (Math.PI * 2 * index) / count;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        return (
          <mesh key={angle} position={[x, y, z]} rotation={[0, -angle, 0]}>
            <boxGeometry args={[0.016, height, 0.025]} />
            <AccentMaterial color={accent} intensity={0.78} />
          </mesh>
        );
      })}
    </>
  );
}

export function RoyalTrimRing({
  y,
  radius,
  color = GOLD,
  thickness = 0.018,
}: {
  y: number;
  radius: number;
  color?: string;
  thickness?: number;
}) {
  return (
    <mesh position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, thickness, 12, 72]} />
      <RoyalTrimMaterial color={color} />
    </mesh>
  );
}

export function SurfaceGrain({
  color,
  count = 8,
  height,
  radius,
  y,
}: {
  color: string;
  count?: number;
  height: number;
  radius: number;
  y: number;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => {
        const angle = (Math.PI * 2 * index) / count;
        const curve = new CatmullRomCurve3([
          new Vector3(Math.cos(angle) * radius, -height / 2, Math.sin(angle) * radius),
          new Vector3(Math.cos(angle + 0.08) * radius, -height * 0.18, Math.sin(angle + 0.08) * radius),
          new Vector3(Math.cos(angle - 0.06) * radius, height * 0.16, Math.sin(angle - 0.06) * radius),
          new Vector3(Math.cos(angle + 0.04) * radius, height / 2, Math.sin(angle + 0.04) * radius),
        ]);

        return (
          <mesh key={angle} position={[0, y, 0]}>
            <tubeGeometry args={[curve, 24, 0.006, 6, false]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.03}
              metalness={0.18}
              roughness={0.42}
              transparent
              opacity={0.58}
            />
          </mesh>
        );
      })}
    </>
  );
}

export function CrystalCore({
  y,
  color,
  scale = 1,
}: {
  y: number;
  color: string;
  scale?: number;
}) {
  return (
    <mesh position={[0, y, 0]} scale={[scale, scale, scale]}>
      <octahedronGeometry args={[0.12, 0]} />
      <GlowMaterial color={color} intensity={1.1} />
    </mesh>
  );
}

export function InternalNeonVein({
  accent,
  secondary = accent,
  height,
  y,
  radius = 0.024,
}: {
  accent: string;
  secondary?: string;
  height: number;
  y: number;
  radius?: number;
}) {
  const centerCurve = new CatmullRomCurve3([
    new Vector3(0, -height / 2, 0),
    new Vector3(0.045, -height * 0.18, 0.035),
    new Vector3(-0.035, height * 0.16, -0.025),
    new Vector3(0.015, height / 2, 0.015),
  ]);
  const leftCurve = new CatmullRomCurve3([
    new Vector3(-0.055, -height * 0.34, 0.035),
    new Vector3(0.025, -height * 0.08, -0.035),
    new Vector3(-0.03, height * 0.28, 0.03),
  ]);
  const rightCurve = new CatmullRomCurve3([
    new Vector3(0.06, -height * 0.3, -0.025),
    new Vector3(-0.025, height * 0.02, 0.04),
    new Vector3(0.04, height * 0.32, -0.035),
  ]);

  return (
    <group position={[0, y, 0]}>
      <mesh>
        <tubeGeometry args={[centerCurve, 42, radius, 10, false]} />
        <GlowMaterial color={accent} intensity={1.28} />
      </mesh>
      <mesh>
        <tubeGeometry args={[leftCurve, 26, radius * 0.62, 8, false]} />
        <GlowMaterial color={secondary} intensity={0.92} />
      </mesh>
      <mesh>
        <tubeGeometry args={[rightCurve, 26, radius * 0.58, 8, false]} />
        <GlowMaterial color={secondary} intensity={0.86} />
      </mesh>
    </group>
  );
}

export function GlassFacetShard({
  accent,
  position,
  rotation,
  scale = [1, 1, 1],
}: {
  accent: string;
  position: Vec3;
  rotation: Vec3;
  scale?: Vec3;
}) {
  return (
    <mesh position={position} rotation={rotation} scale={scale}>
      <octahedronGeometry args={[0.075, 0]} />
      <AccentMaterial color={accent} intensity={0.74} />
    </mesh>
  );
}

export function VerticalLines({
  accent,
  height,
  radius,
  y,
  count = 4,
}: {
  accent: string;
  height: number;
  radius: number;
  y: number;
  count?: number;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, index) => {
        const angle = (Math.PI * 2 * index) / count;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        return (
          <mesh key={angle} position={[x, y, z]} rotation={[0, -angle, 0]}>
            <boxGeometry args={[0.018, height, 0.018]} />
            <GlowMaterial color={accent} intensity={0.86} />
          </mesh>
        );
      })}
    </>
  );
}
