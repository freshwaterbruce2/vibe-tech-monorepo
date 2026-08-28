import fs from 'fs';

const paths = [];
let idCounter = 1;

function addPoly(points, number, cx, cy) {
  const d = `M ${  points.map(p => `${p[0]} ${p[1]}`).join(' L ')  } Z`;
  paths.push({
    id: `sl-${idCounter++}`,
    d,
    number,
    center: { x: cx, y: cy }
  });
}

let seed = 12345;
function random() {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
}

// Background / Sun
addPoly([[0,0], [400,0], [400,200], [0,200]], 3, 200, 100);
addPoly([[150, 100], [250, 100], [200, 50]], 4, 200, 80);

for (let y = 200; y < 400; y += 40) {
  for (let x = 0; x < 400; x += 80) {
    const rx = x;
    const ry = y;
    const w = 80;
    const h = 40;
    addPoly([
      [rx, ry],
      [rx + w, ry],
      [rx + w, ry + h],
      [rx, ry + h]
    ], (random() > 0.5 ? 5 : 6), rx + w/2, ry + h/2);
  }
}

function generateSwanBox(cx, cy, isLeft) {
    const baseCol = isLeft ? 1 : 2;
    addPoly([
        [cx - 40, cy - 40],
        [cx + 40, cy - 40],
        [cx + 40, cy + 40],
        [cx - 40, cy + 40]
    ], baseCol, cx, cy);
}

generateSwanBox(150, 250, true);
generateSwanBox(250, 250, false);


fs.writeFileSync('swan_art.json', JSON.stringify({
    id: 'swan-lake',
    name: 'Swan Lake Love',
    viewBox: '0 0 400 400',
    category: 'Love',
    classicPalette: ['#ffffff', '#f8fafc', '#fcd34d', '#38bdf8', '#0ea5e9', '#0284c7'],
    paths: paths
}, null, 2));
