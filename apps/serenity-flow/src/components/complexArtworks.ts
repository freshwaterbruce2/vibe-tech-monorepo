export const generateDetailedMandala = () => {
  const paths: any[] = [];
  const cx = 100, cy = 100;
  let idCounter = 1;

  const p = (d: string, color: number, cntX: number, cntY: number) => {
      paths.push({ id: `man-${idCounter++}`, d, number: color, center: { x: cntX, y: cntY } });
  };

  // Dense intricate center core
  for (let i = 0; i < 32; i++) {
    const angle = (i * 360 / 32) * Math.PI / 180;
    const nextAngle = ((i + 1) * 360 / 32) * Math.PI / 180;
    const r1 = 3; const r2 = 12; const r3 = 22;

    p(`M ${cx + Math.cos(angle)*r1} ${cy + Math.sin(angle)*r1} L ${cx + Math.cos(angle + Math.PI/32)*r2} ${cy + Math.sin(angle + Math.PI/32)*r2} L ${cx + Math.cos(nextAngle)*r1} ${cy + Math.sin(nextAngle)*r1} Z`, 1, cx + Math.cos(angle + Math.PI/32)*r2*0.6, cy + Math.sin(angle + Math.PI/32)*r2*0.6);

    if (i % 2 === 0) {
        const aCenter = (angle + nextAngle)/2;
        p(`M ${cx + Math.cos(angle)*r2} ${cy + Math.sin(angle)*r2} L ${cx + Math.cos(aCenter)*r3} ${cy + Math.sin(aCenter)*r3} L ${cx + Math.cos(nextAngle)*r2} ${cy + Math.sin(nextAngle)*r2} Z`, 2, cx + Math.cos(aCenter)*r3*0.8, cy + Math.sin(aCenter)*r3*0.8);

        // Inner diamond accent
        p(`M ${cx + Math.cos(aCenter)*r3*0.5} ${cy + Math.sin(aCenter)*r3*0.5} L ${cx + Math.cos(aCenter)*r3*0.7} ${cy + Math.sin(aCenter)*r3*0.7} L ${cx + Math.cos(aCenter)*r3*0.6} ${cy + Math.sin(aCenter)*r3*0.9} Z`, 3, cx + Math.cos(aCenter)*r3*0.6, cy + Math.sin(aCenter)*r3*0.7);
    }
  }

  // Highly dense rings with internal zentangle subdivisions
  const generateZentangleRing = (rings: number, startRadius: number, length: number, widthFactor: number, colorShift: number) => {
    for (let i = 0; i < rings; i++) {
        const angle = (i * (360 / rings)) * Math.PI / 180;

        const baseAx = cx + startRadius * Math.cos(angle - widthFactor);
        const baseAy = cy + startRadius * Math.sin(angle - widthFactor);
        const baseBx = cx + startRadius * Math.cos(angle + widthFactor);
        const baseBy = cy + startRadius * Math.sin(angle + widthFactor);

        const tipX = cx + (startRadius + length) * Math.cos(angle);
        const tipY = cy + (startRadius + length) * Math.sin(angle);

        const cp1x = cx + (startRadius + length*0.6) * Math.cos(angle - widthFactor*1.8);
        const cp1y = cy + (startRadius + length*0.6) * Math.sin(angle - widthFactor*1.8);
        const cp2x = cx + (startRadius + length*0.6) * Math.cos(angle + widthFactor*1.8);
        const cp2y = cy + (startRadius + length*0.6) * Math.sin(angle + widthFactor*1.8);

        // 1. Main outer shell
        p(`M ${baseAx} ${baseAy} Q ${cp1x} ${cp1y} ${tipX} ${tipY} Q ${cp2x} ${cp2y} ${baseBx} ${baseBy} Z`, (colorShift % 8) + 1, cx + (startRadius + length*0.7) * Math.cos(angle), cy + (startRadius + length*0.7) * Math.sin(angle));

        // 2. Inner segmented shape (creates an outline border effect)
        const inA_X = baseAx*0.9 + baseBx*0.1;
        const inA_Y = baseAy*0.9 + baseBy*0.1;
        const inB_X = baseBx*0.9 + baseAx*0.1;
        const inB_Y = baseBy*0.9 + baseAy*0.1;
        const inTipX = cx + (startRadius + length*0.8) * Math.cos(angle);
        const inTipY = cy + (startRadius + length*0.8) * Math.sin(angle);
        const inCp1x = cx + (startRadius + length*0.5) * Math.cos(angle - widthFactor*1.2);
        const inCp1y = cy + (startRadius + length*0.5) * Math.sin(angle - widthFactor*1.2);
        const inCp2x = cx + (startRadius + length*0.5) * Math.cos(angle + widthFactor*1.2);
        const inCp2y = cy + (startRadius + length*0.5) * Math.sin(angle + widthFactor*1.2);

        p(`M ${inA_X} ${inA_Y} Q ${inCp1x} ${inCp1y} ${inTipX} ${inTipY} Q ${inCp2x} ${inCp2y} ${inB_X} ${inB_Y} Z`, ((colorShift + 1) % 8) + 1, cx + (startRadius + length*0.4) * Math.cos(angle), cy + (startRadius + length*0.4) * Math.sin(angle));

        // 3. Deep inner core drop
        const coreTipX = cx + (startRadius + length*0.5) * Math.cos(angle);
        const coreTipY = cy + (startRadius + length*0.5) * Math.sin(angle);
        p(`M ${baseAx*0.8 + baseBx*0.2} ${baseAy*0.8 + baseBy*0.2} Q ${cx + (startRadius + length*0.2)*Math.cos(angle - widthFactor*0.6)} ${cy + (startRadius + length*0.2)*Math.sin(angle - widthFactor*0.6)} ${coreTipX} ${coreTipY} Q ${cx + (startRadius + length*0.2)*Math.cos(angle + widthFactor*0.6)} ${cy + (startRadius + length*0.2)*Math.sin(angle + widthFactor*0.6)} ${baseBx*0.8 + baseAx*0.2} ${baseBy*0.8 + baseAy*0.2} Z`, ((colorShift + 2) % 8) + 1, cx + (startRadius + length*0.3) * Math.cos(angle), cy + (startRadius + length*0.3) * Math.sin(angle));

        // 4. Dot details between items
        if (rings <= 64) {
            const bAngle = angle + (180 / rings) * Math.PI / 180;
            const rDot = startRadius + length*0.1;
            const dx = cx + Math.cos(bAngle)*rDot; const dy = cy + Math.sin(bAngle)*rDot;
            p(`M ${dx} ${dy-1.5} A 1.5 1.5 0 1 1 ${dx} ${dy+1.5} A 1.5 1.5 0 1 1 ${dx} ${dy-1.5} Z`, 9, dx, dy);

            const diaR = startRadius + length*0.85;
            const diaX = cx + Math.cos(bAngle)*diaR; const diaY = cy + Math.sin(bAngle)*diaR;
            p(`M ${diaX} ${diaY-3} L ${diaX+2} ${diaY} L ${diaX} ${diaY+3} L ${diaX-2} ${diaY} Z`, 8, diaX, diaY);
        }
    }
  };

  generateZentangleRing(24, 22, 22, 0.13, 1);
  generateZentangleRing(36, 44, 28, 0.08, 3);
  generateZentangleRing(48, 72, 34, 0.06, 5);
  generateZentangleRing(64, 106, 38, 0.04, 7);

  // Elaborate outer mandalic lace border
  for (let i = 0; i < 64; i++) {
    const angle = (i * (360 / 64)) * Math.PI / 180;
    const nextAngle = ((i + 1) * (360 / 64)) * Math.PI / 180;
    const midAngle = (angle + nextAngle) / 2;

    const r = 144;
    const x1 = cx + r * Math.cos(angle);
    const y1 = cy + r * Math.sin(angle);
    const x2 = cx + r * Math.cos(nextAngle);
    const y2 = cy + r * Math.sin(nextAngle);

    // Outer arch
    p(`M ${x1} ${y1} Q ${cx + 158 * Math.cos(midAngle)} ${cy + 158 * Math.sin(midAngle)} ${x2} ${y2} Q ${cx + 140 * Math.cos(midAngle)} ${cy + 140 * Math.sin(midAngle)} ${x1} ${y1} Z`, 4, cx + 148 * Math.cos(midAngle), cy + 148 * Math.sin(midAngle));

    // Inner arch detailed slice
    p(`M ${x1} ${y1} Q ${cx + 153 * Math.cos(midAngle)} ${cy + 153 * Math.sin(midAngle)} ${x2} ${y2} Q ${cx + 143 * Math.cos(midAngle)} ${cy + 143 * Math.sin(midAngle)} ${x1} ${y1} Z`, 5, cx + 146 * Math.cos(midAngle), cy + 146 * Math.sin(midAngle));

    // Outer prominent spike
    if (i % 2 === 0) {
        p(`M ${cx + 154 * Math.cos(midAngle)} ${cy + 154 * Math.sin(midAngle)} L ${cx + 170 * Math.cos(midAngle)} ${cy + 170 * Math.sin(midAngle)} L ${cx + 158 * Math.cos(nextAngle)} ${cy + 158 * Math.sin(nextAngle)} Z`, 6, cx + 160 * Math.cos(midAngle + 0.02), cy + 160 * Math.sin(midAngle + 0.02));

        // Spike inner facet
        p(`M ${cx + 156 * Math.cos(midAngle)} ${cy + 156 * Math.sin(midAngle)} L ${cx + 166 * Math.cos(midAngle)} ${cy + 166 * Math.sin(midAngle)} L ${cx + 157 * Math.cos(nextAngle-0.02)} ${cy + 157 * Math.sin(nextAngle-0.02)} Z`, 7, cx + 160 * Math.cos(midAngle + 0.01), cy + 160 * Math.sin(midAngle + 0.01));
    }

    const tpx = cx + 175 * Math.cos(angle);
    const tpy = cy + 175 * Math.sin(angle);
    p(`M ${tpx} ${tpy-1.5} A 1.5 1.5 0 1 1 ${tpx} ${tpy+1.5} A 1.5 1.5 0 1 1 ${tpx} ${tpy-1.5} Z`, 8, tpx, tpy);
  }

  return paths;
};

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
        pushSymm(`scale-${wingCls}-${r}-${i}`,
          `M ${px} ${py} Q ${cp1x} ${cp1y} ${tipX} ${tipY} Q ${cp2x} ${cp2y} ${px} ${py} Z`,
          `M ${flipX(px, true)} ${py} Q ${flipX(cp1x, true)} ${cp1y} ${flipX(tipX, true)} ${tipY} Q ${flipX(cp2x, true)} ${cp2y} ${flipX(px, true)} ${py} Z`,
          baseColor + (i % 4),
          { x: px + Math.cos(angle) * l * 0.4, y: py + Math.sin(angle) * l * 0.4 }
        );

        // Inner Wing cell detail (Zentangle ring inside ring)
        if (l > 15) {
            const inTipX = px + Math.cos(angle) * (l * 0.7);
            const inTipY = py + Math.sin(angle) * (l * 0.7);
            const inPx = px + Math.cos(angle) * (l * 0.1);
            const inPy = py + Math.sin(angle) * (l * 0.1);
            pushSymm(`scale-in-${wingCls}-${r}-${i}`,
              `M ${inPx} ${inPy} Q ${cp1x*0.9+px*0.1} ${cp1y*0.9+py*0.1} ${inTipX} ${inTipY} Q ${cp2x*0.9+px*0.1} ${cp2y*0.9+py*0.1} ${inPx} ${inPy} Z`,
              `M ${flipX(inPx, true)} ${inPy} Q ${flipX(cp1x*0.9+px*0.1, true)} ${cp1y*0.9+py*0.1} ${flipX(inTipX, true)} ${inTipY} Q ${flipX(cp2x*0.9+px*0.1, true)} ${cp2y*0.9+py*0.1} ${flipX(inPx, true)} ${inPy} Z`,
              ((baseColor + (i % 4)) % 8) + 1,
              { x: inPx + Math.cos(angle) * l * 0.3, y: inPy + Math.sin(angle) * l * 0.3 }
            );
        }
      }
    }
  };

  addDenseZentangleCells(35, 60, 50, 5, 'up-c1', 4);
  addDenseZentangleCells(20, 100, 25, 3, 'up-c2', 5);
  addDenseZentangleCells(35, 170, 45, 4, 'low-c1', 6);
  addDenseZentangleCells(10, 140, 25, 3, 'low-c2', 7);

  // Intricate lace border dots (dense edges along wings)
  const addEdgeDots = (cx1: number, cy1: number, cx2: number, cy2: number, count: number, wingCls: string) => {
      for (let i=0; i<count; i++) {
          const t = i / (count-1);
          const qx = cx1 + (cx2 - cx1) * t + Math.sin(Math.PI*t) * -25;
          const qy = cy1 + (cy2 - cy1) * t + Math.sin(Math.PI*t) * 15;

          pushSymm(`edge-dot-${wingCls}-${i}`,
            `M ${qx} ${qy-2} A 2 2 0 1 1 ${qx} ${qy+2} A 2 2 0 1 1 ${qx} ${qy-2} Z`,
            `M ${flipX(qx, true)} ${qy-2} A 2 2 0 1 1 ${flipX(qx, true)} ${qy+2} A 2 2 0 1 1 ${flipX(qx, true)} ${qy-2} Z`,
            8,
            {x: qx, y:qy}
          );
      }
  }

  addEdgeDots(-8, 50, 25, 140, 22, 'up-edge');
  addEdgeDots(-12, 160, 70, 215, 18, 'low-edge');

  return paths;
};

