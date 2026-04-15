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

export interface PassState {
  pass: number;
  output: string;
  streaming: boolean;
  critique?: {
    score: number;
    approved: boolean;
    issues: string[];
    suggestions: string[];
    criticA?: { score: number; issues: string[]; suggestions: string[] };
    criticB?: { score: number; issues: string[]; suggestions: string[] };
  };
}

export interface ReflectionState {
  status: 'idle' | 'running' | 'complete' | 'error';
  passes: PassState[];
  totalCost: number;
  costLimit: number;
  errorMessage?: string;
}
