import confetti from 'canvas-confetti';
import { ArrowLeft, Music, Sparkles, Star, Trophy, Volume2, Zap } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useGameAudio } from '../../hooks/useGameAudio';
import { playCorrect, playTone, playWrong } from './musicNotesAudio';
import type { NoteData } from './musicNotesData';
import { getTier, pick, shuffle } from './musicNotesData';
import StaffSVG from './MusicNotesStaff';

/* ---------- Props ---------- */
interface MusicNotesProps {
  onEarnTokens?: (amount: number) => void;
  onClose?: () => void;
}

/* ---------- Accent colors (bright neon cyan to match the refreshed hub) ---------- */
const CYAN = '#22d3ee';
const CYAN_DIM = 'rgba(34,211,238,0.2)';
const CYAN_BORDER = 'rgba(34,211,238,0.32)';

function buildQuestion(score: number): { note: NoteData; options: string[] } {
  const tier = getTier(score);
  const note = pick(tier.notes);
  const wrongPool = tier.notes.filter((entry) => entry.label !== note.label);
  const wrongs = shuffle(wrongPool)
    .slice(0, tier.optionCount - 1)
    .map((entry) => entry.label);

  return {
    note,
    options: shuffle([note.label, ...wrongs]),
  };
}

/* ---------- Component ---------- */
const MusicNotesGame = ({ onEarnTokens, onClose }: MusicNotesProps) => {
  const { playSound } = useGameAudio();
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);
  const [question, setQuestion] = useState(() => buildQuestion(0));
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [lastAnswer, setLastAnswer] = useState('');
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentNote = question.note;
  const options = question.options;

  const tier = useMemo(() => getTier(score), [score]);

  const nextQuestion = useCallback(() => {
    setQuestion(buildQuestion(score));
    setFeedback(null);
    setLastAnswer('');
  }, [score]);

  const handleAnswer = useCallback(
    (chosen: string) => {
      if (feedback !== null || !currentNote) return;
      const correct = chosen === currentNote.label;
      setFeedback(correct ? 'correct' : 'wrong');
      setLastAnswer(chosen);
      setQuestionsAnswered((q) => q + 1);

      if (correct) {
        playCorrect();
        const streakBonus = streak >= 4 ? 2 : streak >= 2 ? 1 : 0;
        const earned = 2 + streakBonus;
        setScore((s) => s + earned);
        setStreak((s) => s + 1);
        setBestStreak((b) => globalThis.Math.max(b, streak + 1));
        setTotalTokens((t) => t + earned);
        setCorrectAnswers((c) => c + 1);
        onEarnTokens?.(earned);
        if ((streak + 1) % 5 === 0) {
          playSound('victory');
          void confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
          setShowCelebration(true);
          setTimeout(() => setShowCelebration(false), 1500);
        }
      } else {
        playWrong();
        setStreak(0);
      }

      feedbackTimer.current = setTimeout(nextQuestion, correct ? 1000 : 1800);
    },
    [feedback, currentNote, streak, nextQuestion, onEarnTokens, playSound],
  );

  const handleHear = useCallback(() => {
    playSound('pop');
    if (currentNote) playTone(currentNote.label, 0.5);
  }, [currentNote, playSound]);

  useEffect(
    () => () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    },
    [],
  );

  /* ---------- Option button style ---------- */
  const optionStyle = (label: string) => {
    const isChosen = lastAnswer === label;
    const isCorrect = label === currentNote.label;
    let bg = 'rgba(255,255,255,0.07)';
    let border = '2px solid rgba(255,255,255,0.1)';
    let color = '#e2e8f0';
    if (feedback && isCorrect) {
      bg = 'rgba(34,197,94,0.2)';
      border = '2px solid #c084fc';
      color = '#c084fc';
    } else if (feedback && isChosen && !isCorrect) {
      bg = 'rgba(239,68,68,0.15)';
      border = '2px solid var(--error-accent)';
      color = 'var(--error-accent)';
    }
    return {
      background: bg, border, color, borderRadius: 12,
      padding: '14px 8px', fontSize: 18, fontWeight: 700,
      cursor: feedback ? 'default' : 'pointer',
      transition: 'all 0.15s ease', textAlign: 'center' as const,
      fontFamily: 'monospace',
    } as const;
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, var(--background-card) 0%, #164e63 100%)',
      color: '#e2e8f0', fontFamily: 'system-ui, sans-serif',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: 16, position: 'relative', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        width: '100%', maxWidth: 400, display: 'flex',
        alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
      }}>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.08)', border: 'none', color: 'var(--text-secondary)',
            borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 14,
            display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div style={{ fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Music size={22} color={CYAN} /> Music Notes
        </div>
        <div style={{ width: 60 }} />
      </div>

      {/* Stats */}
      <div style={{ width: '100%', maxWidth: 400, display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { val: totalTokens, lbl: 'Tokens', color: 'var(--token-color)', Icon: Zap },
          { val: score, lbl: 'Score', color: '#c084fc', Icon: Star },
          { val: streak, lbl: 'Streak', color: streak >= 3 ? '#f97316' : 'var(--text-secondary)', Icon: null },
          { val: bestStreak, lbl: 'Best', color: CYAN, Icon: Trophy },
        ].map(({ val, lbl, color, Icon }) => (
          <div key={lbl} style={{
            flex: 1, minWidth: 70, background: 'rgba(255,255,255,0.06)',
            borderRadius: 10, padding: '8px 10px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, color }}>{val}</div>
            <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {Icon && <Icon size={10} />} {lbl}
            </div>
          </div>
        ))}
      </div>

      {/* Tier badge */}
      <div style={{
        background: CYAN_DIM, border: `1px solid ${CYAN_BORDER}`,
        borderRadius: 20, padding: '4px 14px', fontSize: 12,
        color: CYAN, marginBottom: 12, fontWeight: 600,
      }}>
        <Sparkles size={12} /> {tier.name}
      </div>

      {/* Staff card */}
      <div style={{
        background: 'rgba(255,255,255,0.04)', borderRadius: 16,
        border: '1px solid rgba(255,255,255,0.08)',
        padding: '20px 16px', marginBottom: 16, width: '100%', maxWidth: 400,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#cbd5e1' }}>What note is this?</div>
        <StaffSVG note={currentNote} feedback={feedback} />
        <button
          onClick={handleHear}
          style={{
            background: CYAN_DIM, border: `1px solid ${CYAN_BORDER}`,
            color: CYAN, borderRadius: 8, padding: '6px 16px',
            cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <Volume2 size={14} /> Hear it
        </button>
      </div>

      {/* Options */}
      <div style={{
        width: '100%', maxWidth: 400, display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: 10,
      }}>
        {options.map((label) => (
          <button key={label} style={optionStyle(label)} onClick={() => handleAnswer(label)}>
            {label}
          </button>
        ))}
      </div>

      {/* Feedback */}
      <div style={{
        marginTop: 12, fontSize: 15, fontWeight: 600, textAlign: 'center', minHeight: 24,
        color: feedback === 'correct' ? '#e879f9' : '#f87171',
      }}>
        {feedback === 'correct' &&
          `✓ ${currentNote.label} — Nice!${streak >= 3 ? ` 🔥 ${streak} streak!` : ''}`}
        {feedback === 'wrong' && `✗ That was ${currentNote.label}`}
      </div>

      {/* Answered count */}
      <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center' }}>
        {questionsAnswered} answered ·{' '}
        {questionsAnswered > 0
          ? globalThis.Math.round((correctAnswers / questionsAnswered) * 100)
          : 0}
        % accuracy
      </div>

      {/* Streak celebration */}
      {showCelebration && (
        <div style={{
          position: 'fixed', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.5)', zIndex: 100,
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #0c4a6e, #164e63)', borderRadius: 20,
            padding: '32px 40px', textAlign: 'center',
            border: `2px solid ${CYAN_BORDER}`,
          }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🔥</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--token-color)' }}>{streak} Streak!</div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>Keep it going!</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MusicNotesGame;
