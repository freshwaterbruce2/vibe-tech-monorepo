export const generateZentangleHearts = () => {
  const paths: any[] = [];
  const cx = 100, cy = 100;
  let idCounter = 1;

  const pushSymm = (id: string, dL: string, dR: string, num: number, cL: {x:number, y:number}) => {
      paths.push({ id: `lh-${idCounter++}-${id}`, d: dL, number: num, center: cL });
      paths.push({ id: `rh-${idCounter++}-${id}`, d: dR, number: num, center: { x: 200 - cL.x, y: cL.y } });
  };

  // Background radiating aura
  for (let i = 0; i < 32; i++) {
    const angle = (i * Math.PI * 2) / 32 + Math.PI/32;
    const nextA = ((i+1) * Math.PI * 2) / 32 + Math.PI/32;
    const r1 = 90;
    const r2 = 140;
    paths.push({
      id: `bg-aura-${i}`,
      d: `M ${cx + Math.cos(angle)*15} ${cy + Math.sin(angle)*15} L ${cx + Math.cos(angle)*r1} ${cy + Math.sin(angle)*r1} Q ${cx + Math.cos((angle+nextA)/2)*r2} ${cy + Math.sin((angle+nextA)/2)*r2} ${cx + Math.cos(nextA)*r1} ${cy + Math.sin(nextA)*r1} Z`,
      number: 8,
      center: { x: cx + Math.cos((angle+nextA)/2)*(r1+15), y: cy + Math.sin((angle+nextA)/2)*(r1+15) }
    });
  }

  // Interlocking zentangle heart layers
  for (let layer=0; layer < 6; layer++) {
     const scale = 1 - layer*0.15;

     // Left heart half
     paths.push({
        id: `lh-l${layer}`,
        d: `M 100 ${50 + layer*8} C ${50 + layer*5} ${10 + layer*5}, ${0 + layer*8} ${60 + layer*5}, 100 ${160 - layer*8} C ${100 - layer*2} ${130 - layer*8}, ${100 - layer*1} ${80 + layer*2}, 100 ${50 + layer*8}`,
        number: (layer % 3) + 1,
        center: { x: 50 + layer*5, y: 70 + layer*5 }
     });

     // Right heart
     paths.push({
        id: `rh-l${layer}`,
        d: `M 100 ${50 + layer*8} C ${150 - layer*5} ${10 + layer*5}, ${200 - layer*8} ${60 + layer*5}, 100 ${160 - layer*8} C ${100 + layer*2} ${130 - layer*8}, ${100 + layer*1} ${80 + layer*2}, 100 ${50 + layer*8}`,
        number: ((layer+1) % 3) + 1,
        center: { x: 150 - layer*5, y: 70 + layer*5 }
     });

     // Dense inner facets for this layer
     for(let i=0; i<12; i++) {
        const t = i/12;
        const nt = (i+1)/12;
        const ly = 50 + layer*8 + (110 - layer*16)*t;
        const nly = 50 + layer*8 + (110 - layer*16)*nt;

        // Let's use simple geometric interior cuts
        pushSymm(`facet-${layer}-${i}`,
          `M 100 ${ly} Q ${50 + layer*5} ${ly - 10} 100 ${nly} Q ${80} ${ly+10} 100 ${ly}`,
          `M 100 ${ly} Q ${150 - layer*5} ${ly - 10} 100 ${nly} Q ${120} ${ly+10} 100 ${ly}`,
          (layer + i) % 4 + 4,
          { x: 75 + layer*2, y: ly + 5 }
        );
     }
  }

  // Vine details
  for(let i=0; i<20; i++) {
     const t = i/20;
     const y = 10 + 180*t;
     const xLeft = 10 + Math.sin(t*Math.PI*4)*10;
     pushSymm(`vine-${i}`,
       `M ${xLeft} ${y} C ${xLeft-10} ${y+10}, ${xLeft+15} ${y+20}, ${xLeft} ${y+30} C ${xLeft-5} ${y+20}, ${xLeft-5} ${y+10}, ${xLeft} ${y}`,
       `M ${200-xLeft} ${y} C ${200-(xLeft-10)} ${y+10}, ${200-(xLeft+15)} ${y+20}, ${200-xLeft} ${y+30} C ${200-(xLeft-5)} ${y+20}, ${200-(xLeft-5)} ${y+10}, ${200-xLeft} ${y}`,
       7, { x: xLeft, y: y+15 }
     )
  }

  return paths;
};

