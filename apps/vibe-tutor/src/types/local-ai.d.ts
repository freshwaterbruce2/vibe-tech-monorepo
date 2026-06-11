/*
 * Ambient declarations for on-device AI backends.
 *
 * 1. Chrome built-in AI task APIs (Gemini Nano) exposed as globals in
 *    Chrome 138+: Writer, Rewriter, Translator, LanguageDetector.
 *    Shapes follow developer.chrome.com/docs/ai (2026 API surface).
 *    These globals are undefined outside supported Chrome builds, so every
 *    declaration is `| undefined` to force feature-detection at call sites.
 *
 * 2. window.electronAi injected by @electron/llm's preload in the desktop
 *    build (GGUF model via node-llama-cpp in the main process).
 */

declare global {
  /** Availability states shared by all built-in AI task APIs. */
  type LocalAiAvailability = 'unavailable' | 'downloadable' | 'downloading' | 'available';

  interface LocalAiDownloadProgressEvent extends Event {
    /** Fraction of the download completed, 0..1. */
    readonly loaded: number;
  }

  interface LocalAiCreateMonitor extends EventTarget {
    addEventListener(
      type: 'downloadprogress',
      listener: (event: LocalAiDownloadProgressEvent) => void,
    ): void;
  }

  type LocalAiMonitorCallback = (monitor: LocalAiCreateMonitor) => void;

  interface WriterCreateOptions {
    tone?: 'formal' | 'neutral' | 'casual';
    format?: 'markdown' | 'plain-text';
    length?: 'short' | 'medium' | 'long';
    sharedContext?: string;
    outputLanguage?: string;
    signal?: AbortSignal;
    monitor?: LocalAiMonitorCallback;
  }

  interface WriterInstance {
    write(input: string, options?: { context?: string; signal?: AbortSignal }): Promise<string>;
    writeStreaming(input: string, options?: { context?: string }): AsyncIterable<string>;
    destroy(): void;
  }

  interface WriterFactory {
    availability(): Promise<LocalAiAvailability>;
    create(options?: WriterCreateOptions): Promise<WriterInstance>;
  }

  interface RewriterCreateOptions {
    tone?: 'as-is' | 'more-formal' | 'more-casual';
    format?: 'as-is' | 'markdown' | 'plain-text';
    length?: 'as-is' | 'shorter' | 'longer';
    sharedContext?: string;
    signal?: AbortSignal;
    monitor?: LocalAiMonitorCallback;
  }

  interface RewriterInstance {
    rewrite(input: string, options?: { context?: string; signal?: AbortSignal }): Promise<string>;
    rewriteStreaming(input: string, options?: { context?: string }): AsyncIterable<string>;
    destroy(): void;
  }

  interface RewriterFactory {
    availability(): Promise<LocalAiAvailability>;
    create(options?: RewriterCreateOptions): Promise<RewriterInstance>;
  }

  interface TranslatorCreateOptions {
    sourceLanguage: string;
    targetLanguage: string;
    signal?: AbortSignal;
    monitor?: LocalAiMonitorCallback;
  }

  interface TranslatorInstance {
    translate(input: string, options?: { signal?: AbortSignal }): Promise<string>;
    translateStreaming(input: string): AsyncIterable<string>;
    destroy(): void;
  }

  interface TranslatorFactory {
    availability(options: {
      sourceLanguage: string;
      targetLanguage: string;
    }): Promise<LocalAiAvailability>;
    create(options: TranslatorCreateOptions): Promise<TranslatorInstance>;
  }

  interface LanguageDetectionResult {
    detectedLanguage: string;
    confidence: number;
  }

  interface LanguageDetectorInstance {
    detect(input: string): Promise<LanguageDetectionResult[]>;
    destroy(): void;
  }

  interface LanguageDetectorFactory {
    availability(): Promise<LocalAiAvailability>;
    create(options?: {
      signal?: AbortSignal;
      monitor?: LocalAiMonitorCallback;
    }): Promise<LanguageDetectorInstance>;
  }

  /** Renderer API injected by @electron/llm (desktop build only). */
  interface ElectronAiApi {
    create(options: {
      modelAlias: string;
      systemPrompt?: string;
      temperature?: number;
      topK?: number;
    }): Promise<void>;
    prompt(
      input: string,
      options?: { timeout?: number; requestUUID?: string },
    ): Promise<string>;
    promptStreaming(
      input: string,
      options?: { timeout?: number; requestUUID?: string },
    ): Promise<AsyncIterableIterator<string>>;
    destroy(): Promise<void>;
    abortRequest(requestUUID: string): void;
  }

  interface ChromeAiNamespace {
    writer?: WriterFactory;
    rewriter?: RewriterFactory;
    translator?: TranslatorFactory;
    languageDetector?: LanguageDetectorFactory;
  }

  // eslint-disable-next-line no-var
  var Writer: WriterFactory | undefined;
  // eslint-disable-next-line no-var
  var Rewriter: RewriterFactory | undefined;
  // eslint-disable-next-line no-var
  var Translator: TranslatorFactory | undefined;
  // eslint-disable-next-line no-var
  var LanguageDetector: LanguageDetectorFactory | undefined;

  interface Window {
    electronAi?: ElectronAiApi;
    ai?: ChromeAiNamespace;
  }
}

export {};
