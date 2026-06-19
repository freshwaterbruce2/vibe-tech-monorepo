export const generateStellarLotus = () => {
  const paths: any[] = [];
  const cx = 100, cy = 100;

  // Background ripple rings
  for (let ring = 0; ring < 6; ring++) {
    const radius = 25 + ring * 12;
    const count = 24 + ring * 4;
    for (let i = 0; i < count; i++) {
      const angle = (i * Math.PI * 2) / count;
      const nextA = ((i + 1) * Math.PI * 2) / count;
      const px = cx + Math.cos(angle) * radius;
      const py = cy + Math.sin(angle) * radius;
      const inX = cx + Math.cos(angle) * (radius - 8);
      const inY = cy + Math.sin(angle) * (radius - 8);
      const pxN = cx + Math.cos(nextA) * radius;
      const pyN = cy + Math.sin(nextA) * radius;
      paths.push({
        id: `bg-ripple-${ring}-${i}`,
        d: `M ${px} ${py} L ${inX} ${inY} L ${pxN} ${pyN} Q ${cx + Math.cos(nextA) * (radius+4)} ${cy + Math.sin(nextA) * (radius+4)} ${px} ${py} Z`,
        number: 8,
        center: { x: cx + Math.cos(nextA) * (radius-2), y: cy + Math.sin(nextA) * (radius-2) }
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

      // Vein details
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

  // Fibonacci spiral seeds
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

  // Center swirl
  paths.push({
    id: `center-swirl`,
    d: `M ${cx} ${cy-1.5} C ${cx+3} ${cy-1.5}, ${cx+3} ${cy+1.5}, ${cx} ${cy+1.5} C ${cx-1.5} ${cy+1.5}, ${cx-1.5} ${cy-0.5}, ${cx} ${cy-0.5} Z`,
    number: 7,
    center: { x: cx, y: cy }
  });

  return paths;
};
