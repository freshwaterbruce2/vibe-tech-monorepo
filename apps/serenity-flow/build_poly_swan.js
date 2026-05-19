import fs from 'fs';
import Delaunator from 'delaunator';

let seed = 999;
function random() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
}

function buildLowPolySwan() {
    const width = 400;
    const height = 400;
    const points = [];

    // Grid for background
    for (let x = 0; x <= width; x += 30) {
        for (let y = 0; y <= height; y += 30) {
            points.push([x + random() * 15 - 7.5, y + random() * 15 - 7.5]);
        }
    }

    const cx = 200, cy = 200;

    // We want dense points inside two swans.
    const addSwanPoints = (isRight) => {
        const flip = (v) => isRight ? 400 - v : v;

        // Body (Ellipse-ish)
        for(let i=0; i<100; i++) {
            const a = random() * Math.PI * 2;
            const r1 = random() * 60;
            const r2 = random() * 40;
            points.push([flip(120 + Math.cos(a)*r1), 280 + Math.sin(a)*r2]);
        }
        // Tail
        for(let i=0; i<30; i++) {
            points.push([flip(40 + random()*40), 250 + random()*50]);
        }
        // Neck - bezier curve sampling
        for(let t=0; t<=1; t+=0.02) {
            // Heart-shaped neck curve
            const bpX = flip(120*(1-t) + 190*t + Math.sin(t*Math.PI)*20);
            const bpY = 280*(1-t) + 130*t - Math.sin(t*Math.PI)*80;

            const thickness = 15 + (1-t)*15;
            for(let k=0; k<3; k++) {
                points.push([bpX + random()*thickness - thickness/2, bpY + random()*thickness - thickness/2]);
            }
        }
        // Head
        for(let i=0; i<20; i++) {
            points.push([flip(185 + random()*20), 125 + random()*20]);
        }
        // Beak
        for(let i=0; i<10; i++) {
            points.push([flip(195 + random()*10), 135 + random()*10]);
        }
    };

    addSwanPoints(false);
    addSwanPoints(true);

    // Water
    for(let i=0; i<150; i++) {
        points.push([random() * width, 280 + random() * 120]);
    }

    // Border
    for (let i = 0; i <= width; i += 20) {
        points.push([i, 0], [i, height], [0, i], [width, i]);
    }

    const d = new Delaunator(points.flat());
    const {triangles} = d;
    let pathId = 1;
    const paths = [];

    // Helper functions for shape checks (rough bounding)
    const inSwan = (px, py, isRight) => {
        const flip = (v) => isRight ? 400 - v : v;
        const fnx = flip(px);
        // Body approx
        if (Math.hypot((fnx-120)/1.5, py-280) < 45) return 1; // Swan body
        if (Math.hypot((fnx-70)/1.2, py-260) < 25) return 1; // Tail

        // Neck distance to curve
        let minDist = 999;
        for(let t=0; t<=1; t+=0.02) {
            const bx = 120*(1-t) + 190*t + Math.sin(t*Math.PI)*20;
            const by = 280*(1-t) + 130*t - Math.sin(t*Math.PI)*80;
            const dist = Math.hypot(fnx - bx, py - by);
            if (dist < minDist) minDist = dist;
            if (minDist < 18 + (1-t)*12) return (t > 0.9 && py > 130 && py < 150) ? 3 /*beak*/ : 2 /*neck*/;
        }
        return 0;
    };

    for (let i = 0; i < triangles.length; i += 3) {
        const p1 = points[triangles[i]];
        const p2 = points[triangles[i + 1]];
        const p3 = points[triangles[i + 2]];

        const cx = (p1[0] + p2[0] + p3[0]) / 3;
        const cy = (p1[1] + p2[1] + p3[1]) / 3;

        if (cx < 0 || cx > width || cy < 0 || cy > height) continue;
        const maxDist = Math.max(
            Math.hypot(p1[0]-p2[0], p1[1]-p2[1]),
            Math.hypot(p2[0]-p3[0], p2[1]-p3[1]),
            Math.hypot(p3[0]-p1[0], p3[1]-p1[1])
        );
        if (maxDist > 60) continue;

        let colorNum = 8; // background

        const sl = inSwan(cx, cy, false);
        const sr = inSwan(cx, cy, true);

        if (sl > 0) {
            colorNum = (sl===3) ? 4 : (random() > 0.5 ? 1 : 2); // Swans are white/light gray, beak is orange
        } else if (sr > 0) {
            colorNum = (sr===3) ? 4 : (random() > 0.5 ? 1 : 2);
        } else if (cy > 290) {
            colorNum = random() > 0.7 ? 7 : 6; // water
        } else if (Math.hypot(cx - 200, cy - 180) < 60) {
            colorNum = 5; // Sun behind swans
        } else {
            colorNum = cy < 100 ? 9 : 8; // Sky
        }

        const pathData = [
            `M ${p1[0].toFixed(1)} ${p1[1].toFixed(1)}`,
            `L ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`,
            `L ${p3[0].toFixed(1)} ${p3[1].toFixed(1)} Z`,
        ].join(' ');

        paths.push({
            id: `swan-poly-${pathId++}`,
            d: pathData,
            number: colorNum,
            center: { x: cx, y: cy }
        });
    }

    const fileContent = `export const generateLowPolySwans = () => ${  JSON.stringify(paths)  };`;

    fs.writeFileSync('./src/components/generatedSwans.ts', fileContent);
    console.log(`Generated ${  paths.length  } polygons for swans.`);
}

buildLowPolySwan();
