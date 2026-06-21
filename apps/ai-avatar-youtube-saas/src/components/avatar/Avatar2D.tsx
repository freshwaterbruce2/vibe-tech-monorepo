"use client";

import { useEffect, useRef } from "react";
import { Rive, Layout, Fit, Alignment, StateMachineInputType } from "@rive-app/webgl";
import type { VisemeWeights } from "./useLipSync";

export interface Avatar2DProps {
  riveUrl?: string;
  weights: VisemeWeights;
}

export function dominantViseme(weights: VisemeWeights): number {
  const entries = Object.entries(weights) as Array<[keyof VisemeWeights, number]>;
  if (entries.length === 0) return 0;
  const max = entries.reduce((a, b) => (b[1] > a[1] ? b : a));
  if (max[1] === 0) return 0;
  const map: Record<keyof VisemeWeights, number> = {
    viseme_O: 1,
    viseme_U: 2,
    viseme_aa: 3,
    viseme_E: 4,
  };
  return map[max[0]] ?? 0;
}

export function Avatar2D({ riveUrl, weights }: Avatar2DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const riveRef = useRef<Rive | null>(null);
  const inputsRef = useRef<ReturnType<Rive["stateMachineInputs"]> | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !riveUrl) return;

    const rive = new Rive({
      src: riveUrl,
      canvas,
      autoplay: true,
      stateMachines: "viseme",
      layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
      onLoad: () => {
        inputsRef.current = rive.stateMachineInputs("viseme");
      },
    });

    riveRef.current = rive;

    return () => {
      rive.cleanup();
      riveRef.current = null;
      inputsRef.current = null;
    };
  }, [riveUrl]);

  useEffect(() => {
    const inputs = inputsRef.current;
    if (!inputs) return;

    const visemeInput = inputs.find((input) => input.name === "viseme");
    if (visemeInput && visemeInput.type === StateMachineInputType.Number) {
      visemeInput.value = dominantViseme(weights);
    }
  }, [weights]);

  if (!riveUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-md border border-border bg-secondary p-6 text-center text-sm text-muted-foreground">
        2D avatar placeholder. Configure a Rive file URL to enable vector mouth shapes.
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full rounded-md border border-border"
      aria-label="2D vector avatar fallback"
    />
  );
}
