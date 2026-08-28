export const generateCelestialPhoenix = () => {
  const paths: any[] = [];
  const cx = 100, cy = 110;

  // Fiery outer aura
  for (let i = 0; i < 48; i++) {
    const angle = (i * 2 * Math.PI) / 48;
    const r1 = 55, r2 = 82;
    paths.push({
      id: `aura-${i}`,
      d: `M ${cx + Math.cos(angle)*r1} ${cy + Math.sin(angle)*r1} Q ${cx + Math.cos(angle+0.13)*r2} ${cy + Math.sin(angle+0.13)*r2} ${cx + Math.cos(angle+0.26)*r1} ${cy + Math.sin(angle+0.26)*r1} Z`,
      number: (i % 6) + 4,
      center: { x: cx + Math.cos(angle+0.13)*64, y: cy + Math.sin(angle+0.13)*64 }
    });
  }

  // Body
  paths.push({
    id: `body`,
    d: `M 95 85 Q 75 110, 82 145 Q 95 168, 115 155 Q 122 125, 112 95 Z`,
    number: 2,
    center: { x: 98, y: 122 }
  });

  // Head + crest
  paths.push({
    id: `head`,
    d: `M 105 72 Q 118 62, 132 75 Q 128 88, 112 83 Z`,
    number: 1,
    center: { x: 118, y: 76 }
  });

  // Beak
  paths.push({
    id: `beak`,
    d: `M 132 75 L 148 78 L 132 82 Z`,
    number: 8,
    center: { x: 138, y: 78 }
  });

  // Tail stream (long elegant)
  for (let i = 0; i < 7; i++) {
    const baseY = 145 + i * 9;
    paths.push({
      id: `tail-${i}`,
      d: `M 87 ${baseY} Q 55 ${baseY + 18} 32 ${baseY + 45} Q 48 ${baseY + 22} 82 ${baseY + 8} Z`,
      number: 3 + (i % 3),
      center: { x: 58, y: baseY + 24 }
    });
  }

  // Wing feathers
  for (let f = 0; f < 5; f++) {
    const y = 95 + f * 11;
    paths.push({
      id: `wing-l-${f}`,
      d: `M 92 ${y} Q 55 ${y + 8} 38 ${y + 22} Q 62 ${y + 14} 95 ${y + 6} Z`,
      number: 4,
      center: { x: 66, y: y + 13 }
    });
    paths.push({
      id: `wing-r-${f}`,
      d: `M 108 ${y} Q 145 ${y + 8} 165 ${y + 22} Q 142 ${y + 14} 105 ${y + 6} Z`,
      number: 5,
      center: { x: 134, y: y + 13 }
    });
  }

  // Eye
  paths.push({
    id: `eye`,
    d: `M 120 74 A 3 4 0 1 0 120 82 A 3 4 0 1 0 120 74 Z`,
    number: 9,
    center: { x: 120, y: 78 }
  });

  return paths;
};