export const generateZentangleSunrise = () => {
    const paths: any[] = [];
    const idCounter = 1;

    // Sun rays zentangle
    for(let rLevel=0; rLevel<6; rLevel++) {
        const radius = 120 - rLevel*15;
        const count = 36 - rLevel*4;
        for(let i=0; i<count; i++) {
           const angle = Math.PI + (i * Math.PI) / count + (rLevel*0.05);
           const nextA = Math.PI + ((i+1) * Math.PI) / count + (rLevel*0.05);
           const px = 100 + Math.cos(angle)*radius;
           const py = 120 + Math.sin(angle)*radius;
           const npx = 100 + Math.cos(nextA)*radius;
           const npy = 120 + Math.sin(nextA)*radius;

           paths.push({
               id: `ray-l${rLevel}-${i}`,
               d: `M ${px} ${py} Q ${100 + Math.cos((angle+nextA)/2)*(radius+20)} ${120 + Math.sin((angle+nextA)/2)*(radius+20)} ${npx} ${npy} Q ${100 + Math.cos((angle+nextA)/2)*(radius-10)} ${120 + Math.sin((angle+nextA)/2)*(radius-10)} ${px} ${py} Z`,
               number: rLevel % 3 + 1,
               center: {x: 100 + Math.cos((angle+nextA)/2)*(radius+5), y: 120 + Math.sin((angle+nextA)/2)*(radius+5)}
           });

           if (i % 2 === 0 && radius > 40) {
              const dotx = 100 + Math.cos(angle)*(radius-8);
              const doty = 120 + Math.sin(angle)*(radius-8);
              paths.push({
                  id: `ray-dot-l${rLevel}-${i}`,
                  d: `M ${dotx} ${doty-1.5} A 1.5 1.5 0 1 1 ${dotx} ${doty+1.5} A 1.5 1.5 0 1 1 ${dotx} ${doty-1.5} Z`,
                  number: 8, center: {x:dotx, y:doty}
              })
           }
        }
    }

    // Multiple dense background mountain layers
    for(let mLayer=0; mLayer<4; mLayer++) {
        const baseY = 110 + mLayer*15;
        const items = 6 + mLayer*2;
        for(let i=0; i<items; i++) {
            const bx = (i / items) * 200 - 20;
            const nbx = ((i+1) / items) * 200 + 20;
            const mx = (bx + nbx)/2 + (Math.random()*10 - 5);
            const my = baseY - 20 - Math.random()*20;

            paths.push({
                id: `mnt-bg-l${mLayer}-${i}`,
                d: `M ${bx} ${baseY + 30} L ${mx} ${my} L ${nbx} ${baseY + 30} Q ${mx} ${baseY+10} ${bx} ${baseY + 30} Z`,
                number: 4 + mLayer % 3,
                center: {x: mx, y: (my + baseY+30)/2 }
            });

            // Nested snowcap
            paths.push({
                id: `mnt-snow-l${mLayer}-${i}`,
                d: `M ${bx*0.7+mx*0.3} ${baseY*0.7+my*0.3 + 20} L ${mx} ${my} L ${nbx*0.7+mx*0.3} ${baseY*0.7+my*0.3 + 20} Q ${mx} ${my+15} ${bx*0.7+mx*0.3} ${baseY*0.7+my*0.3 + 20} Z`,
                number: 7, center: {x: mx, y: my + 10}
            });
        }
    }

    // Dense foreground forest base
    for(let i=0; i<30; i++) {
        const bx = (i / 30) * 200;
        const h = 10 + Math.random()*15;
        paths.push({
            id: `fg-tree-${i}`,
            d: `M ${bx-4} 200 L ${bx} ${200-h} L ${bx+4} 200 Q ${bx} 190 ${bx-4} 200 Z`,
            number: 8, center: {x:bx, y: 195}
        });
        paths.push({
            id: `fg-tree-in-${i}`,
            d: `M ${bx-2} 200 L ${bx} ${200-h+5} L ${bx+2} 200 Z`,
            number: 9, center: {x:bx, y: 198}
        })
    }

    return paths;
};

