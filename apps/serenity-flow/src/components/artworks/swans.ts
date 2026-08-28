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

  return paths;
};
