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

interface UseVoiceOptions {
  /** Called when the user finishes speaking and a transcript is ready */
  onTranscript?: (text: string) => void;
  /** Language code (default: 'en-US') */
  lang?: string;
}

export function useVoice({ onTranscript, lang = 'en-US' }: UseVoiceOptions = {}) {
  const [state, setState] = useState<VoiceState>('idle');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const synthRef = useRef(window.speechSynthesis);

  // Keep onTranscript in a ref so startListening never captures a stale closure
  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);

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
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setState('idle');
  }, []);

  const startListening = useCallback(() => {
    // Barge-in: cancel any in-progress TTS before listening
    if (synthRef.current.speaking) synthRef.current.cancel();

    const w = window as unknown as Record<string, unknown>;
    const SpeechRec = (w['SpeechRecognition'] || w['webkitSpeechRecognition']) as
      | (new () => SpeechRecognitionInstance)
      | undefined;

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
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) {
        setState('processing');
        onTranscriptRef.current?.(transcript);
      }
    };

    recognition.onerror = (event) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.warn('[useVoice] Recognition error:', event.error);
      }
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
    !!((window as unknown as Record<string, unknown>)['SpeechRecognition'] ||
      (window as unknown as Record<string, unknown>)['webkitSpeechRecognition']);

  return { state, startListening, stopListening, speak, cancelSpeech, isSupported };
}
