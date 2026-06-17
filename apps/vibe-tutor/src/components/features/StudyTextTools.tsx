import { useState } from 'react';
import { useLocalAI } from '../../hooks/useLocalAI';
import {
  expandText,
  isTranslatorSupported,
  rewriteText,
  translateText,
  type RewriteLength,
  type RewriteTone,
} from '../../services/localAiService';
import { featureFlags } from '../../services/featureFlags';
import { logger } from '../../utils/logger';
import ModelDownloadCard from './ModelDownloadCard';

interface StudyTextToolsProps {
  /** The study text the tools operate on (e.g. breakdown steps, notes). */
  text: string;
  /** Short description of where the text comes from, improves AI output. */
  context?: string;
}

const LANGUAGES: Array<{ code: string; label: string }> = [
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ar', label: 'Arabic' },
];

/**
 * On-device AI study tools: expand bullet points into paragraphs, adjust
 * tone/length, and translate study material -- all local, no network calls.
 * Renders nothing when no local AI backend exists (e.g. Android WebView).
 */
const StudyTextTools = ({ text, context }: StudyTextToolsProps) => {
  const localAi = useLocalAI();
  const [output, setOutput] = useState<string | null>(null);
  const [outputLabel, setOutputLabel] = useState('');
  const [isWorking, setIsWorking] = useState(false);
  const [toolError, setToolError] = useState<string | null>(null);
  const [tone, setTone] = useState<RewriteTone>('as-is');
  const [length, setLength] = useState<RewriteLength>('as-is');
  const [language, setLanguage] = useState('es');

  if (!featureFlags.isEnabled('localAiTools') || localAi.backend === 'none') {
    return null;
  }

  if (localAi.status !== 'available') {
    return <ModelDownloadCard localAi={localAi} />;
  }

  const runTool = async (label: string, task: () => Promise<string>) => {
    setIsWorking(true);
    setToolError(null);
    setOutputLabel(label);
    try {
      setOutput(await task());
    } catch (error) {
      logger.error(`Local AI tool "${label}" failed:`, error);
      setOutput(null);
      setToolError('That did not work this time. Please try again.');
    } finally {
      setIsWorking(false);
    }
  };

  const handleExpand = () => {
    void runTool('Expanded notes', async () => expandText(text, context));
  };

  const handleRewrite = () => {
    void runTool('Rewritten text', async () => rewriteText(text, { tone, length }, context));
  };

  const handleTranslate = () => {
    void runTool(
      `Translated (${LANGUAGES.find((l) => l.code === language)?.label ?? language})`,
      async () => (await translateText(output ?? text, language)).translated,
    );
  };

  const selectClass =
    'bg-slate-700 text-text-primary text-sm rounded-md px-2 py-1.5 border border-slate-600';
  const buttonClass =
    'px-3 py-1.5 rounded-md bg-[var(--secondary-accent)] text-background-main ' +
    'font-semibold text-sm hover:opacity-90 disabled:opacity-50';

  return (
    <div className="mt-4 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
      <p className="text-sm font-bold uppercase text-slate-400 mb-3">
        Study Tools (on-device AI)
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={buttonClass} onClick={handleExpand} disabled={isWorking}>
          Explain in full sentences
        </button>

        <span className="mx-1 text-slate-600">|</span>

        <select
          className={selectClass}
          value={tone}
          onChange={(e) => setTone(e.target.value as RewriteTone)}
          aria-label="Tone adjustment"
        >
          <option value="as-is">Same tone</option>
          <option value="more-casual">Friendlier</option>
          <option value="more-formal">More formal</option>
        </select>
        <select
          className={selectClass}
          value={length}
          onChange={(e) => setLength(e.target.value as RewriteLength)}
          aria-label="Length adjustment"
        >
          <option value="as-is">Same length</option>
          <option value="shorter">Shorter</option>
          <option value="longer">Longer</option>
        </select>
        <button
          type="button"
          className={buttonClass}
          onClick={handleRewrite}
          disabled={isWorking || (tone === 'as-is' && length === 'as-is')}
        >
          Rewrite
        </button>

        {isTranslatorSupported() && (
          <>
            <span className="mx-1 text-slate-600">|</span>
            <select
              className={selectClass}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              aria-label="Translation language"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={buttonClass}
              onClick={handleTranslate}
              disabled={isWorking}
            >
              Translate
            </button>
          </>
        )}
      </div>

      {isWorking && (
        <p className="text-sm text-text-secondary mt-3 animate-pulse">AI is working on it...</p>
      )}
      {toolError && <p className="text-sm text-[var(--error-accent)] mt-3">{toolError}</p>}

      {output && !isWorking && (
        <div className="mt-3 p-3 bg-slate-900/60 border border-slate-700 rounded-md">
          <p className="text-xs font-bold uppercase text-slate-400 mb-1">{outputLabel}</p>
          <p className="text-text-primary text-sm whitespace-pre-wrap">{output}</p>
        </div>
      )}
    </div>
  );
};

export default StudyTextTools;
