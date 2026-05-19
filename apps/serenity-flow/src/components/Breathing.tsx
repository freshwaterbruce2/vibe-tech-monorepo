import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

export default function Breathing() {
  const [step, setStep] = useState(0); // 0: inhale, 1: hold, 2: exhale, 3: rest
  const [active, setActive] = useState(false);

  const STEPS = [
    { text: 'Breathe In', duration: 4000, color: 'bg-sky-500/20' },
    { text: 'Hold', duration: 7000, color: 'bg-sky-900/50' },
    { text: 'Breathe Out', duration: 8000, color: 'bg-sky-400/20' },
  ];

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (active) {
      timeout = setTimeout(() => {
        setStep((prev) => (prev + 1) % STEPS.length);
      }, STEPS[step].duration);
    }
    return () => clearTimeout(timeout);
  }, [step, active]);

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative w-64 h-64 flex items-center justify-center cursor-pointer"
        onClick={() => {
          setActive(!active);
          if (!active) setStep(0);
        }}
      >
        <AnimatePresence>
          {active && (
            <motion.div
              initial={{ scale: 1 }}
              animate={{
                scale: step === 0 ? 1.5 : step === 1 ? 1.5 : 1,
              }}
              transition={{
                duration: STEPS[step].duration / 1000,
                ease: "easeInOut"
              }}
              className={`absolute inset-0 rounded-full ${STEPS[step].color} blur-2xl`}
            />
          )}
        </AnimatePresence>

        <motion.div
          animate={{
            scale: active ? (step === 0 ? 1.3 : step === 1 ? 1.3 : 1) : 1,
          }}
          transition={{
            duration: active ? STEPS[step].duration / 1000 : 0.5,
            ease: "easeInOut"
          }}
          className="relative z-10 w-40 h-40 rounded-full border border-white/10 flex flex-col items-center justify-center bg-white/5 glass"
        >
          <span className="text-sm font-serif italic opacity-60">
            {active ? STEPS[step].text : 'Start Deep Breath'}
          </span>
          {!active && (
            <span className="mt-2 text-[10px] uppercase tracking-widest opacity-40">Tap to Center</span>
          )}
        </motion.div>
      </div>

      {active && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-8 text-xs uppercase tracking-widest opacity-40"
        >
          Follow the light
        </motion.p>
      )}
    </div>
  );
}
