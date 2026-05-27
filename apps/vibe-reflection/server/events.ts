import type { Response } from 'express';

export type ReflectionEvent =
  | { type: 'generator_start'; pass: number }
  | { type: 'token'; pass: number; role: 'generator' | 'reviser'; text: string }
  | { type: 'generator_done'; pass: number; output: string; cost: number }
  | { type: 'critic_start'; pass: number; criticId: 1 | 2 }
  | { type: 'critique_raw'; pass: number; criticId: 1 | 2; score: number; issues: string[]; suggestions: string[] }
  | { type: 'synthesis'; pass: number; score: number; approved: boolean; issues: string[]; suggestions: string[] }
  | { type: 'cost_update'; totalCost: number; costLimit: number }
  | { type: 'complete'; finalOutput: string; totalCost: number; passes: number }
  | { type: 'error'; message: string };

export function initSSE(res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
}

export function sendEvent(res: Response, event: ReflectionEvent): void {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

export function closeSSE(res: Response): void {
  res.write('data: [DONE]\n\n');
  res.end();
}
