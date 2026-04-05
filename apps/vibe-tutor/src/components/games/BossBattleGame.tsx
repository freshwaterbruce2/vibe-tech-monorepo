import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Shield, Zap, Heart } from 'lucide-react';
import { type BossDef, type AvatarStat } from '../../types';
import { dataStore } from '../../services/dataStore';
import { SHOP_ITEMS } from '../../services/avatarShopData';

// Simulated import of the question banks. Since we expanded them earlier, we can just use them.
import { MATH_QUESTIONS } from '../../services/questionBanks/math';
import { SCIENCE_QUESTIONS } from '../../services/questionBanks/science';
import { HISTORY_QUESTIONS } from '../../services/questionBanks/history';

// A subset of WorksheetQuestion interface
interface Question {
  id: string;
  question: string;
  type: string;
  options?: string[];
  correctAnswer: string | number;
}

const BOSS_CONFIG: Record<string, BossDef> = {
  Math: { id: 'math-boss', name: 'The Math Menace', hp: 100, maxHp: 100, subjectWeakness: 'mathPower', imageUrl: '🧮' },
  Science: { id: 'sci-boss', name: 'The Mad Scientist', hp: 120, maxHp: 120, subjectWeakness: 'sciencePower', imageUrl: '🧪' },
  History: { id: 'hist-boss', name: 'The Time Bandit', hp: 150, maxHp: 150, subjectWeakness: 'historyPower', imageUrl: '⏳' },
  General: { id: 'gen-boss', name: 'The Quiz Master', hp: 200, maxHp: 200, subjectWeakness: 'logicPower', imageUrl: '🧠' },
  English: { id: 'eng-boss', name: 'The Grammar Goblin', hp: 110, maxHp: 110, subjectWeakness: 'logicPower', imageUrl: '📖' },
};

interface BossBattleProps {
  subject: string;
  onComplete: (score: number, stars: number, timeSpent: number) => void;
  onBack: () => void;
}

const BASE_DAMAGE = 20;
const BASE_BOSS_DAMAGE = 15;
const PLAYER_MAX_HP = 100;

