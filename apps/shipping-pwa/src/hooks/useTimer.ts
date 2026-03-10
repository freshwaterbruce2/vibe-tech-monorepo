import { useState, useEffect } from "react";

export function useTimer(initial?: number) {
  const [elapsed, setElapsed] = useState(initial ?? 0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;

    const id = setInterval(() => setElapsed((e) => e + 1), 1000);

    return () => clearInterval(id);
  }, [running]);

  return {
    elapsed,
    running,
    start: () => setRunning(true),
    stop: () => setRunning(false),
    reset: () => setElapsed(0),
  };
}

export function formatHHMMSS(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return [
    hours.toString().padStart(2, "0"),
    minutes.toString().padStart(2, "0"),
    remainingSeconds.toString().padStart(2, "0"),
  ].join(":");
}
