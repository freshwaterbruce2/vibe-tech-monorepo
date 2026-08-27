import type { VisemeWeights } from "./useLipSync";

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