export const generateStellarLotus = () => {
  const paths: any[] = [];
  const cx = 100, cy = 100;
  let idCounter = 1;

  // Background intricate geometric mandala ripples
  for (let rLevel = 0; rLevel < 8; rLevel++) {
      const radius = 60 + rLevel * 20;
      const count = 16 + rLevel * 8;
      for (let i = 0; i < count; i++) {
          const angle = (i * Math.PI * 2) / count + (rLevel * 0.1);
          const px = cx + Math.cos(angle) * radius;
          const py = cy + Math.sin(angle) * radius;
          const pxN = cx + Math.cos(angle + (Math.PI*2)/count) * radius;
          const pyN = cy + Math.sin(angle + (Math.PI*2)/count) * radius;
          const inX = cx + Math.cos(angle + Math.PI/count) * (radius - 8);
          const inY = cy + Math.sin(angle + Math.PI/count) * (radius - 8);

          paths.push({
             id: `bg-ripple-${idCounter++}`,
             d: `M ${px} ${py} L ${inX} ${inY} L ${pxN} ${pyN} Q ${cx + Math.cos(angle + Math.PI/count) * (radius+4)} ${cy + Math.sin(angle + Math.PI/count) * (radius+4)} ${px} ${py} Z`,
             number: 8,
             center: { x: cx + Math.cos(angle + Math.PI/count) * (radius-2), y: cy + Math.sin(angle + Math.PI/count) * (radius-2) }
          });
      }
  }

  // Bloom petals - extremely dense, thin layers overlapping
  for (let layer = 0; layer < 9; layer++) {
    const petals = 12 + layer * 6;
    const radius = 18 + layer * 16;
    const innerRadius = Math.max(5, layer * 12);

    for (let i = 0; i < petals; i++) {
      const angle = (i * 2 * Math.PI) / petals + (layer * Math.PI / petals);
      const x1 = cx + Math.cos(angle - 0.12) * innerRadius;
      const y1 = cy + Math.sin(angle - 0.12) * innerRadius;
      const x2 = cx + Math.cos(angle + 0.12) * innerRadius;
      const y2 = cy + Math.sin(angle + 0.12) * innerRadius;

      const tipX = cx + Math.cos(angle) * (radius + 20);
      const tipY = cy + Math.sin(angle) * (radius + 20);

      const cp1x = cx + Math.cos(angle - 0.35) * (radius * 0.5 + innerRadius);
      const cp1y = cy + Math.sin(angle - 0.35) * (radius * 0.5 + innerRadius);
      const cp2x = cx + Math.cos(angle - 0.08) * (radius + 8);
      const cp2y = cy + Math.sin(angle - 0.08) * (radius + 8);

      const cp3x = cx + Math.cos(angle + 0.08) * (radius + 8);
      const cp3y = cy + Math.sin(angle + 0.08) * (radius + 8);
      const cp4x = cx + Math.cos(angle + 0.35) * (radius * 0.5 + innerRadius);
      const cp4y = cy + Math.sin(angle + 0.35) * (radius * 0.5 + innerRadius);

      paths.push({
        id: `lotus-l${layer}-p${i}`,
        d: `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${tipX} ${tipY} C ${cp3x} ${cp3y}, ${cp4x} ${cp4y}, ${x2} ${y2} Z`,
        number: (layer % 5) + 1,
        center: { x: cx + Math.cos(angle) * (radius * 0.8), y: cy + Math.sin(angle) * (radius * 0.8) }
      });

      // Vein details - perfectly closed inner tapered brush strokes
      const vX1 = cx + Math.cos(angle) * (innerRadius + 8);
      const vY1 = cy + Math.sin(angle) * (innerRadius + 8);
      const vTipX = tipX * 0.75 + cx * 0.25;
      const vTipY = tipY * 0.75 + cy * 0.25;

      const vCp1x = cx + Math.cos(angle - 0.06) * (radius * 0.55);
      const vCp1y = cy + Math.sin(angle - 0.06) * (radius * 0.55);
      const vCp2x = cx + Math.cos(angle + 0.03) * (radius * 0.65);
      const vCp2y = cy + Math.sin(angle + 0.03) * (radius * 0.65);

      paths.push({
        id: `lotus-l${layer}-v${i}`,
        d: `M ${vX1} ${vY1} Q ${vCp1x} ${vCp1y} ${vTipX} ${vTipY} Q ${vCp2x} ${vCp2y} ${vX1 + Math.cos(angle+Math.PI/2)*2} ${vY1 + Math.sin(angle+Math.PI/2)*2} Z`,
        number: 6,
        center: { x: cx + Math.cos(angle) * (innerRadius + Math.abs(tipX - vX1)*0.5), y: cy + Math.sin(angle) * (innerRadius + Math.abs(tipY - vY1)*0.5) }
      });

      // Added micro vein
      if (layer > 2) {
          const mTipX = tipX * 0.5 + cx * 0.5;
          const mTipY = tipY * 0.5 + cy * 0.5;
          paths.push({
             id: `lotus-m-l${layer}-v${i}`,
             d: `M ${vX1} ${vY1} Q ${cx + Math.cos(angle - 0.03)*(radius*0.3)} ${cy + Math.sin(angle - 0.03)*(radius*0.3)} ${mTipX} ${mTipY} Q ${cx + Math.cos(angle + 0.02)*(radius*0.3)} ${cy + Math.sin(angle + 0.02)*(radius*0.3)} ${vX1 + Math.cos(angle+Math.PI/2)*1} ${vY1 + Math.sin(angle+Math.PI/2)*1} Z`,
             number: 7,
             center: { x: (vX1 + mTipX)/2, y: (vY1 + mTipY)/2 }
          });
      }
    }
  }

  // Impossibly precise dense center seeds in a fibonacci spiral
  const phi = (Math.sqrt(5) + 1) / 2;
  const goldenAngle = (2 - phi) * 2 * Math.PI;
  for (let i = 1; i < 90; i++) {
        const radius = Math.sqrt(i) * 2.2;
        const angle = i * goldenAngle;

        const px = cx + Math.cos(angle) * radius;
        const py = cy + Math.sin(angle) * radius;
        const tipX = cx + Math.cos(angle) * (radius + 2.5);
        const tipY = cy + Math.sin(angle) * (radius + 2.5);

        paths.push({
          id: `fibo-seed-${i}`,
          d: `M ${px} ${py} Q ${px - Math.cos(angle-Math.PI/2)*1.2} ${py - Math.sin(angle-Math.PI/2)*1.2} ${tipX} ${tipY} Q ${px + Math.cos(angle-Math.PI/2)*1.2} ${py + Math.sin(angle-Math.PI/2)*1.2} ${px} ${py} Z`,
          number: 9,
          center: { x: (px + tipX)/2, y: (py + tipY)/2 }
        });
  }

  // Very center swirl - closed loop
  paths.push({
    id: `center-swirl`,
    d: `M ${cx} ${cy-1.5} C ${cx+3} ${cy-1.5}, ${cx+3} ${cy+1.5}, ${cx} ${cy+1.5} C ${cx-1.5} ${cy+1.5}, ${cx-1.5} ${cy-0.5}, ${cx} ${cy-0.5} Z`,
    number: 7,
    center: { x: cx, y: cy }
  });

  return paths;
};

