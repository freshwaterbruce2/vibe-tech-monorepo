import { Check, Copy } from 'lucide-react';
import React, { useCallback, useState } from 'react';

export interface CodeBlockProps {
  language?: string;
  code: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language = '', code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = code;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Non-fatal if copy fails
    }
  }, [code]);

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-[var(--glass-border)] bg-black/40 backdrop-blur-md">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 border-b border-[var(--glass-border)] text-xs text-text-muted">
        <span className="font-mono uppercase tracking-wider">{language || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center gap-1.5 px-2.5 py-1 rounded hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors text-xs"
          aria-label={copied ? 'Code copied' : 'Copy code block'}
          title={copied ? 'Copied code!' : 'Copy code to clipboard'}
        >
          {copied ? (
            <>
              <Check size={12} className="text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3 text-xs md:text-sm font-mono text-emerald-300 overflow-x-auto whitespace-pre leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
};

export default CodeBlock;
