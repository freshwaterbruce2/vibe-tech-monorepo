import { useCallback, useEffect, useRef, useState } from 'react';

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

// Minimal Web Speech API types (not in all TS lib versions)
interface SpeechRecognitionResult {
  results: Record<number, Record<number, { transcript: string }>>;
}
interface SpeechRecognitionErrorEvent {
  error: string;
}
interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onstart: (() => void) | null;
  onresult: ((e: SpeechRecognitionResult) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

interface UseVoiceOptions {
  /** Called when the user finishes speaking and a transcript is ready */
  onTranscript?: (text: string) => void;
  /** Language code (default: 'en-US') */
  lang?: string;
}

const TRANSIENT_ERRORS = new Set(['network', 'audio-capture']);
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

export function useVoice({ onTranscript, lang = 'en-US' }: UseVoiceOptions = {}) {
  const [state, setState] = useState<VoiceState>('idle');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const synthRef = useRef(window.speechSynthesis);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep onTranscript in a ref so startListening never captures a stale closure
  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);

  // Clean up pending retry timer on unmount
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  const cancelSpeech = useCallback(() => {
    synthRef.current.cancel();
    setState('idle');
  }, []);

  const speak = useCallback(async (text: string): Promise<void> => {
    synthRef.current.cancel();
    return new Promise((resolve) => {
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = lang;
      utt.rate = 1.05;
      utt.onend = () => { setState('idle'); resolve(); };
      utt.onerror = () => { setState('idle'); resolve(); };
      setState('speaking');
      synthRef.current.speak(utt);
    });
  }, [lang]);

  const stopListening = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    retryCountRef.current = 0;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setState('idle');
  }, []);

  const startListening = useCallback(() => {
    // Barge-in: cancel any in-progress TTS before listening
    if (synthRef.current.speaking) synthRef.current.cancel();

    const SpeechRec =
      (window.SpeechRecognition as (new () => SpeechRecognitionInstance) | undefined) ??
      (window.webkitSpeechRecognition as (new () => SpeechRecognitionInstance) | undefined);

    if (!SpeechRec) {
      console.warn('[useVoice] Web Speech API not supported in this environment');
      return;
    }

    const recognition = new SpeechRec();
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => setState('listening');

    recognition.onresult = (event) => {
      retryCountRef.current = 0; // reset on successful recognition
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) {
        setState('processing');
        onTranscriptRef.current?.(transcript);
      }
    };

    recognition.onerror = (event) => {
      if (TRANSIENT_ERRORS.has(event.error) && retryCountRef.current < MAX_RETRIES) {
        retryCountRef.current += 1;
        console.warn(
          `[useVoice] Transient error "${event.error}", retry ${retryCountRef.current}/${MAX_RETRIES}`
        );
        // Schedule retry after delay; startListening will create a fresh instance
        retryTimerRef.current = setTimeout(() => {
          retryTimerRef.current = null;
          startListening();
        }, RETRY_DELAY_MS);
        return;
      }

      // Permanent error or retries exhausted
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.warn('[useVoice] Recognition error:', event.error);
      }
      retryCountRef.current = 0;
      setState('idle');
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setState((prev) => (prev === 'listening' ? 'idle' : prev));
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [lang]); // lang is the only real dep; onTranscript is read via ref

  const isSupported =
    typeof window !== 'undefined' &&
    !!(window.SpeechRecognition ?? window.webkitSpeechRecognition);

  return { state, startListening, stopListening, speak, cancelSpeech, isSupported };
}