export const generateGracefulSwans = () => {
  const paths: any[] = [];
  const cx = 200, cy = 200;

  // Background Circle (Sun bursts zentangle)
  for (let layer=0; layer<4; layer++) {
      const radius = 90 - layer*15;
      const count = 30 - layer*4;
      for(let i=0; i<count; i++) {
         const angle = (i * Math.PI*2) / count + (layer*0.1);
         const nextA = ((i+1) * Math.PI*2) / count + (layer*0.1);
         const px = 200 + Math.cos(angle)*radius;
         const py = 160 + Math.sin(angle)*radius;
         const nx = 200 + Math.cos((angle+nextA)/2)*(radius + 15);
         const ny = 160 + Math.sin((angle+nextA)/2)*(radius + 15);
         const px2 = 200 + Math.cos(nextA)*radius;
         const py2 = 160 + Math.sin(nextA)*radius;
         paths.push({
             id: `sun-burst-l${layer}-${i}`,
             d: `M ${px} ${py} Q ${200 + Math.cos(angle)*(radius+5)} ${160 + Math.sin(angle)*(radius+5)} ${nx} ${ny} Q ${200 + Math.cos(nextA)*(radius+5)} ${160 + Math.sin(nextA)*(radius+5)} ${px2} ${py2} Z`,
             number: layer % 3 + 1,
             center: {x: nx, y:ny}
         })
      }
  }

  paths.push({
    id: `sun-glow`,
    d: `M 200 60 A 100 100 0 1 0 200 260 A 100 100 0 1 0 200 60 Z`,
    number: 1,
    center: { x: 200, y: 160 }
  });

  // Water base
  paths.push({
    id: `water-base`,
    d: `M 40 280 L 360 280 C 370 330, 320 360, 200 360 C 80 360, 30 330, 40 280 Z`,
    number: 3,
    center: { x: 200, y: 320 }
  });

  // Extremely Dense Intricate Water ripples
  for (let i = 0; i < 20; i++) {
    const y = 285 + i * 4;
    const w = 175 - i * 8;
    paths.push({
      id: `ripple-${i}`,
      d: `M ${200 - w} ${y} Q ${200 - w*0.5} ${y+3} 200 ${y} Q ${200 + w*0.5} ${y-3} ${200 + w} ${y} Q ${200 + w*0.5} ${y+3} 200 ${y+6} Q ${200 - w*0.5} ${y+9} ${200 - w} ${y} Z`,
      number: 4 + (i % 3),
      center: { x: 200, y: y + 2 }
    });

    // Tiny ripple bubbles/foam
    if (i % 2 === 0 && w > 20) {
       for (let j=0; j<w/20; j++) {
           const ox = 200 - w + j * 40;
           paths.push({
              id: `foam-${i}-${j}`,
              d: `M ${ox} ${y-1} A 1.5 1.5 0 1 1 ${ox} ${y+2} A 1.5 1.5 0 1 1 ${ox} ${y-1} Z`,
              number: 8, center: {x: ox, y:y}
           });
       }
    }
  }

  // Intricate Lotus at the bottom
  const lotusY = 290;
  for (let i = 0; i < 24; i++) {
    const angle = Math.PI + (i - 11.5) * 0.12;
    const len = 50 - Math.abs(i - 11.5) * 3.5;
    const px = Math.cos(angle) * len;
    const py = Math.sin(angle) * len;

    // Petal
    paths.push({
      id: `lotus-petal-${i}`,
      d: `M 200 ${lotusY} Q ${200 + px*0.8} ${lotusY + py - 18} ${200 + px * 1.8} ${lotusY + py * 1.4} Q ${200 + px*0.6} ${lotusY + py*1.2} 200 ${lotusY} Z`,
      number: 6,
      center: { x: 200 + px, y: lotusY + py }
    });

    // Inner petal fold
    paths.push({
        id: `lotus-petal-in-${i}`,
        d: `M 200 ${lotusY - 4} Q ${200 + px*0.4} ${lotusY + py - 8} ${200 + px * 1.2} ${lotusY + py * 1.1} Q ${200 + px*0.3} ${lotusY + py*0.6} 200 ${lotusY-4} Z`,
        number: 5,
        center: { x: 200 + px*0.6, y: lotusY + py*0.6}
    });
  }

  // Center lotus gem
  paths.push({
    id: `lotus-gem`,
    d: `M 200 ${lotusY - 12} L 208 ${lotusY + 4} L 200 ${lotusY + 16} L 192 ${lotusY + 4} Z`,
    number: 7,
    center: { x: 200, y: lotusY + 4 }
  });

  // Swans
  const addSwan = (isRight: boolean) => {
    const dir = isRight ? 1 : -1;
    const pfx = isRight ? 'r' : 'l';
    const baseX = 200 + 70 * dir;
    const baseY = 270;

    // Body Mass
    paths.push({
      id: `swan-${pfx}-body`,
      d: `M ${200 + 15*dir} 280 C ${200 + 40*dir} 300, ${baseX + 40*dir} 300, ${baseX + 60*dir} 260 C ${baseX + 80*dir} 200, ${baseX - 40*dir} 190, ${baseX - 20*dir} 240 C ${baseX - 10*dir} 270, ${200 + 25*dir} 260, ${200 + 15*dir} 280 Z`,
      number: 8,
      center: { x: baseX + 10*dir, y: 250 }
    });

    // Neck (Forms a heart)
    paths.push({
      id: `swan-${pfx}-neck`,
      d: `M ${baseX - 25*dir} 230 C ${baseX - 40*dir} 150, ${200 + 10*dir} 80, 200 130 C 200 100, ${baseX - 60*dir} 100, ${baseX - 45*dir} 230 Z`,
      number: 9,
      center: { x: baseX - 35*dir, y: 160 }
    });

    // Neck Zentangle banding
    for(let i=0; i<12; i++) {
        const ny = 140 + i*6;
        const nx = 200 + Math.pow((ny - 140)/60, 2) * 50 * dir + 5*dir;
        paths.push({
            id: `swan-${pfx}-neck-band-${i}`,
            d: `M ${nx} ${ny} Q ${nx-10*dir} ${ny+5} ${nx-20*dir} ${ny+2} Q ${nx-5*dir} ${ny-2} ${nx} ${ny} Z`,
            number: 3, center: {x: nx - 8*dir, y: ny + 1}
        });
    }

    // Head
    const headX = 200 + 5*dir;
    const headY = 125;
    paths.push({
      id: `swan-${pfx}-head`,
      d: `M ${headX} ${headY} A 10 10 0 0 ${isRight ? 0 : 1} ${headX + 15*dir} ${headY - 5} L ${headX + 10*dir} ${headY + 12} Z`,
      number: 8,
      center: { x: headX + 7*dir, y: headY + 3 }
    });

    // Beak
    paths.push({
      id: `swan-${pfx}-beak`,
      d: `M 200 130 L ${200 - 15*dir} 145 L ${200 + 5*dir} 135 Z`,
      number: 2,
      center: { x: 200 - 5*dir, y: 138 }
    });

    // Eye
    paths.push({
      id: `swan-${pfx}-eye`,
      d: `M ${headX + 8*dir} 125 A 2 2 0 1 1 ${headX + 8*dir} 126 Z`,
      number: 1,
      center: { x: headX + 8*dir, y: 125 }
    });

    // Elegant Wings (Hyper-dense Zentangle layered feathers)
    for (let layer = 0; layer < 8; layer++) {
      const featherCount = 10 - layer;
      for (let f = 0; f < featherCount; f++) {
        const angle = -0.6 + (f * 0.12) + (layer * 0.08);
        const l = 75 + f * 10 - layer * 9;
        const startX = baseX + (5 + layer * 7) * dir;
        const startY = baseY - 15 - layer * 7;

        const tipX = startX + Math.cos(angle) * l * dir;
        const tipY = startY + Math.sin(angle) * l;

        paths.push({
          id: `swan-${pfx}-w-l${layer}-f${f}`,
          d: `M ${startX} ${startY} Q ${startX + l * 0.5 * dir} ${startY - 20} ${tipX} ${tipY} Q ${startX + l * 0.3 * dir} ${startY + 20} ${startX} ${startY + 6} Z`,
          number: (layer % 4) + 4,
          center: { x: startX + Math.cos(angle) * l * 0.5 * dir, y: startY + Math.sin(angle) * l * 0.5 }
        });

        // Inner feather detail - wonderfully tapered loop
        const innerTipX = tipX * 0.8 + startX * 0.2;
        const innerTipY = tipY * 0.8 + startY * 0.2;
        paths.push({
          id: `swan-${pfx}-w-d-l${layer}-f${f}`,
          d: `M ${startX} ${startY + 3} Q ${startX + l * 0.3 * dir} ${startY - 8} ${innerTipX} ${innerTipY} Q ${startX + l * 0.2 * dir} ${startY + 12} ${startX} ${startY + 3} Z`,
          number: 2,
          center: { x: (startX + innerTipX) / 2, y: (startY + innerTipY) / 2 }
        });

        // Tiny structural dot pattern inside feather
        if (l > 30) {
            const rx = startX + Math.cos(angle) * (l*0.2) * dir;
            const ry = startY + Math.sin(angle) * (l*0.2);
            paths.push({
                id: `swan-${pfx}-w-dot-l${layer}-f${f}`,
                d: `M ${rx} ${ry-1} A 1.5 1.5 0 1 1 ${rx+1} ${ry} A 1.5 1.5 0 1 1 ${rx} ${ry-1} Z`,
                number: 9, center: {x: rx, y: ry}
            });
        }
      }
    }
  };

  addSwan(false);
  addSwan(true);

  // Sparkling Stars - changed to perfectly closed 4-point diamonds
  for (let i = 0; i < 24; i++) {
    const angle = (i * Math.PI*2) / 24;
    const r = 135 + Math.random() * 50;
    const sx = 200 + Math.cos(angle) * r;
    const sy = 160 + Math.sin(angle) * r;
    if (sy < 270) {
      paths.push({
        id: `star-${i}`,
        d: `M ${sx} ${sy-6} Q ${sx} ${sy} ${sx+6} ${sy} Q ${sx} ${sy} ${sx} ${sy+6} Q ${sx} ${sy} ${sx-6} ${sy} Q ${sx} ${sy} ${sx} ${sy-6} Z`,
        number: 4,
        center: { x: sx, y: sy }
      });
      // Outer halo diamond
      paths.push({
        id: `star-halo-${i}`,
        d: `M ${sx} ${sy-10} Q ${sx} ${sy} ${sx+10} ${sy} Q ${sx} ${sy} ${sx} ${sy+10} Q ${sx} ${sy} ${sx-10} ${sy} Q ${sx} ${sy} ${sx} ${sy-10} Z`,
        number: 6,
        center: { x: sx, y: sy }
      });
    }
  }

  // Small heart center
  paths.push({
    id: `small-heart-center`,
    d: `M 200 155 C 205 145, 215 145, 215 155 C 215 170, 200 180, 200 180 C 200 180, 185 170, 185 155 C 185 145, 195 145, 200 155 Z`,
    number: 7,
    center: { x: 200, y: 160 }
  });

  return paths;
};

