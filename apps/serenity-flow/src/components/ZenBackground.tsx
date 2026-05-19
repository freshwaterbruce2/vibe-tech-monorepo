import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  type: 'sparkle' | 'butterfly';
  size: number;
  angle: number;
  wingSpeed: number;
  time: number;
}

export default function ZenBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const mouse = useRef({ x: -100, y: -100, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resize);
    resize();

    const colors = ['#bae6fd', '#7dd3fc', '#38bdf8', '#0ea5e9', '#e0f2fe'];

    const createParticle = (x: number, y: number, type: 'sparkle' | 'butterfly'): Particle => {
      const angle = Math.random() * Math.PI * 2;
      const speed = type === 'butterfly' ? (Math.random() * 0.4 + 0.2) : (Math.random() * 1.5 + 0.5);
      return {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: type === 'butterfly' ? (Math.random() * 2 + 2) : 1, // butterflies live longer
        color: colors[Math.floor(Math.random() * colors.length)],
        type,
        size: type === 'butterfly' ? (Math.random() * 6 + 8) : (Math.random() * 3 + 1),
        angle: angle,
        wingSpeed: Math.random() * 0.1 + 0.05,
        time: Math.random() * 100,
      };
    };

    const spawnAmbient = () => {
      if (particles.current.filter(p => p.type === 'butterfly').length < 12) {
         const x = Math.random() < 0.5 ? -20 : canvas.width + 20;
         const y = Math.random() * canvas.height;
         const b = createParticle(x, y, 'butterfly');
         const angleToCenter = Math.atan2(canvas.height/2 - y, canvas.width/2 - x);
         b.vx = Math.cos(angleToCenter + (Math.random()-0.5)) * 0.6;
         b.vy = Math.sin(angleToCenter + (Math.random()-0.5)) * 0.6;
         b.angle = Math.atan2(b.vy, b.vx);
         particles.current.push(b);
      }
    };

    // Spawn initial butterflies
    for(let i=0; i<8; i++) spawnAmbient();
    const spawnInterval = setInterval(spawnAmbient, 2000);

    const animate = () => {
      ctx.fillStyle = 'rgba(240, 249, 255, 0.4)'; // match background root fade (light blue theme)
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (mouse.current.active) {
        for (let i = 0; i < 2; i++) {
          particles.current.push(createParticle(mouse.current.x, mouse.current.y, 'sparkle'));
        }
      }

      for (let i = particles.current.length - 1; i >= 0; i--) {
        const p = particles.current[i];
        p.time += p.wingSpeed;

        if (p.type === 'butterfly') {
          p.x += p.vx + Math.cos(p.time) * 0.5;
          p.y += p.vy + Math.sin(p.time * 0.8) * 0.5;
          p.angle = Math.atan2(p.vy, p.vx);
          p.life -= 0.002;
        } else {
          p.x += p.vx;
          p.y += p.vy;
          p.life -= 0.01;
        }

        if (p.life <= 0 || p.x < -50 || p.x > canvas.width + 50 || p.y < -50 || p.y > canvas.height + 50) {
          particles.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.type === 'butterfly' ? p.angle + Math.PI/2 : 0);

        if (p.type === 'butterfly') {
          const flap = Math.abs(Math.cos(p.time));
          const wingW = p.size * (0.4 + flap * 1.2);

          ctx.globalAlpha = Math.min(p.life, 0.6);
          ctx.fillStyle = p.color;

          // upper left wing
          ctx.beginPath();
          ctx.moveTo(-1, 0);
          ctx.bezierCurveTo(-wingW * 0.5, -p.size * 1.2, -wingW, -p.size * 0.8, -wingW, -p.size * 0.2);
          ctx.quadraticCurveTo(-wingW * 0.6, p.size * 0.1, -1, 0);
          ctx.fill();

          // lower left wing
          ctx.beginPath();
          ctx.moveTo(-1, 0);
          ctx.quadraticCurveTo(-wingW * 0.8, p.size * 0.3, -wingW * 0.7, p.size);
          ctx.quadraticCurveTo(-wingW * 0.2, p.size * 0.8, -1, p.size * 0.6);
          ctx.fill();

          // upper right wing
          ctx.beginPath();
          ctx.moveTo(1, 0);
          ctx.bezierCurveTo(wingW * 0.5, -p.size * 1.2, wingW, -p.size * 0.8, wingW, -p.size * 0.2);
          ctx.quadraticCurveTo(wingW * 0.6, p.size * 0.1, 1, 0);
          ctx.fill();

          // lower right wing
          ctx.beginPath();
          ctx.moveTo(1, 0);
          ctx.quadraticCurveTo(wingW * 0.8, p.size * 0.3, wingW * 0.7, p.size);
          ctx.quadraticCurveTo(wingW * 0.2, p.size * 0.8, 1, p.size * 0.6);
          ctx.fill();

          // tiny glowing body
          ctx.globalAlpha = Math.min(p.life, 0.9);
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.ellipse(0, p.size * 0.1, p.size/4, p.size/1.5, 0, 0, Math.PI*2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.life * p.size * 2, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.life * 0.5;
          ctx.fill();
        }
        ctx.restore();
      }

      requestAnimationFrame(animate);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
      mouse.current.active = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) {
        mouse.current.x = e.touches[0].clientX;
        mouse.current.y = e.touches[0].clientY;
        mouse.current.active = true;
      }
    };

    const handleStop = () => {
      mouse.current.active = false;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('mouseup', handleStop);
    window.addEventListener('touchend', handleStop);

    const animationId = animate();

    return () => {
      clearInterval(spawnInterval);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('mouseup', handleStop);
      window.removeEventListener('touchend', handleStop);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 bg-[#f0f9ff]"
      style={{ touchAction: 'none' }}
    />
  );
}
