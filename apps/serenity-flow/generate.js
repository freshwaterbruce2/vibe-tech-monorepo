import fs from 'fs';

function generateSwanArt() {
  const paths = [];
  let pIdx = 1;

  function bezier(p0, p1, p2, p3) {
      return `M ${p0[0]} ${p0[1]} C ${p1[0]} ${p1[1]}, ${p2[0]} ${p2[1]}, ${p3[0]} ${p3[1]}`;
  }

  // We can just construct a static complex SVG for swans!
  const dStrings = [];

  // Let's create a beautiful structured set of paths.

  // Background rays
  for (let i = 0; i < 360; i += 15) {
      const angle1 = (i * Math.PI) / 180;
      const angle2 = ((i + 15) * Math.PI) / 180;
      const x1 = 200 + 300 * Math.cos(angle1);
      const y1 = 200 + 300 * Math.sin(angle1);
      const x2 = 200 + 300 * Math.cos(angle2);
      const y2 = 200 + 300 * Math.sin(angle2);
      paths.push({
          id: `ray-${pIdx++}`,
          d: `M 200 200 L ${x1} ${y1} L ${x2} ${y2} Z`,
          number: (i / 15) % 2 === 0 ? 1 : 2,
          center: { x: 200 + 100 * Math.cos(angle1 + 0.1), y: 200 + 100 * Math.sin(angle1 + 0.1) }
      });
  }

  // Sun
  paths.push({
      id: `sun-center`,
      d: `M 200 100 A 40 40 0 1 1 199.9 100 Z`, // circle
      number: 3,
      center: { x: 200, y: 100 }
  });

  // Pond
  for(let i=0; i<10; i++) {
     const yTop = 200 + i*20;
     const yBot = yTop + 20;
     // simple horizontal strips
     paths.push({
         id: `water-${pIdx++}`,
         d: `M 0 ${yTop} L 400 ${yTop} L 400 ${yBot} L 0 ${yBot} Z`,
         number: 4 + (i%2),
         center: { x: 200, y: yTop + 10 }
     });
  }

  // Left Swan Body
  paths.push({
      id: `l-swan-body`,
      d: `M 50 250 C 50 200, 150 180, 180 230 C 200 280, 150 280, 50 250 Z`,
      number: 6,
      center: { x: 120, y: 240 }
  });

  // Left Swan Neck
  paths.push({
      id: `l-swan-neck`,
      d: `M 160 210 C 130 100, 200 80, 190 140 C 180 180, 180 200, 180 230 C 150 200, 160 210, 160 210 Z`,
      number: 6,
      center: { x: 170, y: 160 }
  });

  // Right Swan Body
  paths.push({
      id: `r-swan-body`,
      d: `M 350 250 C 350 200, 250 180, 220 230 C 200 280, 250 280, 350 250 Z`,
      number: 7,
      center: { x: 280, y: 240 }
  });

  // Right Swan Neck
  paths.push({
      id: `r-swan-neck`,
      d: `M 240 210 C 270 100, 200 80, 210 140 C 220 180, 220 200, 220 230 C 250 200, 240 210, 240 210 Z`,
      number: 7,
      center: { x: 230, y: 160 }
  });

  // Left Swan Beak
  paths.push({
      id: `l-swan-beak`,
      d: `M 190 140 L 200 160 L 195 135 Z`,
      number: 8,
      center: { x: 195, y: 145 }
  });

  // Right Swan Beak
  paths.push({
      id: `r-swan-beak`,
      d: `M 210 140 L 200 160 L 205 135 Z`,
      number: 8,
      center: { x: 205, y: 145 }
  });


  fs.writeFileSync('generated_swans.json', JSON.stringify(paths, null, 2));
}

generateSwanArt();
