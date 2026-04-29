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
  isSavingToday: boolean;
  isSubmittingThought: boolean;
  canSaveToday: boolean;
  canSubmitThought: boolean;

  // Actions
  setMood: (mood: DailyAffirmationEntry['mood']) => void;
  setReflection: (text: string) => void;
  saveTodayEntry: () => void;
  setShowAddEntry: (show: boolean) => void;
  setNewSituation: (v: string) => void;
  setNewThought: (v: string) => void;
  setNewEmotion: (v: string) => void;
  setNewIntensity: (v: number) => void;
  toggleAddEntry: () => void;
  cancelThoughtEntry: () => void;
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
  const [savedMood, setSavedMood] = useState<DailyAffirmationEntry['mood'] | undefined>(
    todayEntry?.mood,
  );
  const [savedReflection, setSavedReflection] = useState(todayEntry?.eveningReflection ?? '');
  const [isSavingToday, setIsSavingToday] = useState(false);
  const [isSubmittingThought, setIsSubmittingThought] = useState(false);

  const [recentEntries, setRecentEntries] = useState<ThoughtEntry[]>([]);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [newSituation, setNewSituation] = useState('');
  const [newThought, setNewThought] = useState('');
  const [newEmotion, setNewEmotion] = useState('');
  const [newIntensity, setNewIntensity] = useState(5);
  const hasReflection = reflection.trim().length > 0;
  const canSaveToday = (Boolean(mood) || hasReflection) && (mood !== savedMood || reflection !== savedReflection);
  const canSubmitThought =
    newSituation.trim().length > 0 && newThought.trim().length > 0 && newEmotion.trim().length > 0;

  useEffect(() => {
    const history = getThoughtHistory();
    setRecentEntries(history.slice(-5).reverse());
  }, []);

  const saveTodayEntry = useCallback(() => {
    if (isSavingToday || !canSaveToday) return;
    setIsSavingToday(true);
    const today = new Date().toISOString().split('T')[0]!;
    const entry: DailyAffirmationEntry = {
      date: today,
      morningAffirmation: affirmation,
      mood,
      eveningReflection: reflection || undefined,
      timestamp: Date.now(),
    };
    try {
      saveDailyEntry(entry);
      setSavedToday(true);
      setSavedMood(mood);
      setSavedReflection(reflection);
    } finally {
      setIsSavingToday(false);
    }
  }, [affirmation, canSaveToday, isSavingToday, mood, reflection]);

  const resetThoughtDraft = useCallback(() => {
    setNewSituation('');
    setNewThought('');
    setNewEmotion('');
    setNewIntensity(5);
  }, []);

  const cancelThoughtEntry = useCallback(() => {
    setShowAddEntry(false);
    resetThoughtDraft();
  }, [resetThoughtDraft]);

  const toggleAddEntry = useCallback(() => {
    setShowAddEntry((previousValue) => {
      if (previousValue) {
        resetThoughtDraft();
      }

      return !previousValue;
    });
  }, [resetThoughtDraft]);

  const submitThoughtEntry = useCallback(() => {
    if (isSubmittingThought || !canSubmitThought) return;

    setIsSubmittingThought(true);

    try {
      const trimmedSituation = newSituation.trim();
      const trimmedThought = newThought.trim();
      const trimmedEmotion = newEmotion.trim();
      const entry = createThoughtEntry(
        trimmedSituation,
        trimmedThought,
        trimmedEmotion,
        newIntensity,
      );
      saveThoughtEntry(entry);
      setRecentEntries((prev) => [entry, ...prev].slice(0, 5));
      cancelThoughtEntry();
    } finally {
      setIsSubmittingThought(false);
    }
  }, [
    canSubmitThought,
    cancelThoughtEntry,
    isSubmittingThought,
    newEmotion,
    newIntensity,
    newSituation,
    newThought,
  ]);

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
    isSavingToday,
    isSubmittingThought,
    canSaveToday,
    canSubmitThought,
    setMood,
    setReflection,
    saveTodayEntry,
    setShowAddEntry,
    setNewSituation,
    setNewThought,
    setNewEmotion,
    setNewIntensity,
    toggleAddEntry,
    cancelThoughtEntry,
    submitThoughtEntry,
  };
}
