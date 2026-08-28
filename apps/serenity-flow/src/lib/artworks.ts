export interface Point {
  x: number;
  y: number;
}

export interface ArtPath {
  id: string;
  d: string;
  number?: number;
  center?: Point;
  mirrorId?: string;
}

export interface Artwork {
  id: string;
  name: string;
  viewBox: string;
  category?: string;
  classicPalette?: string[];
  paths: ArtPath[];
}

function generateMandalaPaths(): ArtPath[] {
  const paths: ArtPath[] = [];
  let pathId = 1;
  const CENTER = { x: 200, y: 200 };
  const NUM_PETALS = 12;
  const RINGS = 8;

  for (let ring = 1; ring <= RINGS; ring++) {
    const innerRadius = (ring - 1) * 20;
    const outerRadius = ring * 20;
    const colorNum = (ring % 6) + 1; // 1 to 6 colors

    // Instead of simple rings, let's make interlocking lotus petals
    const petalCount = NUM_PETALS + (ring > 4 ? NUM_PETALS : 0);
    const angleStep = (Math.PI * 2) / petalCount;

    for (let i = 0; i < petalCount; i++) {
        const startAngle = i * angleStep;
        const endAngle = (i + 1) * angleStep;
        const midAngle = (startAngle + endAngle) / 2;

        // Petal shape
        const p1x = CENTER.x + innerRadius * Math.cos(startAngle);
        const p1y = CENTER.y + innerRadius * Math.sin(startAngle);
        const p2x = CENTER.x + outerRadius * Math.cos(midAngle);
        const p2y = CENTER.y + outerRadius * Math.sin(midAngle);
        const p3x = CENTER.x + innerRadius * Math.cos(endAngle);
        const p3y = CENTER.y + innerRadius * Math.sin(endAngle);

        // Control points to make curves
        const cp1x = CENTER.x + (outerRadius * 0.8) * Math.cos(startAngle + angleStep*0.2);
        const cp1y = CENTER.y + (outerRadius * 0.8) * Math.sin(startAngle + angleStep*0.2);
        const cp2x = CENTER.x + (outerRadius * 0.8) * Math.cos(endAngle - angleStep*0.2);
        const cp2y = CENTER.y + (outerRadius * 0.8) * Math.sin(endAngle - angleStep*0.2);
        const rootCpX = CENTER.x + (innerRadius * 0.5) * Math.cos(midAngle);
        const rootCpY = CENTER.y + (innerRadius * 0.5) * Math.sin(midAngle);

        const d = `M ${p1x} ${p1y} C ${cp1x} ${cp1y}, ${cp1x} ${cp1y}, ${p2x} ${p2y} C ${cp2x} ${cp2y}, ${cp2x} ${cp2y}, ${p3x} ${p3y} C ${rootCpX} ${rootCpY}, ${rootCpX} ${rootCpY}, ${p1x} ${p1y} Z`;

        paths.push({
            id: `mandala-${pathId++}`,
            d,
            number: colorNum,
            center: {
                x: CENTER.x + (innerRadius + 10) * Math.cos(midAngle),
                y: CENTER.y + (innerRadius + 10) * Math.sin(midAngle)
            }
        });
    }
  }
  return paths;
}

function generateStainedGlassPaths(): ArtPath[] {
  const paths: ArtPath[] = [];
  let pathId = 1;
  // A voronoi-like stained glass layout
  const points = [];
  const W = 400, H = 400;

  // Seed random points
  for(let i=0; i<80; i++) {
     points.push({
         x: Math.random() * W,
         y: Math.random() * H
     });
  }

  // Very simplistic stained glass: just connecting points into a web.
  // Actually, generating clean polygons in basic JS without d3 is hard.
  // Let's generate concentric geometric shapes.
  const cx = W/2, cy = H/2;

  // Outer frame
  paths.push({
      id: `sg-${pathId++}`,
      d: `M 10 10 L 390 10 L 390 390 L 10 390 Z M 20 20 L 20 380 L 380 380 L 380 20 Z`,
      number: 8,
      center: {x: 15, y: 15}
  });

  // some nice geometric patterns
  for(let r=0; r<6; r++) {
      const radius = 180 - r*25;
      const numSegments = 16;
      for(let s=0; s<numSegments; s++) {
          const a1 = (Math.PI * 2) * (s / numSegments);
          const a2 = (Math.PI * 2) * ((s+1) / numSegments);
          const innerR = radius - 20;

          const p1x = cx + radius * Math.cos(a1), p1y = cy + radius * Math.sin(a1);
          const p2x = cx + radius * Math.cos(a2), p2y = cy + radius * Math.sin(a2);
          const p3x = cx + innerR * Math.cos(a2), p3y = cy + innerR * Math.sin(a2);
          const p4x = cx + innerR * Math.cos(a1), p4y = cy + innerR * Math.sin(a1);

          paths.push({
              id: `sg-${pathId++}`,
              d: `M ${p1x} ${p1y} L ${p2x} ${p2y} L ${p3x} ${p3y} L ${p4x} ${p4y} Z`,
              number: (r + s) % 7 + 1,
              center: {
                  x: cx + (radius - 10) * Math.cos((a1+a2)/2),
                  y: cy + (radius - 10) * Math.sin((a1+a2)/2)
              }
          });
      }
  }

  return paths;
}

export const ARTWORKS: Artwork[] = [
  {
    id: 'zen-mandala',
    name: 'Zen Mandala',
    viewBox: '0 0 400 400',
    category: 'Geometric',
    classicPalette: ['#f43f5e', '#fb923c', '#fbbf24', '#34d399', '#38bdf8', '#818cf8', '#a78bfa', '#e879f9'],
    paths: generateMandalaPaths()
  },
  {
    id: 'stained-glass-rose',
    name: 'Stained Glass Rose',
    viewBox: '0 0 400 400',
    category: 'Abstract',
    classicPalette: ['#e11d48', '#be185d', '#9d174d', '#fecdd3', '#0ea5e9', '#0284c7', '#0369a1', '#1e293b'],
    paths: generateStainedGlassPaths()
  }
];