export const generateCelestialPhoenix = () => {
  const paths: any[] = [];
  const cx = 200, cy = 200;
  const idCounter = 1;

  // Background Cosmic Aura - more layered and ornate (Zentangle sunburst style)
  for (let layer = 0; layer < 4; layer++) {
    const r1 = 120 + layer * 25;
    const r2 = 160 + layer * 20;
    const count = 16 + layer * 4;

    for (let i = 0; i < count; i++) {
      const angle = (i * Math.PI * 2) / count + (layer * Math.PI / count);
      const nextA = angle + (Math.PI * 2) / count;

      const x1 = cx + Math.cos(angle) * r1;
      const y1 = cy + Math.sin(angle) * r1;
      const x2 = cx + Math.cos(nextA) * r1;
      const y2 = cy + Math.sin(nextA) * r1;
      const cpX = cx + Math.cos(angle + Math.PI/count) * r2;
      const cpY = cy + Math.sin(angle + Math.PI/count) * r2;

      paths.push({
        id: `aura-l${layer}-${i}`,
        d: `M ${x1} ${y1} Q ${cpX} ${cpY} ${x2} ${y2} L ${cx} ${cy} Z`,
        number: (layer % 2) + 8,
        center: { x: cx + Math.cos(angle + Math.PI/count) * (r1+15), y: cy + Math.sin(angle + Math.PI/count) * (r1+15) }
      });

      // Detailed inner aura teardrops
      if (layer > 1) {
          const mR = r1 + 10;
          const tipX = cx + Math.cos(angle + Math.PI/count) * (r2 - 10);
          const tipY = cy + Math.sin(angle + Math.PI/count) * (r2 - 10);
          paths.push({
            id: `aura-det-l${layer}-${i}`,
            d: `M ${cx + Math.cos(angle)*mR} ${cy + Math.sin(angle)*mR} Q ${cx + Math.cos(angle + Math.PI/count)*r1} ${cy + Math.sin(angle + Math.PI/count)*r1} ${tipX} ${tipY} Q ${cx + Math.cos(nextA)*r1} ${cy + Math.sin(nextA)*r1} ${cx + Math.cos(nextA)*mR} ${cy + Math.sin(nextA)*mR} Z`,
            number: 7,
            center: { x: cx + Math.cos(angle + Math.PI/count) * (r2 - 20), y: cy + Math.sin(angle + Math.PI/count) * (r2 - 20) }
          });
      }
    }
  }

  // Tail feathers - Masterpiece level detail
  const addTailFeather = (angle: number, length: number, baseWidth: number, index: number) => {
    const segments = 8;
    for (let s = 0; s < segments; s++) {
      const t1 = s / segments;
      const t2 = (s + 1) / segments;
      const l1 = 35 + t1 * length;
      const l2 = 35 + t2 * length;

      const width1 = baseWidth * (1 - t1 * 0.6);
      const width2 = baseWidth * (1 - t2 * 0.6);

      // Points for a tapered, segmented feather
      const p1 = { x: cx + Math.cos(angle - width1) * l1, y: cy + 40 + Math.sin(angle - width1) * l1 };
      const p2 = { x: cx + Math.cos(angle + width1) * l1, y: cy + 40 + Math.sin(angle + width1) * l1 };
      const p3 = { x: cx + Math.cos(angle + width2) * l2, y: cy + 40 + Math.sin(angle + width2) * l2 };
      const p4 = { x: cx + Math.cos(angle - width2) * l2, y: cy + 40 + Math.sin(angle - width2) * l2 };

      const curvature = 25 * Math.sin(t1 * Math.PI) * (index % 2 === 0 ? 1 : -1);

      paths.push({
        id: `tail-f${index}-s${s}`,
        d: `M ${p1.x} ${p1.y} Q ${p1.x + curvature} ${p1.y + curvature} ${p4.x} ${p4.y} L ${p3.x} ${p3.y} Q ${p2.x + curvature} ${p2.y + curvature} ${p2.x} ${p2.y} Z`,
        number: (index % 4) + 1,
        center: { x: (p1.x + p3.x) / 2, y: (p1.y + p3.y) / 2 }
      });

      // Central shaft
      if (s < segments - 1) {
          paths.push({
              id: `tail-shaft-${index}-${s}`,
              d: `M ${cx + Math.cos(angle) * l1} ${cy + 40 + Math.sin(angle) * l1} Q ${cx + Math.cos(angle-0.1) * (l1+l2)/2} ${cy + 40 + Math.sin(angle-0.1) * (l1+l2)/2} ${cx + Math.cos(angle) * l2} ${cy + 40 + Math.sin(angle) * l2} Q ${cx + Math.cos(angle+0.1) * (l1+l2)/2} ${cy + 40 + Math.sin(angle+0.1) * (l1+l2)/2} ${cx + Math.cos(angle) * l1} ${cy + 40 + Math.sin(angle) * l1} Z`,
              number: 9,
              center: { x: cx + Math.cos(angle) * (l1 + 5), y: cy + 40 + Math.sin(angle) * (l1 + 5) }
          });
      }

      // Ornate Eyelet/Gem at the tip
      if (s === segments - 1) {
        const eyeR = 14;
        const ex = cx + Math.cos(angle) * (l2 + 12);
        const ey = cy + 40 + Math.sin(angle) * (l2 + 12);

        // Outer eye
        paths.push({
          id: `tail-eye-out-${index}`,
          d: `M ${ex - eyeR} ${ey} A ${eyeR} ${eyeR} 0 1 0 ${ex + eyeR} ${ey} A ${eyeR} ${eyeR} 0 1 0 ${ex - eyeR} ${ey} Z`,
          number: 5,
          center: { x: ex, y: ey }
        });

        // Inner eye/glow
        paths.push({
            id: `tail-eye-in-${index}`,
            d: `M ${ex - eyeR * 0.6} ${ey} A ${eyeR * 0.6} ${eyeR * 0.6} 0 1 0 ${ex + eyeR * 0.6} ${ey} A ${eyeR * 0.6} ${eyeR * 0.6} 0 1 0 ${ex - eyeR * 0.6} ${ey} Z`,
            number: 7,
            center: { x: ex, y: ey }
        });

        // Tiny gem
        paths.push({
            id: `tail-eye-gem-${index}`,
            d: `M ${ex - eyeR * 0.2} ${ey} A ${eyeR * 0.2} ${eyeR * 0.2} 0 1 0 ${ex + eyeR * 0.2} ${ey} A ${eyeR * 0.2} ${eyeR * 0.2} 0 1 0 ${ex - eyeR * 0.2} ${ey} Z`,
            number: 6,
            center: { x: ex, y: ey }
        });
      }
    }
  };

  for (let i = 0; i < 18; i++) {
    const angle = Math.PI * 0.2 + i * 0.085;
    addTailFeather(angle, 160 + (i%3) * 15, 0.1, i);
  }

  // Flame Wisps emanating from the center
  for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI * 2) / 8 + Math.PI / 8;
      const x1 = cx + Math.cos(angle) * 30;
      const y1 = cy + Math.sin(angle) * 30;
      const tipX = cx + Math.cos(angle) * 80;
      const tipY = cy + Math.sin(angle) * 80;
      const cp1x = cx + Math.cos(angle - 0.5) * 60;
      const cp1y = cy + Math.sin(angle - 0.5) * 60;
      const cp2x = cx + Math.cos(angle + 0.5) * 60;
      const cp2y = cy + Math.sin(angle + 0.5) * 60;

      paths.push({
          id: `flame-wisp-${i}`,
          d: `M ${x1} ${y1} Q ${cp1x} ${cp1y} ${tipX} ${tipY} Q ${cp2x} ${cp2y} ${x1} ${y1} Z`,
          number: 2,
          center: { x: (x1 + tipX)/2, y: (y1 + tipY)/2 }
      });
  }

  // Wings - Hyper-detailed multi-layered plumage
  const addDetailedWing = (isRight: boolean) => {
    const dir = isRight ? 1 : -1;
    const startA = isRight ? -0.4 : Math.PI + 0.4;
    const endA = isRight ? 1.5 : Math.PI - 1.5;

    for (let layer = 0; layer < 4; layer++) {
      const radius = 45 + layer * 30;
      const featherCount = 12 + layer * 2;
      const fLength = 45 + layer * 18;

      for (let i = 0; i < featherCount; i++) {
        const t = i / featherCount;
        const angle = startA + t * (endA - startA);
        const nextA = startA + ((i + 0.9) / featherCount) * (endA - startA);

        const x1 = cx + Math.cos(angle) * radius;
        const y1 = cy + Math.sin(angle) * radius - 40;
        const x2 = cx + Math.cos(nextA) * radius;
        const y2 = cy + Math.sin(nextA) * radius - 40;

        const tipX = cx + Math.cos((angle + nextA) / 2) * (radius + fLength);
        const tipY = cy + Math.sin((angle + nextA) / 2) * (radius + fLength) - 50;

        // Outer feather shape
        paths.push({
          id: `wing-${isRight ? 'r' : 'l'}-l${layer}-f${i}`,
          d: `M ${x1} ${y1} Q ${cx + Math.cos(angle) * (radius + fLength * 0.6)} ${cy + Math.sin(angle) * (radius + fLength * 0.6) - 45} ${tipX} ${tipY} Q ${cx + Math.cos(nextA) * (radius + fLength * 0.6)} ${cy + Math.sin(nextA) * (radius + fLength * 0.6) - 45} ${x2} ${y2} Z`,
          number: (layer % 3) + 3,
          center: { x: tipX * 0.7 + x1 * 0.3, y: tipY * 0.7 + y1 * 0.3 }
        });

        // Intricate feather pattern/veins - perfectly closed tapered shape
        const midPointX = (x1 + x2) / 2;
        const midPointY = (y1 + y2) / 2;
        const innerTipRelativeX = tipX * 0.8 + cx * 0.2;
        const innerTipRelativeY = tipY * 0.8 + (cy - 40) * 0.2;
        paths.push({
           id: `wing-v-${isRight ? 'r' : 'l'}-l${layer}-f${i}`,
           d: `M ${midPointX - 2} ${midPointY} Q ${midPointX} ${midPointY - 5} ${innerTipRelativeX} ${innerTipRelativeY} Q ${midPointX} ${midPointY + 5} ${midPointX + 2} ${midPointY} Z`,
           number: 1,
           center: { x: (midPointX + tipX)/2, y: (midPointY + tipY)/2 }
        });

        // Small accents at base of feathers
        if (layer > 0) {
            const rx = cx + Math.cos(angle) * (radius - 5);
            const ry = cy + Math.sin(angle) * (radius - 5) - 40;
            paths.push({
                id: `wing-acc-${isRight ? 'r' : 'l'}-l${layer}-f${i}`,
                d: `M ${rx-3} ${ry} A 3 3 0 1 0 ${rx+3} ${ry} A 3 3 0 1 0 ${rx-3} ${ry} Z`,
                number: 7,
                center: { x: rx, y: ry }
            });
        }
      }
    }
  };

  addDetailedWing(false);
  addDetailedWing(true);

  // Body Plumage - structured geometric rows
  for (let row = 0; row < 6; row++) {
      const rowY = cy - 60 + row * 15;
      const feathersInRow = 3 + row;
      for (let i = 0; i < feathersInRow; i++) {
          const offsetX = (i - (feathersInRow - 1) / 2) * 15;
          const px = cx + offsetX;
          const py = rowY;
          const w = 10;
          const h = 18;
          paths.push({
              id: `body-v2-r${row}-f${i}`,
              d: `M ${px} ${py} C ${px-w} ${py+h*0.4}, ${px-w*0.5} ${py+h}, ${px} ${py+h} C ${px+w*0.5} ${py+h}, ${px+w} ${py+h*0.4}, ${px} ${py} Z`,
              number: (row % 3) + 4,
              center: { x: px, y: py + h/2 }
          });
      }
  }

  // Neck and Regal Head Profile
  paths.push({
    id: `regal-neck`,
    d: `M 188 100 Q 185 45 200 35 Q 215 45 212 100 Z`,
    number: 5,
    center: { x: 200, y: 65 }
  });

  // Head with layered crest
  paths.push({
    id: `regal-head`,
    d: `M 200 35 C 182 35, 185 0, 200 -5 C 215 0, 218 35, 200 35 Z`,
    number: 6,
    center: { x: 200, y: 15 }
  });

  // Flowing Crest Wisps - Perfectly closed
  for (let i = 0; i < 6; i++) {
    const angle = -Math.PI/2 + (i - 2.5) * 0.25;
    const length = 45 + i * 6;
    const tipX = 200 + Math.cos(angle) * length;
    const tipY = 15 + Math.sin(angle) * length;
    const cp1x = 200 + Math.cos(angle-0.1)*length*0.5;
    const cp1y = 10 + Math.sin(angle-0.1)*length*0.5;
    const cp2x = 200 + Math.cos(angle+0.1)*length*0.5;
    const cp2y = 10 + Math.sin(angle+0.1)*length*0.5;
    paths.push({
      id: `crest-v2-${i}`,
      d: `M 200 10 Q ${cp1x} ${cp1y} ${tipX} ${tipY} Q ${cp2x} ${cp2y} 200 10 Z`,
      number: 7,
      center: { x: 200 + Math.cos(angle) * 25, y: 10 + Math.sin(angle) * 25 }
    });
  }

  // Beak - sharper and more defined
  paths.push({
    id: `regal-beak-up`,
    d: `M 213 22 L 235 26 L 213 30 Z`,
    number: 1,
    center: { x: 224, y: 26 }
  });
  paths.push({
    id: `regal-beak-low`,
    d: `M 213 30 L 228 31 L 213 33 Z`,
    number: 1,
    center: { x: 220, y: 31 }
  });

  // Sharp Celestial Eye
  paths.push({
    id: `celestial-eye-outer`,
    d: `M 203 20 A 4 4 0 1 0 203 19 Z`,
    number: 9,
    center: { x: 203, y: 20 }
  });
  paths.push({
    id: `celestial-eye-inner`,
    d: `M 203 20 A 1.5 1.5 0 1 0 203 19 Z`,
    number: 8,
    center: { x: 203, y: 20 }
  });

  return paths;
};
