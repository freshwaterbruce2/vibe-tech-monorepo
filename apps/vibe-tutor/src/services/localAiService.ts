/*
 * Local AI service: zero-cost on-device inference with two backends.
 *
 * - 'chrome-builtin': Chrome 138+ built-in AI task APIs (Gemini Nano).
 *   Writer/Rewriter are origin-trial, Translator/LanguageDetector stable.
 * - 'electron-llm': desktop build, GGUF model through window.electronAi
 *   (@electron/llm); model download is managed via window.electronAPI.localLlm.
 *
 * Neither backend exists in the Capacitor Android WebView; callers must treat
 * 'none' as a normal state and degrade UI gracefully.
 */

import { logger } from '../utils/logger';

export type LocalAiBackend = 'chrome-builtin' | 'electron-llm' | 'none';
export type LocalAiStatus = 'available' | 'downloadable' | 'downloading' | 'unavailable';

export interface LocalAiModelState {
  backend: LocalAiBackend;
  status: LocalAiStatus;
  progress: number;
}

export type RewriteTone = 'as-is' | 'more-formal' | 'more-casual';
export type RewriteLength = 'as-is' | 'shorter' | 'longer';

const ELECTRON_MODEL_ALIAS = 'study-helper';

const ELECTRON_SYSTEM_PROMPT =
  'You are a friendly study helper for students. Answer with only the requested ' +
  'text, no preamble and no explanations about yourself.';

let electronSessionReady = false;

function getWriterFactory(): WriterFactory | undefined {
  if (typeof window !== 'undefined' && window.ai?.writer) return window.ai.writer;
  if (typeof Writer !== 'undefined') return Writer;
  return undefined;
}

function getRewriterFactory(): RewriterFactory | undefined {
  if (typeof window !== 'undefined' && window.ai?.rewriter) return window.ai.rewriter;
  if (typeof Rewriter !== 'undefined') return Rewriter;
  return undefined;
}

function getTranslatorFactory(): TranslatorFactory | undefined {
  if (typeof window !== 'undefined' && window.ai?.translator) return window.ai.translator;
  if (typeof Translator !== 'undefined') return Translator;
  return undefined;
}

function getLanguageDetectorFactory(): LanguageDetectorFactory | undefined {
  if (typeof window !== 'undefined' && window.ai?.languageDetector) return window.ai.languageDetector;
  if (typeof LanguageDetector !== 'undefined') return LanguageDetector;
  return undefined;
}

export function detectBackend(): LocalAiBackend {
  if (getWriterFactory() || getRewriterFactory()) {
    return 'chrome-builtin';
  }
  if (typeof window !== 'undefined' && window.electronAi && window.electronAPI?.localLlm) {
    return 'electron-llm';
  }
  return 'none';
}

/** Translator/LanguageDetector ship independently of Writer in Chrome. */
export function isTranslatorSupported(): boolean {
  return !!getTranslatorFactory() || detectBackend() === 'electron-llm';
}

async function chromeWriterStatus(): Promise<LocalAiStatus> {
  const factory = getWriterFactory() ?? getRewriterFactory();
  if (!factory) return 'unavailable';
  try {
    return await factory.availability();
  } catch (error) {
    logger.warn('Built-in AI availability check failed:', error);
    return 'unavailable';
  }
}

export async function getModelState(): Promise<LocalAiModelState> {
  const backend = detectBackend();

  if (backend === 'chrome-builtin') {
    const status = await chromeWriterStatus();
    return { backend, status, progress: status === 'available' ? 1 : 0 };
  }

  const bridge = window.electronAPI?.localLlm;
  if (backend === 'electron-llm' && bridge) {
    const { state, progress } = await bridge.getStatus();
    return { backend, status: state, progress };
  }

  return { backend: 'none', status: 'unavailable', progress: 0 };
}

/**
 * Triggers the model download for the active backend. Must be called from a
 * user gesture (Chrome requires user activation to start the Gemini Nano
 * download). Resolves true when the model is ready.
 */
export async function downloadModel(onProgress: (loaded: number) => void): Promise<boolean> {
  const backend = detectBackend();

  if (backend === 'chrome-builtin') {
    const factory = getWriterFactory() ?? getRewriterFactory();
    if (!factory) return false;
    try {
      const instance = await factory.create({
        monitor(m) {
          m.addEventListener('downloadprogress', (e) => onProgress(e.loaded));
        },
      });
      instance.destroy();
      return true;
    } catch (error) {
      logger.error('Gemini Nano download failed:', error);
      return false;
    }
  }

  const bridge = window.electronAPI?.localLlm;
  if (backend === 'electron-llm' && bridge) {
    const unsubscribe = bridge.onDownloadProgress(onProgress);
    try {
      const result = await bridge.downloadModel();
      if (!result.ok) {
        logger.error('Local model download failed:', result.error);
      }
      return result.ok;
    } finally {
      unsubscribe();
    }
  }

  return false;
}