export const generateZentangleForest = () => {
    const paths: any[] = [];
    const idCounter = 1;

    // Circular zentangle backdrop (moon/halo)
    for(let r=0; r<4; r++) {
        const radius = 80 - r*15;
        for(let i=0; i<24; i++) {
            const angle = (i * Math.PI*2)/24;
            const nAngle = ((i+1) * Math.PI*2)/24;
            const px = 100 + Math.cos(angle)*radius; const py = 90 + Math.sin(angle)*radius;
            const nx = 100 + Math.cos(nAngle)*radius; const ny = 90 + Math.sin(nAngle)*radius;
            paths.push({
                id: `halo-${r}-${i}`,
                d: `M ${px} ${py} Q ${100 + Math.cos((angle+nAngle)/2)*(radius+15)} ${90 + Math.sin((angle+nAngle)/2)*(radius+15)} ${nx} ${ny} Q ${100 + Math.cos((angle+nAngle)/2)*(radius-10)} ${90 + Math.sin((angle+nAngle)/2)*(radius-10)} ${px} ${py} Z`,
                number: 6 + (r%2), center: {x: 100 + Math.cos((angle+nAngle)/2)*(radius+5), y: 90 + Math.sin((angle+nAngle)/2)*(radius+5)}
            })
        }
    }

    // Dense Tree Trunk
    paths.push({
        id: `trunk-main`,
        d: `M 80 200 C 90 150, 90 100, 100 80 C 110 100, 110 150, 120 200 C 100 180, 100 180, 80 200 Z`,
        number: 1, center: {x: 100, y: 150}
    });

    // Trunk zentangle lines
    for(let i=0; i<15; i++) {
        const y = 200 - i*8;
        paths.push({
            id: `trunk-line-${i}`,
            d: `M 85 ${y} Q 100 ${y-10} 115 ${y} Q 100 ${y+5} 85 ${y} Z`,
            number: 2, center: {x: 100, y: y-2}
        });
    }

    // Enormous array of leaves
    for(let b=0; b<12; b++) {
        const bAngle = Math.PI*1.2 + (b/12)*Math.PI*0.6;
        const bx = 100 + Math.cos(bAngle)*30;
        const by = 80 + Math.sin(bAngle)*30;

        // Branches
        paths.push({
            id: `branch-${b}`,
            d: `M 100 80 Q ${100 + Math.cos(bAngle)*15} ${80 + Math.sin(bAngle)*15} ${bx} ${by} Q ${100 + Math.cos(bAngle-0.1)*15} ${80 + Math.sin(bAngle-0.1)*15} 100 80 Z`,
            number: 1, center: {x: (100+bx)/2, y: (80+bx)/2}
        })

        // Leaves cluster on each branch
        for(let l=0; l<18; l++) {
            const lAngle = bAngle + (Math.random()*2-1)*0.8;
            const dist = 10 + Math.random()*50;
            const lx = bx + Math.cos(lAngle)*dist;
            const ly = by + Math.sin(lAngle)*dist;
            paths.push({
                id: `leaf-${b}-${l}`,
                d: `M ${lx} ${ly} C ${lx-10} ${ly-15}, ${lx+10} ${ly-15}, ${lx} ${ly-30} C ${lx+10} ${ly-15}, ${lx-10} ${ly-15}, ${lx} ${ly} Z`,
                number: 3 + (l%3), center: {x: lx, y: ly-15}
            })
            // Leaf inner
            paths.push({
                id: `leaf-in-${b}-${l}`,
                d: `M ${lx} ${ly-5} C ${lx-4} ${ly-15}, ${lx+4} ${ly-15}, ${lx} ${ly-25} C ${lx+4} ${ly-15}, ${lx-4} ${ly-15}, ${lx} ${ly-5} Z`,
                number: 7, center: {x: lx, y: ly-15}
            })
        }
    }

    // Foreground roots/vines
    for(let r=0; r<8; r++) {
       const rx = 40 + r*17;
       paths.push({
           id: `root-${r}`,
           d: `M ${rx} 200 Q ${rx+10} 180 ${rx+5} 160 Q ${rx-5} 180 ${rx} 200 Z`,
           number: 1, center: {x: rx+2, y:180}
       })
    }

    return paths;
};

