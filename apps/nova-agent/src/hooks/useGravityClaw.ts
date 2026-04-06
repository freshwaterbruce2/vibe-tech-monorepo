import { useCallback, useRef, useState } from 'react';

const GRAVITY_CLAW_URL =
  (import.meta.env.VITE_GRAVITY_CLAW_URL as string | undefined) ?? 'http://localhost:5187';

/** Model sent to GravityClaw — override with VITE_GRAVITY_CLAW_MODEL env var */
const GRAVITY_CLAW_MODEL =
  (import.meta.env.VITE_GRAVITY_CLAW_MODEL as string | undefined) ?? 'gemini-3.1-pro-preview-customtools';

export interface GCMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface UseGravityClawReturn {
  sendMessage: (
    messages: GCMessage[],
    opts?: { model?: string; onChunk?: (chunk: string) => void }
  ) => Promise<string>;
  isStreaming: boolean;
  abort: () => void;
  url: string;
  model: string;
}

export function useGravityClaw(): UseGravityClawReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (
      messages: GCMessage[],
      { model = GRAVITY_CLAW_MODEL, onChunk }: { model?: string; onChunk?: (chunk: string) => void } = {}
    ): Promise<string> => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setIsStreaming(true);

      try {
        const res = await fetch(`${GRAVITY_CLAW_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages, model }),
          signal: ac.signal,
        });

        if (!res.ok) {
          let errMsg = `HTTP ${res.status}`;
          try {
            const errBody = (await res.json()) as { error?: string };
            if (errBody.error) errMsg = errBody.error;
          } catch {
            // ignore parse error
          }
          throw new Error(errMsg);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error('No response body from GravityClaw');

        const decoder = new TextDecoder();
        let full = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          full += chunk;
          onChunk?.(chunk);
        }

        return full;
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    []
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  return { sendMessage, isStreaming, abort, url: GRAVITY_CLAW_URL, model: GRAVITY_CLAW_MODEL };
}
