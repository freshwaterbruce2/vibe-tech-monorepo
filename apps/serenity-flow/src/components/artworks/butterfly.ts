export const generateMajesticButterfly = () => {
  const paths: any[] = [];
  const cx = 100;
  let idCounter = 1;

  const flipX = (val: number, isRight: boolean) => isRight ? cx + (cx - val) : val;

  const pushSymm = (id: string, dLeft: string, dRight: string, num: number, centerLeft: {x: number, y: number}) => {
    paths.push({ id: `ul-${idCounter++}-${id}`, d: dLeft, number: num, center: centerLeft });
    paths.push({ id: `ur-${idCounter++}-${id}`, d: dRight, number: num, center: { x: cx + (cx - centerLeft.x), y: centerLeft.y } });
  };

  // Elaborate Background Zenscape (mandalic floral sunburst behind butterfly)
  const cyBg = 90;
  for (let i = 0; i < 20; i++) {
    const angle = (i * Math.PI * 2) / 20;
    const nextAngle = ((i + 1) * Math.PI * 2) / 20;
    const r1 = 30; const r2 = 120;

    // Background ray
    paths.push({
      id: `bg-ray-${i}`,
      d: `M ${cx + Math.cos(angle)*r1} ${cyBg + Math.sin(angle)*r1} Q ${cx + Math.cos((angle+nextAngle)/2)*r2*0.6} ${cyBg + Math.sin((angle+nextAngle)/2)*r2*0.6} ${cx + Math.cos(nextAngle)*r1} ${cyBg + Math.sin(nextAngle)*r1} Q ${cx + Math.cos((angle+nextAngle)/2)*20} ${cyBg + Math.sin((angle+nextAngle)/2)*20} ${cx + Math.cos(angle)*r1} ${cyBg + Math.sin(angle)*r1} Z`,
      number: 8,
      center: { x: cx + Math.cos((angle+nextAngle)/2)*50, y: cyBg + Math.sin((angle+nextAngle)/2)*50 }
    });

    // Ray accent dot
    if (i % 2 === 0) {
       const px = cx + Math.cos(angle)* (r2-15);
       const py = cyBg + Math.sin(angle)* (r2-15);
       paths.push({
          id: `bg-dot-${i}`,
          d: `M ${px} ${py-1.5} A 1.5 1.5 0 1 1 ${px} ${py+1.5} A 1.5 1.5 0 1 1 ${px} ${py-1.5} Z`,
          number: 7, center: {x: px, y: py}
       });
    }
  }

  // Elegant tapered body with inner compartments
  paths.push({
    id: `body-main`,
    d: `M 98 35 C 93 15, 107 15, 102 35 C 105 60, 106 120, 101 150 C 100 165, 100 165, 99 150 C 94 120, 95 60, 98 35 Z`,
    number: 1,
    center: { x: 100, y: 80 }
  });

  // Segmented inner body detailing (dense)
  for (let i = 0; i < 18; i++) {
     const yCenter = 40 + i * 6;
     paths.push({
        id: `body-seg-${i}`,
        d: `M 97 ${yCenter-1.5} Q 100 ${yCenter+3} 103 ${yCenter-1.5} Q 100 ${yCenter} 97 ${yCenter-1.5} Z`,
        number: 2,
        center: { x: 100, y: yCenter }
     });
  }

  // Graceful sweeping antennae (multiple curled loops)
  paths.push({
    id: `ant-l`,
    d: `M 98 25 C 90 2, 70 -5, 55 12 C 45 22, 60 28, 65 20 C 75 5, 90 12, 95 26 Z`,
    number: 1, center: { x: 75, y: 15 }
  });
  paths.push({
    id: `ant-r`,
    d: `M 102 25 C 110 2, 130 -5, 145 12 C 155 22, 140 28, 135 20 C 125 5, 110 12, 105 26 Z`,
    number: 1, center: { x: 125, y: 15 }
  });

  // Sweeping Upper Wings base (closed)
  pushSymm('base-up',
    `M 97 40 C 65 -5, -5 -15, -12 35 C -18 85, 0 135, 25 145 C 65 160, 85 100, 97 60 Z`,
    `M 103 40 C 135 -5, 205 -15, 212 35 C 218 85, 200 135, 175 145 C 135 160, 115 100, 103 60 Z`,
    2, { x: 35, y: 60 }
  );

  // Sweeping Lower Wings base (closed)
  pushSymm('base-low',
    `M 96 75 C 60 75, 10 100, -5 165 C -15 225, 35 245, 75 220 C 95 205, 95 130, 98 95 Z`,
    `M 104 75 C 140 75, 190 100, 205 165 C 215 225, 165 245, 125 220 C 105 205, 105 130, 102 95 Z`,
    3, { x: 45, y: 170 }
  );

  // Extremely dense and organic looping scales inside the wings (Zentangle cells)
  const addDenseZentangleCells = (centerX: number, centerY: number, maxRadius: number, rings: number, wingCls: string, baseColor: number) => {
    for (let r = 0; r < rings; r++) {
      const radius = maxRadius - r * 14;
      if (radius <= 6) break;

      const count = Math.floor(radius * 0.5) + 3; // Ultra dense count
      for (let i = 0; i < count; i++) {
        const t = i / count;
        const angle = t * Math.PI * 2 + (r * 0.4);
        const l = radius;
        const width = (Math.PI * 2 * (r * 14 + 6)) / count * 0.45;

        const px = centerX + Math.cos(angle) * (r * 14 + 6);
        const py = centerY + Math.sin(angle) * (r * 14 + 6);

        const tipX = px + Math.cos(angle) * (l * 0.85);
        const tipY = py + Math.sin(angle) * (l * 0.85);

        const cp1x = px + Math.cos(angle - width*0.06) * l * 0.5;
        const cp1y = py + Math.sin(angle - width*0.06) * l * 0.5;

        const cp2x = px + Math.cos(angle + width*0.06) * l * 0.5;
        const cp2y = py + Math.sin(angle + width*0.06) * l * 0.5;

        // Outer wing cell layer
        paths.push({
          id: `${wingCls}-cell-${r}-${i}`,
          d: `M ${px} ${py} Q ${cp1x} ${cp1y} ${tipX} ${tipY} Q ${cp2x} ${cp2y} ${px} ${py} Z`,
          number: baseColor + (i % 3),
          center: { x: px + (tipX - px) * 0.5, y: py + (tipY - py) * 0.5 }
        });
      }
    }
  };

  // Apply dense cells to both wings
  addDenseZentangleCells(50, 95, 85, 6, 'left-upper', 3);
  addDenseZentangleCells(150, 95, 85, 6, 'right-upper', 4);
  addDenseZentangleCells(55, 165, 70, 5, 'left-lower', 5);
  addDenseZentangleCells(145, 165, 70, 5, 'right-lower', 6);

  return paths;
};
