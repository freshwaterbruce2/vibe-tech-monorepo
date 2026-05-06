import { cn } from "@vibetech/shared-utils";

export { cn };

export function formatCost(usd: number): string {
  if (usd < 0.001) return '<$0.001';
  return `$${usd.toFixed(3)}`;
}

export function scoreColor(score: number): string {
  if (score >= 0.85) return 'var(--success)';
  if (score >= 0.70) return 'var(--warning)';
  return 'var(--danger)';
}

export function scoreLabel(score: number): string {
  if (score >= 0.85) return 'Approved';
  if (score >= 0.70) return 'Needs Work';
  return 'Poor';
}