export const generateZentangleNebula = () => {
    const paths: any[] = [];
    const idCounter = 1;

    for (let s = 0; s < 4; s++) {
        const arms = 12;
        const rotations = s * 0.5;
        for (let a = 0; a < arms; a++) {
            const startAngle = (a / arms) * Math.PI * 2 + rotations;

            for(let step = 0; step < 16; step++) {
                const r1 = step * 6;
                const r2 = (step+1) * 6;
                const th1 = startAngle + step * 0.15;
                const th2 = startAngle + (step+1) * 0.15;

                const px1 = 100 + Math.cos(th1)*r1; const py1 = 100 + Math.sin(th1)*r1;
                const px2 = 100 + Math.cos(th2)*r2; const py2 = 100 + Math.sin(th2)*r2;
                const px3 = 100 + Math.cos(th2+0.1)*r2; const py3 = 100 + Math.sin(th2+0.1)*r2;
                const px4 = 100 + Math.cos(th1+0.1)*r1; const py4 = 100 + Math.sin(th1+0.1)*r1;

                paths.push({
                    id: `nebula-arm-${s}-${a}-${step}`,
                    d: `M ${px1} ${py1} L ${px2} ${py2} Q ${100 + Math.cos(th2+0.05)*(r2+5)} ${100 + Math.sin(th2+0.05)*(r2+5)} ${px3} ${py3} L ${px4} ${py4} Q ${100 + Math.cos(th1+0.05)*(r1-5)} ${100 + Math.sin(th1+0.05)*(r1-5)} ${px1} ${py1} Z`,
                    number: (step % 5) + 1,
                    center: {x: (px1+px2)/2, y: (py1+py2)/2}
                });

                // Embedded stars in the arms
                if (step % 4 === 0 && r1 > 10) {
                    const sx = 100 + Math.cos(th1+0.05)*(r1+2);
                    const sy = 100 + Math.sin(th1+0.05)*(r1+2);
                    paths.push({
                        id: `nebula-star-${s}-${a}-${step}`,
                        d: `M ${sx} ${sy-3} Q ${sx} ${sy} ${sx+3} ${sy} Q ${sx} ${sy} ${sx} ${sy+3} Q ${sx} ${sy} ${sx-3} ${sy} Q ${sx} ${sy} ${sx} ${sy-3} Z`,
                        number: 8, center: {x: sx, y: sy}
                    });
                }
            }
        }
    }

    return paths;
};

