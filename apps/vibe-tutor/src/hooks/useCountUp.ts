import { useEffect, useRef, useState } from 'react';

/** Animates a number counting up from 0 to target using an ease-out cubic curve. */
export function useCountUp(target: number, durationMs = 800): number {
  const [value, setValue] = useState(0);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [target, durationMs]);

  return value;
}
