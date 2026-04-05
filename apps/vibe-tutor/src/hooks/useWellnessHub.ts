import { useCallback, useEffect, useState } from 'react';
import {
  getDailyAffirmation,
  getTodayEntry,
  saveDailyEntry,
} from '../services/dailyAffirmations';
import type { Affirmation, DailyAffirmationEntry } from '../services/dailyAffirmations';
import {
  createThoughtEntry,
  getThoughtHistory,
  saveThoughtEntry,
} from '../services/cbtThoughtReframing';
import type { ThoughtEntry } from '../services/cbtThoughtReframing';

export interface WellnessHubState {
  // Affirmation
  affirmation: Affirmation;
  mood: DailyAffirmationEntry['mood'] | undefined;
  reflection: string;
  savedToday: boolean;

  // Thought journal
  recentEntries: ThoughtEntry[];
  showAddEntry: boolean;
  newSituation: string;
  newThought: string;
  newEmotion: string;
  newIntensity: number;

  // Actions
  setMood: (mood: DailyAffirmationEntry['mood']) => void;
  setReflection: (text: string) => void;
  saveTodayEntry: () => void;
  setShowAddEntry: (show: boolean) => void;
  setNewSituation: (v: string) => void;
  setNewThought: (v: string) => void;
  setNewEmotion: (v: string) => void;
  setNewIntensity: (v: number) => void;
  submitThoughtEntry: () => void;
}

export function useWellnessHub(): WellnessHubState {
  const affirmation = getDailyAffirmation();

  const todayEntry = getTodayEntry();
  const [mood, setMood] = useState<DailyAffirmationEntry['mood'] | undefined>(
    todayEntry?.mood,
  );
  const [reflection, setReflection] = useState(todayEntry?.eveningReflection ?? '');
  const [savedToday, setSavedToday] = useState(Boolean(todayEntry));

  const [recentEntries, setRecentEntries] = useState<ThoughtEntry[]>([]);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [newSituation, setNewSituation] = useState('');
  const [newThought, setNewThought] = useState('');
  const [newEmotion, setNewEmotion] = useState('');
  const [newIntensity, setNewIntensity] = useState(5);

  useEffect(() => {
    const history = getThoughtHistory();
    setRecentEntries(history.slice(-5).reverse());
  }, []);

  const saveTodayEntry = useCallback(() => {
    const today = new Date().toISOString().split('T')[0]!;
    const entry: DailyAffirmationEntry = {
      date: today,
      morningAffirmation: affirmation,
      mood,
      eveningReflection: reflection || undefined,
      timestamp: Date.now(),
    };
    saveDailyEntry(entry);
    setSavedToday(true);
  }, [affirmation, mood, reflection]);

  const submitThoughtEntry = useCallback(() => {
    if (!newSituation.trim() || !newThought.trim() || !newEmotion.trim()) return;

    const entry = createThoughtEntry(newSituation, newThought, newEmotion, newIntensity);
    saveThoughtEntry(entry);
    setRecentEntries((prev) => [entry, ...prev].slice(0, 5));
    setShowAddEntry(false);
    setNewSituation('');
    setNewThought('');
    setNewEmotion('');
    setNewIntensity(5);
  }, [newSituation, newThought, newEmotion, newIntensity]);

  return {
    affirmation,
    mood,
    reflection,
    savedToday,
    recentEntries,
    showAddEntry,
    newSituation,
    newThought,
    newEmotion,
    newIntensity,
    setMood,
    setReflection,
    saveTodayEntry,
    setShowAddEntry,
    setNewSituation,
    setNewThought,
    setNewEmotion,
    setNewIntensity,
    submitThoughtEntry,
  };
}