export const generateZentangleStainedGlass = () => {
    const paths: any[] = [];
    const idCounter = 1;
    const cx = 100, cy = 100;

    // Very intricate radial web
    for(let r=0; r<6; r++) {
        const r1 = r * 16 + 10;
        const r2 = (r+1) * 16 + 10;
        const sections = 12 + r*6;
        for(let i=0; i<sections; i++) {
            const th1 = (i / sections) * Math.PI*2;
            const th2 = ((i+1) / sections) * Math.PI*2;

            const p1x = cx + Math.cos(th1)*r1; const p1y = cy + Math.sin(th1)*r1;
            const p2x = cx + Math.cos(th2)*r1; const p2y = cy + Math.sin(th2)*r1;
            const p3x = cx + Math.cos(th2)*r2; const p3y = cy + Math.sin(th2)*r2;
            const p4x = cx + Math.cos(th1)*r2; const p4y = cy + Math.sin(th1)*r2;

            paths.push({
               id: `glass-${r}-${i}`,
               d: `M ${p1x} ${p1y} L ${p2x} ${p2y} L ${p3x} ${p3y} L ${p4x} ${p4y} Z`,
               number: (r + i) % 7 + 1,
               center: {x: (p1x+p3x)/2, y: (p1y+p3y)/2}
            });

            // Nested glass cut
            paths.push({
               id: `glass-in-${r}-${i}`,
               d: `M ${p1x*0.8+p3x*0.2} ${p1y*0.8+p3y*0.2} L ${p2x*0.8+p4x*0.2} ${p2y*0.8+p4y*0.2} L ${p3x*0.8+p1x*0.2} ${p3y*0.8+p1y*0.2} L ${p4x*0.8+p2x*0.2} ${p4y*0.8+p2y*0.2} Z`,
               number: (r + i + 2) % 7 + 1,
               center: {x: (p1x+p3x)/2, y: (p1y+p3y)/2}
            });
        }
    }

    return paths;
};

export const generateZentangleRose = () => {
    const paths: any[] = [];
    const idCounter = 1;
    const cx=100, cy=100;

    // Golden ratio spiral for petals
    const phi = (Math.sqrt(5) + 1) / 2;
    const goldenAngle = (2 - phi) * 2 * Math.PI;

    for (let i = 1; i < 150; i++) {
        const radius = Math.pow(i, 0.6) * 4;
        const angle = i * goldenAngle;

        const px = cx + Math.cos(angle) * radius;
        const py = cy + Math.sin(angle) * radius;

        const pSize = Math.max(3, radius * 0.4);

        paths.push({
           id: `rose-petal-${i}`,
           d: `M ${px} ${py} Q ${px + Math.cos(angle - 0.5)*pSize} ${py + Math.sin(angle - 0.5)*pSize} ${cx + Math.cos(angle)*(radius+pSize)} ${cy + Math.sin(angle)*(radius+pSize)} Q ${px + Math.cos(angle + 0.5)*pSize} ${py + Math.sin(angle + 0.5)*pSize} ${px} ${py} Z`,
           number: (i % 4) + 1,
           center: {x: cx + Math.cos(angle)*(radius+pSize*0.5), y: cy + Math.sin(angle)*(radius+pSize*0.5)}
        });

        // Inner petal detail
        if (pSize > 8) {
            paths.push({
               id: `rose-petal-in-${i}`,
               d: `M ${px} ${py} Q ${px + Math.cos(angle - 0.3)*(pSize*0.6)} ${py + Math.sin(angle - 0.3)*(pSize*0.6)} ${cx + Math.cos(angle)*(radius+pSize*0.8)} ${cy + Math.sin(angle)*(radius+pSize*0.8)} Q ${px + Math.cos(angle + 0.3)*(pSize*0.6)} ${py + Math.sin(angle + 0.3)*(pSize*0.6)} ${px} ${py} Z`,
               number: 6,
               center: {x: cx + Math.cos(angle)*(radius+pSize*0.4), y: cy + Math.sin(angle)*(radius+pSize*0.4)}
            });
        }
    }

    // Outer thorny vines looping around
    for(let r=0; r<40; r++) {
        const angle = (r/40)*Math.PI*2;
        const dist = 85 + Math.sin(r*3)*5;
        const p1x = cx + Math.cos(angle)*dist;
        const p1y = cy + Math.sin(angle)*dist;

        const nAngle = ((r+1)/40)*Math.PI*2;
        const nDist = 85 + Math.sin((r+1)*3)*5;
        const p2x = cx + Math.cos(nAngle)*nDist;
        const p2y = cy + Math.sin(nAngle)*nDist;

        paths.push({
           id: `vine-${r}`,
           d: `M ${p1x} ${p1y} Q ${cx + Math.cos((angle+nAngle)/2)*(dist+15)} ${cy + Math.sin((angle+nAngle)/2)*(dist+15)} ${p2x} ${p2y} Q ${cx + Math.cos((angle+nAngle)/2)*(dist-5)} ${cy + Math.sin((angle+nAngle)/2)*(dist-5)} ${p1x} ${p1y} Z`,
           number: 7, center: {x: cx + Math.cos((angle+nAngle)/2)*(dist+5), y: cy + Math.sin((angle+nAngle)/2)*(dist+5)}
        });

        // Thorns
        if (r % 2 === 0) {
           const tx = cx + Math.cos(angle)*(dist+10);
           const ty = cy + Math.sin(angle)*(dist+10);
           paths.push({
               id: `thorn-${r}`,
               d: `M ${p1x} ${p1y} L ${tx} ${ty} L ${cx + Math.cos(angle+0.05)*(dist+2)} ${cy + Math.sin(angle+0.05)*(dist+2)} Z`,
               number: 8, center: {x: (p1x+tx)/2, y: (p1y+ty)/2}
           });
        }
    }

    return paths;
};

