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

  // Call the ring generator multiple times to build the full mandala
  generateZentangleRing(64, 28, 18, 0.08, 1);
  generateZentangleRing(48, 48, 14, 0.07, 3);
  generateZentangleRing(32, 65, 12, 0.06, 5);
  generateZentangleRing(24, 80, 10, 0.05, 7);

  return paths;
};
