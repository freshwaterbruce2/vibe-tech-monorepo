import fs from 'fs';
import Delaunator from 'delaunator';

// Seeded random
let seed = 12345;
function random() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
}

function buildLowPolyScene() {
    const width = 400;
    const height = 400;
    const points = [];

    // Base grid
    for (let x = 0; x <= width; x += 30) {
        for (let y = 0; y <= height; y += 30) {
            points.push([x + random() * 15 - 7.5, y + random() * 15 - 7.5]);
        }
    }

    const sun = { x: 200, y: 120, r: 40 };
    const leftMountain = { peakX: 100, peakY: 150 };
    const rightMountain = { peakX: 300, peakY: 100 };

    for (let i = 0; i < 60; i++) {
        const a = random() * Math.PI * 2;
        const r = random() * sun.r * 1.5;
        points.push([sun.x + Math.cos(a) * r, sun.y + Math.sin(a) * r]);
    }

    for (let x = 0; x <= 250; x += 10) {
        const y = leftMountain.peakY + Math.abs(x - leftMountain.peakX) * 0.8;
        if (y < 250) {
            points.push([x + random()*5, y + random()*5]);
        }
    }

    for (let x = 150; x <= 400; x += 10) {
        const y = rightMountain.peakY + Math.abs(x - rightMountain.peakX) * 0.7;
        if (y < 250) {
            points.push([x + random()*5, y + random()*5]);
        }
    }

    for (let x = 0; x <= width; x += 15) {
        points.push([x, 250 + random()*5]);
    }

    for(let i=0; i<100; i++) {
        points.push([random() * width, 250 + Math.pow(random(), 2) * 150]);
    }

    for (let i = 0; i <= width; i += 20) {
        points.push([i, 0]);
        points.push([i, height]);
        points.push([0, i]);
        points.push([width, i]);
    }

    const d = new Delaunator(points.flat());
    const {triangles} = d;
    let pathId = 1;
    const paths = [];

    function getPaletteIndex(cx, cy) {
        if (cy > 250) {
            if (Math.abs(cx - 200) < 40 + (cy - 250)*0.5 && cy < 350) return 9;
            return random() > 0.8 ? 8 : (cy > 320 ? 6 : 7);
        }

        const inLeftMtn = cy > (leftMountain.peakY + Math.abs(cx - leftMountain.peakX) * 0.8);
        const inRightMtn = cy > (rightMountain.peakY + Math.abs(cx - rightMountain.peakX) * 0.7);

        if (inLeftMtn && inRightMtn) {
            return cx > 200 ? ((cx % 20 < 10) ? 5 : 4) : 4;
        } else if (inLeftMtn) return (cx < leftMountain.peakX) ? 4 : 5;
        else if (inRightMtn) return (cx < rightMountain.peakX) ? 4 : 5;

        const distToSun = Math.hypot(cx - sun.x, cy - sun.y);
        if (distToSun < sun.r) return 3;
        if (distToSun < sun.r + 20) return 2;
        return cy < 60 ? 1 : 2;
    }

    for (let i = 0; i < triangles.length; i += 3) {
        const p1 = points[triangles[i]];
        const p2 = points[triangles[i + 1]];
        const p3 = points[triangles[i + 2]];

        const cx = (p1[0] + p2[0] + p3[0]) / 3;
        const cy = (p1[1] + p2[1] + p3[1]) / 3;

        if (cx < 0 || cx > width || cy < 0 || cy > height) continue;

        // Skip massive triangles which look ugly
        const maxDist = Math.max(
            Math.hypot(p1[0]-p2[0], p1[1]-p2[1]),
            Math.hypot(p2[0]-p3[0], p2[1]-p3[1]),
            Math.hypot(p3[0]-p1[0], p3[1]-p1[1])
        );
        if (maxDist > 100) continue;

        const colorNum = getPaletteIndex(cx, cy);
        const pathData = [
            `M ${p1[0].toFixed(1)} ${p1[1].toFixed(1)}`,
            `L ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`,
            `L ${p3[0].toFixed(1)} ${p3[1].toFixed(1)} Z`,
        ].join(' ');

        paths.push({
            id: `poly-${pathId++}`,
            d: pathData,
            number: colorNum,
            center: { x: cx, y: cy }
        });
    }

    const fileContent = `export const generateLowPolyLandscape = () => ${  JSON.stringify(paths)  };`;

    fs.writeFileSync('./src/components/generatedLowpoly.ts', fileContent);
    console.log(`Generated ${  paths.length  } polygons.`);
}

buildLowPolyScene();