export const generateZentangleHarmony = () => {
    const paths: any[] = [];
    const cx=100, cy=100;

    // Layered octagrams overlapping
    for(let layer=0; layer<8; layer++) {
        const radius = 90 - layer*10;
        for(let i=0; i<8; i++) {
           const angle = (i * Math.PI*2)/8 + (layer*Math.PI/16);
           const nAngle = ((i+1) * Math.PI*2)/8 + (layer*Math.PI/16);

           const p1x = cx + Math.cos(angle)*radius;
           const p1y = cy + Math.sin(angle)*radius;
           const p2x = cx + Math.cos(nAngle)*radius;
           const p2y = cy + Math.sin(nAngle)*radius;
           const innerX = cx + Math.cos((angle+nAngle)/2)*(radius-15);
           const innerY = cy + Math.sin((angle+nAngle)/2)*(radius-15);

           paths.push({
               id: `harm-${layer}-${i}`,
               d: `M ${p1x} ${p1y} L ${innerX} ${innerY} L ${p2x} ${p2y} Q ${cx + Math.cos((angle+nAngle)/2)*(radius+5)} ${cy + Math.sin((angle+nAngle)/2)*(radius+5)} ${p1x} ${p1y} Z`,
               number: (layer % 5) + 1,
               center: {x: innerX, y: innerY}
           });

           paths.push({
               id: `harm-in-${layer}-${i}`,
               d: `M ${p1x*0.9+innerX*0.1} ${p1y*0.9+innerY*0.1} L ${innerX*0.9+cx*0.1} ${innerY*0.9+cy*0.1} L ${p2x*0.9+innerX*0.1} ${p2y*0.9+innerY*0.1} Z`,
               number: (layer+2) % 5 + 1,
               center: {x: innerX*0.9+cx*0.1, y: innerY*0.9+cy*0.1}
           });
        }
    }

    // Tiny background nodes
    for(let i=0; i<64; i++) {
        const angle = (i * Math.PI*2)/64;
        const r1 = 95;
        paths.push({
            id: `node-${i}`,
            d: `M ${cx + Math.cos(angle)*r1} ${cy + Math.sin(angle)*r1} A 2 2 0 1 0 ${cx + Math.cos(angle)*r1 + 0.1} ${cy + Math.sin(angle)*r1} Z`,
            number: 8, center: {x: cx + Math.cos(angle)*r1, y: cy + Math.sin(angle)*r1}
        });
    }

    return paths;
};
