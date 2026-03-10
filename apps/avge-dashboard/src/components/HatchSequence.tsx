/**
 * HatchSequence — TUI-style onboarding wizard
 *
 * A dramatic, terminal-inspired sequence that plays when
 * a user launches a new AVGE project for the first time.
 * Typewriter text, ASCII art, pulsing colors.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface HatchConfig {
  projectTitle: string;
  onComplete: (config: HatchResult) => void;
  onCancel: () => void;
}

export interface HatchResult {
  projectTitle: string;
  niche: string;
  voice: 'authoritative' | 'conversational' | 'provocative' | 'storyteller';
  pacing: 'rapid' | 'measured' | 'dramatic';
  audience: string;
}

const ASCII_LOGO = `
 █████╗ ██╗   ██╗ ██████╗ ███████╗
██╔══██╗██║   ██║██╔════╝ ██╔════╝
███████║██║   ██║██║  ███╗█████╗
██╔══██║╚██╗ ██╔╝██║   ██║██╔══╝
██║  ██║ ╚████╔╝ ╚██████╔╝███████╗
╚═╝  ╚═╝  ╚═══╝   ╚═════╝ ╚══════╝`;

const BOOT_LINES = [
  '[INIT] AVGE Autonomous Video Generation Engine v1.0',
  '[BOOT] Loading BLAST pipeline framework...',
  '[LINK] NotebookLM MCP bridge ... OK',
  '[LINK] Google Cloud TTS ........ STANDBY',
  '[LINK] Flux Schnell Visual ..... STANDBY',
  '[SYNC] Chunk assembler ......... OK',
  '[SYS]  Intelligence library .... ONLINE',
  '',
  '> All systems nominal. Ready for configuration.',
];

type Phase = 'boot' | 'title' | 'niche' | 'voice' | 'pacing' | 'audience' | 'confirm' | 'launch';

const VOICE_OPTIONS: { value: HatchResult['voice']; label: string; desc: string }[] = [
  { value: 'authoritative', label: '📊 Authoritative', desc: 'Data-driven, expert tone — "Here\'s what the research shows..."' },
  { value: 'conversational', label: '💬 Conversational', desc: 'Friendly, relatable — "Let me break this down for you..."' },
  { value: 'provocative', label: '🔥 Provocative', desc: 'Bold, challenging — "Everything you\'ve been told is wrong."' },
  { value: 'storyteller', label: '📖 Storyteller', desc: 'Narrative-driven — "Three months ago, something changed..."' },
];

const PACING_OPTIONS: { value: HatchResult['pacing']; label: string; desc: string }[] = [
  { value: 'rapid', label: '⚡ Rapid', desc: '120+ WPM — fast cuts, high energy, TikTok-style' },
  { value: 'measured', label: '🎯 Measured', desc: '100 WPM — balanced, professional, essay-style' },
  { value: 'dramatic', label: '🎭 Dramatic', desc: '80 WPM — slow builds, pauses, cinematic feel' },
];

export function HatchSequence({ projectTitle, onComplete, onCancel }: HatchConfig) {
  const [phase, setPhase] = useState<Phase>('boot');
  const [bootIndex, setBootIndex] = useState(0);
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const [typewriterText, setTypewriterText] = useState('');
  const [typewriterDone, setTypewriterDone] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);

  // Form state
  const [title, setTitle] = useState(projectTitle);
  const [niche, setNiche] = useState('');
  const [voice, setVoice] = useState<HatchResult['voice']>('conversational');
  const [pacing, setPacing] = useState<HatchResult['pacing']>('measured');
  const [audience, setAudience] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);

  // Blinking cursor
  useEffect(() => {
    const interval = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => clearInterval(interval);
  }, []);

  // Boot sequence — reveal lines one by one
  useEffect(() => {
    if (phase !== 'boot') return;
    if (bootIndex >= BOOT_LINES.length) {
      setTimeout(() => setPhase('title'), 800);
      return;
    }
    const timer = setTimeout(() => {
      setDisplayedLines((prev) => [...prev, BOOT_LINES[bootIndex]]);
      setBootIndex((i) => i + 1);
    }, bootIndex === 0 ? 600 : 120 + Math.random() * 180);
    return () => clearTimeout(timer);
  }, [phase, bootIndex]);

  // Typewriter effect for phase prompts
  const typewrite = useCallback((text: string, speed = 30) => {
    setTypewriterText('');
    setTypewriterDone(false);
    let i = 0;
    const tick = () => {
      if (i <= text.length) {
        setTypewriterText(text.slice(0, i));
        i++;
        setTimeout(tick, speed);
      } else {
        setTypewriterDone(true);
      }
    };
    tick();
  }, []);

  useEffect(() => {
    switch (phase) {
      case 'title':
        typewrite('What is your project called?');
        break;
      case 'niche':
        typewrite('What niche does this video target?');
        break;
      case 'voice':
        typewrite('Select your narration voice:');
        break;
      case 'pacing':
        typewrite('Choose your pacing style:');
        break;
      case 'audience':
        typewrite('Describe your target audience:');
        break;
      case 'confirm':
        typewrite('Configuration complete. Ready to go live?');
        break;
      case 'launch':
        typewrite('🚀 Deploying BLAST pipeline...');
        break;
    }
  }, [phase, typewrite]);

  // Auto-scroll to bottom
  useEffect(() => {
    containerRef.current?.scrollTo(0, containerRef.current.scrollHeight);
  }, [displayedLines, typewriterText, phase]);

  // Launch effect
  useEffect(() => {
    if (phase !== 'launch') return;
    const timer = setTimeout(() => {
      onComplete({ projectTitle: title, niche, voice, pacing, audience });
    }, 2000);
    return () => clearTimeout(timer);
  }, [phase, onComplete, title, niche, voice, pacing, audience]);

  const cursor = cursorVisible ? '█' : ' ';

  const advance = (nextPhase: Phase) => {
    setDisplayedLines((prev) => [...prev, `> ${typewriterText}`, '']);
    setPhase(nextPhase);
  };

  const handleInputSubmit = (value: string, nextPhase: Phase) => {
    if (!value.trim()) return;
    setDisplayedLines((prev) => [...prev, `> ${typewriterText}`, `  → ${value}`, '']);
    setPhase(nextPhase);
  };

  return (
    <div className="hatch-overlay">
      <div className="hatch-terminal" ref={containerRef}>
        {/* ASCII Header */}
        {phase === 'boot' && (
          <pre className="hatch-ascii">{ASCII_LOGO}</pre>
        )}

        {/* Boot log lines */}
        {displayedLines.map((line, i) => (
          <div key={i} className="hatch-line">
            {line.startsWith('[') ? (
              <>
                <span className="hatch-tag">{line.match(/\[.*?\]/)?.[0]}</span>
                <span>{line.replace(/\[.*?\]\s*/, '')}</span>
              </>
            ) : line.startsWith('>') ? (
              <span className="hatch-prompt">{line}</span>
            ) : (
              <span>{line}</span>
            )}
          </div>
        ))}

        {/* Active prompt */}
        {phase !== 'boot' && phase !== 'launch' && (
          <div className="hatch-active">
            <div className="hatch-question">
              {typewriterText}{!typewriterDone && <span className="hatch-cursor">{cursor}</span>}
            </div>

            {typewriterDone && phase === 'title' && (
              <div className="hatch-input-row">
                <span className="hatch-prompt-char">›</span>
                <input
                  className="hatch-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInputSubmit(title, 'niche')}
                  placeholder="e.g. Money Psychology Deep Dive"
                  autoFocus
                />
              </div>
            )}

            {typewriterDone && phase === 'niche' && (
              <div className="hatch-input-row">
                <span className="hatch-prompt-char">›</span>
                <input
                  className="hatch-input"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInputSubmit(niche, 'voice')}
                  placeholder="e.g. Personal finance, AI, fitness"
                  autoFocus
                />
              </div>
            )}

            {typewriterDone && phase === 'voice' && (
              <div className="hatch-options">
                {VOICE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`hatch-option ${voice === opt.value ? 'selected' : ''}`}
                    onClick={() => {
                      setVoice(opt.value);
                      setDisplayedLines((prev) => [...prev, `> ${typewriterText}`, `  → ${opt.label}`, '']);
                      setPhase('pacing');
                    }}
                  >
                    <span className="hatch-opt-label">{opt.label}</span>
                    <span className="hatch-opt-desc">{opt.desc}</span>
                  </button>
                ))}
              </div>
            )}

            {typewriterDone && phase === 'pacing' && (
              <div className="hatch-options">
                {PACING_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={`hatch-option ${pacing === opt.value ? 'selected' : ''}`}
                    onClick={() => {
                      setPacing(opt.value);
                      setDisplayedLines((prev) => [...prev, `> ${typewriterText}`, `  → ${opt.label}`, '']);
                      setPhase('audience');
                    }}
                  >
                    <span className="hatch-opt-label">{opt.label}</span>
                    <span className="hatch-opt-desc">{opt.desc}</span>
                  </button>
                ))}
              </div>
            )}

            {typewriterDone && phase === 'audience' && (
              <div className="hatch-input-row">
                <span className="hatch-prompt-char">›</span>
                <input
                  className="hatch-input"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInputSubmit(audience, 'confirm')}
                  placeholder="e.g. 25-40 year olds interested in passive income"
                  autoFocus
                />
              </div>
            )}

            {typewriterDone && phase === 'confirm' && (
              <div className="hatch-confirm">
                <div className="hatch-summary">
                  <div><span className="hatch-tag">[TITLE]</span> {title}</div>
                  <div><span className="hatch-tag">[NICHE]</span> {niche}</div>
                  <div><span className="hatch-tag">[VOICE]</span> {voice}</div>
                  <div><span className="hatch-tag">[PACING]</span> {pacing}</div>
                  <div><span className="hatch-tag">[AUDIENCE]</span> {audience}</div>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
                  <button className="btn-launch" onClick={() => advance('launch')}>
                    ▶ DEPLOY
                  </button>
                  <button className="tab-btn" onClick={onCancel}>
                    ✕ Abort
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Launch animation */}
        {phase === 'launch' && (
          <div className="hatch-launch">
            <div className="hatch-question">
              {typewriterText}{!typewriterDone && <span className="hatch-cursor">{cursor}</span>}
            </div>
            <div className="hatch-progress-bar">
              <div className="hatch-progress-fill" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
