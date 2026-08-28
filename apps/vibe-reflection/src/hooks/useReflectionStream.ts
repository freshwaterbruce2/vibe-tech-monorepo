import { useCallback, useReducer, useRef } from 'react';
import type { ReflectionEvent, ReflectionState, PassState } from '../types.js';

// ── rAF token buffer (perf enhancement) ──────────────────────────────────────
// Never call setState per-token. Buffer in a ref, flush at 60fps.
function useTokenBuffer(
  dispatch: React.Dispatch<Action>,
) {
  const buffer = useRef<Array<{ pass: number; text: string }>>([]);
  const rafId  = useRef<number | null>(null);

  return useCallback((pass: number, text: string) => {
    buffer.current.push({ pass, text });
    if (rafId.current !== null) return;
    rafId.current = requestAnimationFrame(() => {
      const flush = buffer.current.splice(0);
      rafId.current = null;
      for (const { pass: p, text: t } of flush) {
        dispatch({ type: 'APPEND_TOKENS', pass: p, text: t });
      }
    });
  }, [dispatch]);
}

// ── Reducer ───────────────────────────────────────────────────────────────────
type Action =
  | { type: 'SUBMIT' }
  | { type: 'GENERATOR_START'; pass: number }
  | { type: 'APPEND_TOKENS'; pass: number; text: string }
  | { type: 'GENERATOR_DONE'; pass: number; output: string; cost: number }
  | { type: 'CRITIC_START'; pass: number; criticId: 1 | 2 }
  | { type: 'CRITIQUE_RAW'; pass: number; criticId: 1 | 2; score: number; issues: string[]; suggestions: string[] }
  | { type: 'SYNTHESIS'; pass: number; score: number; approved: boolean; issues: string[]; suggestions: string[] }
  | { type: 'COST_UPDATE'; totalCost: number; costLimit: number }
  | { type: 'COMPLETE'; totalCost: number; passes: number }
  | { type: 'ERROR'; message: string };

const initial: ReflectionState = {
  status: 'idle',
  passes: [],
  totalCost: 0,
  costLimit: 0.50,
};

function getOrCreatePass(passes: PassState[], pass: number): PassState[] {
  if (passes.find(p => p.pass === pass)) return passes;
  return [...passes, { pass, output: '', streaming: false }];
}

function updatePass(passes: PassState[], pass: number, update: Partial<PassState>): PassState[] {
  return passes.map(p => p.pass === pass ? { ...p, ...update } : p);
}

function reducer(state: ReflectionState, action: Action): ReflectionState {
  switch (action.type) {
    case 'SUBMIT':
      return { ...initial, status: 'running' };

    case 'GENERATOR_START':
      return {
        ...state,
        passes: [...getOrCreatePass(state.passes, action.pass)].map(p =>
          p.pass === action.pass ? { ...p, streaming: true } : p
        ),
      };

    case 'APPEND_TOKENS':
      return {
        ...state,
        passes: updatePass(state.passes, action.pass, {
          output: (state.passes.find(p => p.pass === action.pass)?.output ?? '') + action.text,
        }),
      };

    case 'GENERATOR_DONE':
      return {
        ...state,
        passes: updatePass(state.passes, action.pass, { streaming: false }),
      };

    case 'SYNTHESIS': {
      const existing = state.passes.find(p => p.pass === action.pass)?.critique;
      return {
        ...state,
        passes: updatePass(state.passes, action.pass, {
          critique: {
            ...existing,
            score: action.score,
            approved: action.approved,
            issues: action.issues,
            suggestions: action.suggestions,
          },
        }),
      };
    }

    case 'CRITIQUE_RAW': {
      const existing = state.passes.find(p => p.pass === action.pass)?.critique;
      const key = action.criticId === 1 ? 'criticA' : 'criticB';
      return {
        ...state,
        passes: updatePass(state.passes, action.pass, {
          critique: {
            score: existing?.score ?? 0,
            approved: existing?.approved ?? false,
            issues: existing?.issues ?? [],
            suggestions: existing?.suggestions ?? [],
            ...existing,
            [key]: { score: action.score, issues: action.issues, suggestions: action.suggestions },
          },
        }),
      };
    }

    case 'COST_UPDATE':
      return { ...state, totalCost: action.totalCost, costLimit: action.costLimit };

    case 'COMPLETE':
      return { ...state, status: 'complete', totalCost: action.totalCost };

    case 'ERROR':
      return { ...state, status: 'error', errorMessage: action.message };

    default:
      return state;
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useReflectionStream() {
  const [state, dispatch] = useReducer(reducer, initial);
  const esRef = useRef<EventSource | null>(null);
  const appendToken = useTokenBuffer(dispatch);

  const start = useCallback(async (task: string) => {
    esRef.current?.close();
    dispatch({ type: 'SUBMIT' });

    // Create job
    const res = await fetch('/api/reflect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task }),
    });
    const { jobId } = await res.json() as { jobId: string };

    // Open SSE stream
    const es = new EventSource(`/api/reflect/${jobId}/stream`);
    esRef.current = es;

    es.onmessage = (e: MessageEvent<string>) => {
      if (e.data === '[DONE]') { es.close(); return; }

      const event = JSON.parse(e.data) as ReflectionEvent;

      switch (event.type) {
        case 'generator_start':
          dispatch({ type: 'GENERATOR_START', pass: event.pass });
          break;
        case 'token':
          // rAF-buffered — never dispatches synchronously
          appendToken(event.pass, event.text);
          break;
        case 'generator_done':
          dispatch({ type: 'GENERATOR_DONE', pass: event.pass, output: event.output, cost: event.cost });
          break;
        case 'critique_raw':
          dispatch({ type: 'CRITIQUE_RAW', pass: event.pass, criticId: event.criticId, score: event.score, issues: event.issues, suggestions: event.suggestions });
          break;
        case 'synthesis':
          dispatch({ type: 'SYNTHESIS', pass: event.pass, score: event.score, approved: event.approved, issues: event.issues, suggestions: event.suggestions });
          break;
        case 'cost_update':
          dispatch({ type: 'COST_UPDATE', totalCost: event.totalCost, costLimit: event.costLimit });
          break;
        case 'complete':
          dispatch({ type: 'COMPLETE', totalCost: event.totalCost, passes: event.passes });
          es.close();
          break;
        case 'error':
          dispatch({ type: 'ERROR', message: event.message });
          es.close();
          break;
      }
    };

    es.onerror = () => {
      dispatch({ type: 'ERROR', message: 'Stream connection lost' });
      es.close();
    };
  }, [appendToken]);

  const cancel = useCallback(() => {
    esRef.current?.close();
    dispatch({ type: 'ERROR', message: 'Cancelled' });
  }, []);

  return { state, start, cancel };
}
