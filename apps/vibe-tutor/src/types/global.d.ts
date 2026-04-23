interface Window {
  // Custom Vibe Tutor globals
  __JAMENDO_CLIENT_ID__?: string;
  __API_URL__?: string;

  // Experimental Web Speech API
  SpeechRecognition: typeof SpeechRecognition;
  webkitSpeechRecognition: typeof SpeechRecognition;
  electronAPI: {
    store: {
      get: (key: string) => unknown;
      set: (key: string, value: unknown) => void;
      delete: (key: string) => void;
      clear: () => void;
    };
    isElectron?: boolean;
    selectImportFile: () => Promise<string | null>;
    ingestAndroidExport: (content: string) => Promise<{ inserted: number; skipped: number; total: number }>;
  };
}

// Minimal SpeechRecognition definitions if not available in lib.dom.d.ts
// We use 'declare var' or class interface merging to ensure it exists globally
declare class SpeechRecognition extends EventTarget {
  constructor();
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
  interpretation: unknown;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}