export default function BossBattleGame({ subject, onComplete, onBack }: BossBattleProps) {
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'victory' | 'defeat'>('intro');
  const [playerHp, setPlayerHp] = useState(PLAYER_MAX_HP);
  const bossDef = (BOSS_CONFIG[subject] ?? BOSS_CONFIG.General)!;
  const [bossHp, setBossHp] = useState(bossDef.maxHp);
  const [avatarStats, setAvatarStats] = useState<Record<AvatarStat, number>>({
    mathPower: 1, sciencePower: 1, historyPower: 1, logicPower: 1, creativity: 1
  });

  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const startTimeRef = useRef(0);

  // Load avatar stats
  useEffect(() => {
    async function init() {
      const state = await dataStore.getAvatarState();
      const stats = { mathPower: 1, sciencePower: 1, historyPower: 1, logicPower: 1, creativity: 1 };
      if (state) {
        // Compute equipped stats
        const equipped = [state.equippedItems.hat, state.equippedItems.shirt, state.equippedItems.accessory];
        for (const itemId of equipped) {
          if (!itemId) continue;
          const shopItem = SHOP_ITEMS.find(i => i.id === itemId);
          if (shopItem) {
            for (const [s, val] of Object.entries(shopItem.statBoosts)) {
              if (val) stats[s as AvatarStat] += val;
            }
          }
        }
      }
      setAvatarStats(stats);
    }
    void init();
  }, []);
  
  // Load questions using useMemo instead of effect to avoid cascading renders
  const questions = useMemo(() => {
    let rawQ: Question[] = [];
    if (subject === 'Math') rawQ = Object.values(MATH_QUESTIONS).flat() as Question[];
    else if (subject === 'Science') rawQ = Object.values(SCIENCE_QUESTIONS).flat() as Question[];
    else if (subject === 'History') rawQ = Object.values(HISTORY_QUESTIONS).flat() as Question[];
    else rawQ = Object.values(MATH_QUESTIONS).flat() as Question[]; // fallback

    return [...rawQ].sort(() => 0.5 - Math.random()).slice(0, 10);
  }, [subject]);

  const damageMultiplier = avatarStats[bossDef.subjectWeakness] ?? 1;

  const handleStart = () => {
    setGameState('playing');
    startTimeRef.current = Date.now();
    setCombatLog([`Encountered ${bossDef.name}! Let the battle begin.`]);
  };

  const currentQ = questions[currentQIndex];

  const handleAnswer = (answer: string | number) => {
    if (!currentQ) return;
    
    // Evaluate
    const isCorrect = String(answer).toLowerCase() === String(currentQ.correctAnswer).toLowerCase();
    
    if (isCorrect) {
      const damage = BASE_DAMAGE * damageMultiplier;
      setBossHp(prev => Math.max(0, prev - damage));
      setCombatLog(prev => [`You answered correctly! Dealt ${damage} damage.`, ...prev.slice(0, 4)]);
      
      if (bossHp - damage <= 0) {
        setGameState('victory');
      }
    } else {
      setPlayerHp(prev => Math.max(0, prev - BASE_BOSS_DAMAGE));
      setCombatLog(prev => [`Wrong answer! The boss hits you for ${BASE_BOSS_DAMAGE} damage.`, ...prev.slice(0, 4)]);
      
      if (playerHp - BASE_BOSS_DAMAGE <= 0) {
        setGameState('defeat');
      }
    }
    
    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex(currentQIndex + 1);
    } else if (gameState === 'playing') {
      // Out of questions but haven't defeated boss -> draw/defeat
      setGameState('defeat');
    }
  };

  const finishGame = (win: boolean) => {
    const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const score = win ? bossDef.maxHp * 10 : 0;
    const stars = win ? 3 : 0; // Provide max stars if won
    onComplete(score, stars, timeSpent);
  };

  if (gameState === 'intro') {
    return (
      <div style={{ textAlign: 'center', color: 'white', padding: '40px' }}>
        <h1 style={{ fontSize: '48px', margin: 0 }}>{bossDef.imageUrl}</h1>
        <h2>{bossDef.name} Approaches!</h2>
        <p>Your {bossDef.subjectWeakness.replace('Power', '')} multiplier is <strong>x{damageMultiplier}</strong> based on your gear.</p>
        <button 
          onClick={handleStart}
          style={{ background: 'var(--error-accent)', color: 'white', padding: '12px 24px', border: 'none', borderRadius: '8px', fontSize: '18px', cursor: 'pointer', marginTop: '20px' }}>
          Engage in Battle!
        </button>
        <button 
          onClick={onBack}
          style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--text-secondary)', padding: '12px 24px', borderRadius: '8px', fontSize: '18px', cursor: 'pointer', marginTop: '20px', marginLeft: '12px' }}>
          Flee
        </button>
      </div>
    );
  }

  if (gameState === 'victory') {
    return (
      <div style={{ textAlign: 'center', color: 'white', padding: '40px' }}>
        <h1 style={{ fontSize: '64px', margin: 0 }}>🏆</h1>
        <h2 style={{ color: '#a855f7' }}>Boss Defeated!</h2>
        <p>Your powerful gear helped you vanquish the boss. You earned massive rewards!</p>
        <button 
          onClick={() => finishGame(true)}
          style={{ background: '#a855f7', color: 'white', padding: '12px 24px', border: 'none', borderRadius: '8px', fontSize: '18px', cursor: 'pointer', marginTop: '20px' }}>
          Claim Victory
        </button>
      </div>
    );
  }

  if (gameState === 'defeat') {
    return (
      <div style={{ textAlign: 'center', color: 'white', padding: '40px' }}>
        <h1 style={{ fontSize: '64px', margin: 0 }}>💀</h1>
        <h2 style={{ color: 'var(--error-accent)' }}>You were defeated...</h2>
        <p>Buy better gear in the Avatar Shop to increase your damage multiplier!</p>
        <button 
          onClick={() => finishGame(false)}
          style={{ background: 'var(--error-accent)', color: 'white', padding: '12px 24px', border: 'none', borderRadius: '8px', fontSize: '18px', cursor: 'pointer', marginTop: '20px' }}>
          Retreat
        </button>
      </div>
    );
  }

  // Playing State
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 250px', gap: '24px', color: 'white', padding: '20px 0' }}>
      
      {/* Left Column: Combat UI & Question */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Boss Display */}
        <div style={{ background: '#450a0a', padding: '20px', borderRadius: '16px', textAlign: 'center', border: '2px solid var(--error-accent)' }}>
          <div style={{ fontSize: '64px', marginBottom: '10px' }}>{bossDef.imageUrl}</div>
          <h3 style={{ margin: 0, color: '#fca5a5' }}>{bossDef.name}</h3>
          
          <div style={{ background: '#000', margin: '16px auto', width: '80%', height: '20px', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ width: `${(bossHp / bossDef.maxHp) * 100}%`, height: '100%', background: 'var(--error-accent)', transition: 'width 0.3s' }} />
          </div>
          <p style={{ margin: 0, fontSize: '14px' }}>HP: {bossHp} / {bossDef.maxHp}</p>
        </div>

        {/* Question Panel */}
        <div style={{ background: 'var(--background-surface)', padding: '24px', borderRadius: '16px' }}>
          {currentQ ? (
            <>
              <h4 style={{ color: 'var(--text-secondary)', margin: '0 0 12px 0' }}>Question {currentQIndex + 1}</h4>
              <p style={{ fontSize: '18px', marginBottom: '24px' }}>{currentQ.question}</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {currentQ.type === 'multiple-choice' && currentQ.options?.map((opt, idx) => (
                  <button 
                    key={idx}
                    onClick={() => handleAnswer(idx)}
                    style={{ background: 'var(--text-placeholder)', color: 'white', padding: '12px', border: '1px solid var(--text-tertiary)', borderRadius: '8px', cursor: 'pointer', textAlign: 'left' }}
                  >
                    {opt}
                  </button>
                ))}
                
                {currentQ.type === 'true-false' && ['True', 'False'].map(opt => (
                  <button 
                    key={opt}
                    onClick={() => handleAnswer(opt)}
                    style={{ background: 'var(--text-placeholder)', color: 'white', padding: '12px', border: '1px solid var(--text-tertiary)', borderRadius: '8px', cursor: 'pointer'}}
                  >
                    {opt}
                  </button>
                ))}

                {currentQ.type === 'fill-blank' && (
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <input 
                      type="text" 
                      id="fill-ans"
                      placeholder="Type answer..." 
                      style={{ flexGrow: 1, background: 'var(--background-card)', border: '1px solid var(--text-tertiary)', color: 'white', padding: '12px', borderRadius: '8px' }}
                    />
                    <button 
                      onClick={() => {
                        const val = (document.getElementById('fill-ans') as HTMLInputElement).value;
                        if(val) handleAnswer(val);
                      }}
                      style={{ background: 'var(--primary-accent)', color: 'white', padding: '12px 24px', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                    >
                      Attack!
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p>Loading questions...</p>
          )}
        </div>
      </div>

      {/* Right Column: Player Stats & Combat Log */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Player Plate */}
        <div style={{ background: 'var(--background-card)', padding: '16px', borderRadius: '16px', border: '2px solid var(--primary-accent)' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ background: '#1e3a8a', padding: '8px', borderRadius: '50%' }}>
              <Shield size={24} color="#60a5fa" />
            </div>
            <h3 style={{ margin: 0, color: '#93c5fd' }}>Your Avatar</h3>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Heart size={16} color="var(--error-accent)" fill="var(--error-accent)" />
            <div style={{ flexGrow: 1, background: '#000', height: '14px', borderRadius: '7px', overflow: 'hidden' }}>
              <div style={{ width: `${(playerHp / PLAYER_MAX_HP) * 100}%`, height: '100%', background: '#c084fc', transition: 'width 0.3s' }} />
            </div>
          </div>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'right' }}>HP: {playerHp} / {PLAYER_MAX_HP}</p>
          
          <div style={{ marginTop: '16px', padding: '8px', background: 'var(--background-surface)', borderRadius: '8px' }}>
            <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>DAMAGE MULTIPLIER</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fcd34d' }}>
              <Zap size={16} fill="#fcd34d" />
              <strong>x{damageMultiplier}.0</strong>
            </div>
          </div>
        </div>

        {/* Combat Log */}
        <div style={{ background: 'var(--background-card)', padding: '16px', borderRadius: '16px', flexGrow: 1 }}>
          <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-secondary)' }}>Battle Log</h4>
          <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {combatLog.map((log, i) => (
              <div key={i} style={{ color: i === 0 ? 'white' : '#64748b' }}>
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