async function promptElectron(input: string): Promise<string> {
  if (!window.electronAi) {
    throw new Error('Local model bridge is not available');
  }
  if (!electronSessionReady) {
    await window.electronAi.create({
      modelAlias: ELECTRON_MODEL_ALIAS,
      systemPrompt: ELECTRON_SYSTEM_PROMPT,
      temperature: 0.7,
    });
    electronSessionReady = true;
  }
  return window.electronAi.prompt(input, { timeout: 60_000 });
}

/** Expands bullet points or terse notes into full, student-friendly prose. */
export async function expandText(text: string, context?: string): Promise<string> {
  const backend = detectBackend();
  const writerFactory = getWriterFactory();

  if (backend === 'chrome-builtin' && writerFactory) {
    const writer = await writerFactory.create({
      tone: 'casual',
      format: 'plain-text',
      length: 'long',
      sharedContext: context,
    });
    try {
      return await writer.write(`Expand these notes into clear paragraphs:\n${text}`);
    } finally {
      writer.destroy();
    }
  }

  if (backend === 'electron-llm') {
    const contextPart = context ? `Context: ${context}\n` : '';
    return promptElectron(
      `${contextPart}Expand the following bullet points into clear, encouraging ` +
        `paragraphs a student can follow. Keep the original meaning.\n\n${text}`,
    );
  }

  throw new Error('No local AI backend available');
}

/** Adjusts tone and/or length of existing text. */
export async function rewriteText(
  text: string,
  options: { tone?: RewriteTone; length?: RewriteLength },
  context?: string,
): Promise<string> {
  const backend = detectBackend();
  const rewriterFactory = getRewriterFactory();

  if (backend === 'chrome-builtin' && rewriterFactory) {
    const rewriter = await rewriterFactory.create({
      tone: options.tone ?? 'as-is',
      length: options.length ?? 'as-is',
      format: 'plain-text',
      sharedContext: context,
    });
    try {
      return await rewriter.rewrite(text);
    } finally {
      rewriter.destroy();
    }
  }

  if (backend === 'electron-llm') {
    const toneInstruction =
      options.tone === 'more-formal'
        ? 'more formal'
        : options.tone === 'more-casual'
          ? 'more casual and friendly'
          : 'the same tone';
    const lengthInstruction =
      options.length === 'shorter'
        ? 'shorter'
        : options.length === 'longer'
          ? 'longer and more detailed'
          : 'about the same length';
    return promptElectron(
      `Rewrite the following text in ${toneInstruction}, making it ${lengthInstruction}. ` +
        `Reply with only the rewritten text.\n\n${text}`,
    );
  }

  throw new Error('No local AI backend available');
}

async function detectLanguage(text: string): Promise<string> {
  const detectorFactory = getLanguageDetectorFactory();
  if (detectorFactory) {
    try {
      const detector = await detectorFactory.create();
      const results = await detector.detect(text);
      detector.destroy();
      const best = results[0];
      if (best && best.confidence > 0.4) {
        return best.detectedLanguage;
      }
    } catch (error) {
      logger.warn('Language detection failed, assuming English:', error);
    }
  }
  return 'en';
}

export interface TranslationResult {
  translated: string;
  detectedLanguage: string;
}

/** Translates study material into the student's language, fully on-device. */
export async function translateText(
  text: string,
  targetLanguage: string,
): Promise<TranslationResult> {
  const backend = detectBackend();
  const translatorFactory = getTranslatorFactory();

  if (translatorFactory) {
    const sourceLanguage = await detectLanguage(text);
    if (sourceLanguage === targetLanguage) {
      return { translated: text, detectedLanguage: sourceLanguage };
    }
    const translator = await translatorFactory.create({ sourceLanguage, targetLanguage });
    try {
      const translated = await translator.translate(text);
      return { translated, detectedLanguage: sourceLanguage };
    } finally {
      translator.destroy();
    }
  }

  if (backend === 'electron-llm') {
    const translated = await promptElectron(
      `Translate the following text into the language with BCP-47 code "${targetLanguage}". ` +
        `Reply with only the translation.\n\n${text}`,
    );
    return { translated, detectedLanguage: 'auto' };
  }

  throw new Error('No local AI backend available');
}
