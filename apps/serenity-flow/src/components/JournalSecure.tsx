import { useState, useEffect } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, getDoc, setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, PenLine, ChevronRight, X, Heart, Sparkles, RefreshCcw } from 'lucide-react';
import { format } from 'date-fns';

interface JournalEntry {
  id: string;
  title: string;
  content: string;
  mood?: string;
  createdAt?: { toDate: () => Date };
}

interface JournalSecureProps {
  isGuest?: boolean;
}

const CBT_PROMPTS = [
  "What is one positive thing that happened today, however small?",
  "Notice an anxious thought. Is it a fact or just an assumption?",
  "What is something you can forgive yourself for today?",
  "Describe a challenge you faced and one strength you used to navigate it.",
  "Write down three things you are grateful for right now.",
  "What is a boundary you could set to protect your peace tomorrow?",
  "How can you show yourself kindness at this very moment?",
];

export default function JournalSecure({ isGuest = false }: JournalSecureProps) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pin, setPin] = useState('');
  const [userPin, setUserPin] = useState<string | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(() => !(isGuest || !auth.currentUser));

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [newEntry, setNewEntry] = useState({ title: '', content: '', mood: 'neutral' });
  const [promptIndex, setPromptIndex] = useState(0);

  useEffect(() => {
    if (isGuest || !auth.currentUser) {
      return;
    }

    // Fetch user PIN config
    const profilePath = `users/${auth.currentUser.uid}/settings/profile`;
    getDoc(doc(db, 'users', auth.currentUser.uid, 'settings', 'profile'))
      .then(d => {
        if (d.exists()) {
          setUserPin(d.data().pin);
        } else {
          setUserPin(''); // indicates it needs to be created
        }
        setLoadingConfig(false);
      })
      .catch((error) => handleFirestoreError(error, OperationType.GET, profilePath));
  }, [isGuest]);

  useEffect(() => {
    if (isGuest || !auth.currentUser || !isUnlocked) return;

    const path = `users/${auth.currentUser.uid}/journal`;
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JournalEntry)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, path));

    return () => unsubscribe();
  }, [isGuest, isUnlocked]);

  const saveEntry = async () => {
    if (isGuest || !auth.currentUser || !newEntry.content) return;
    const path = `users/${auth.currentUser.uid}/journal`;
    try {
      await addDoc(collection(db, path), {
        ...newEntry,
        userId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      });
      setShowEditor(false);
      setNewEntry({ title: '', content: '', mood: 'neutral' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  if (isGuest) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-xs p-8 rounded-3xl glass text-center"
        >
          <div className="w-16 h-16 bg-sky-900/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-6 h-6 text-sky-500" />
          </div>
          <h2 className="text-xl font-serif mb-2 text-sky-900">Cloud Journal Locked</h2>
          <p className="text-sm text-sky-900/60 font-light italic leading-relaxed">
            Guest mode keeps Home, Wisdom, Coloring, and Sounds local. Sign in with Google to use
            the private cloud journal.
          </p>
        </motion.div>
      </div>
    );
  }

  if (loadingConfig) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6">
        <p className="text-sky-300 font-serif italic animate-pulse">Checking lock...</p>
      </div>
    );
  }

  if (!isUnlocked) {
    const isCreating = userPin === '';

    return (
      <div className="flex flex-col items-center justify-center py-20 px-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-xs p-8 rounded-3xl glass text-center"
        >
          <div className="w-16 h-16 bg-sky-900/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="w-6 h-6 text-sky-500" />
          </div>
          <h2 className="text-xl font-serif mb-2 text-sky-900">Private Sanctuary</h2>
          <p className="text-sm text-sky-900/50 mb-8 font-light italic">
            {isCreating ? 'Create a 4-digit PIN' : 'Enter your 4-digit PIN'}
          </p>

          <div className="flex justify-center gap-4 mb-10">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full border border-sky-400/50 transition-colors ${pin.length > i ? 'bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.5)]' : ''}`}
              />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'del'].map((num, i) => (
              <button
                key={i}
                disabled={num === ''}
                onClick={() => {
                  if (num === 'del') setPin(pin.slice(0, -1));
                  else if (num !== '' && pin.length < 4) {
                    const newPin = pin + num;
                    setPin(newPin);
                    if (newPin.length === 4) {
                      setTimeout(async () => {
                        if (isCreating) {
                          if (!auth.currentUser) return;
                          const path = `users/${auth.currentUser.uid}/settings/profile`;
                          try {
                            await setDoc(doc(db, 'users', auth.currentUser.uid, 'settings', 'profile'), {
                              pin: newPin,
                              userId: auth.currentUser.uid
                            });
                            setUserPin(newPin);
                            setIsUnlocked(true);
                          } catch (e) {
                            handleFirestoreError(e, OperationType.CREATE, path);
                            setPin('');
                          }
                        } else {
                          if (newPin === userPin) setIsUnlocked(true);
                          else {
                            setPin('');
                          }
                        }
                      }, 200);
                    }
                  }
                }}
                className={`h-12 rounded-xl text-lg font-light flex items-center justify-center transition-colors text-sky-900 ${num !== '' ? 'hover:bg-sky-900/5 active:bg-sky-900/10' : ''}`}
              >
                {num === 'del' ? <ChevronRight className="w-4 h-4 rotate-180" /> : num}
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-6 pb-32">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-serif text-sky-900">Journal</h2>
        <button
          onClick={() => {
            setShowEditor(true);
            setPromptIndex(Math.floor(Math.random() * CBT_PROMPTS.length));
          }}
          className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white rounded-full text-sm font-medium shadow-lg hover:scale-105 active:scale-95 transition-transform"
        >
          <PenLine className="w-4 h-4" />
          Write
        </button>
      </div>

      <div className="space-y-4">
        {entries.map((entry) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl glass border-white/40"
          >
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] uppercase tracking-widest opacity-40">
                {entry.createdAt ? format(entry.createdAt.toDate(), 'MMM d, h:mm a') : 'Just now'}
              </span>
              <Heart className={`w-3 h-3 ${entry.mood === 'happy' ? 'text-pink-500 fill-current' : 'opacity-20'}`} />
            </div>
            <h4 className="font-serif text-lg mb-1">{entry.title || 'Untitled Space'}</h4>
            <p className="text-sm opacity-70 line-clamp-3 leading-relaxed whitespace-pre-wrap">{entry.content}</p>
          </motion.div>
        ))}
        {entries.length === 0 && (
          <div className="text-center py-20 opacity-30">
            <Heart className="w-8 h-8 mx-auto mb-4" />
            <p className="text-sm italic">Nothing here yet. The silence is yours to fill.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showEditor && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed inset-0 z-[60] bg-[#faf7fc] p-6 pt-12 flex flex-col"
          >
            <div className="flex justify-between items-center mb-8 shrink-0">
              <button
                onClick={() => setShowEditor(false)}
                className="p-2 rounded-full hover:bg-sky-900/5 text-sky-900"
              >
                <X className="w-6 h-6" />
              </button>
              <button
                onClick={saveEntry}
                disabled={!newEntry.content}
                className="px-6 py-2 bg-sky-500 text-white rounded-full font-medium disabled:opacity-30"
              >
                Soul Keep
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pb-6">
              <div className="mb-6 p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-sky-500" />
                    <span className="text-[10px] uppercase tracking-widest text-sky-800 font-bold">Reflection Prompt</span>
                  </div>
                  <button
                    onClick={() => setPromptIndex((prev) => (prev + 1) % CBT_PROMPTS.length)}
                    className="p-1 hover:bg-sky-900/5 rounded-full"
                  >
                    <RefreshCcw className="w-3 h-3 text-sky-600" />
                  </button>
                </div>
                <p className="text-sm text-sky-900/80 italic font-serif">"{CBT_PROMPTS[promptIndex]}"</p>
              </div>

              <input
                autoFocus
                placeholder="Title your moment..."
                className="w-full text-3xl font-serif bg-transparent outline-none mb-6 placeholder:opacity-30 text-sky-900"
                value={newEntry.title}
                onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
              />

              <textarea
                placeholder="What's flowing in your mind?"
                className="w-full min-h-[300px] text-lg font-light bg-transparent outline-none border-none resize-none placeholder:opacity-30 leading-relaxed text-sky-900"
                value={newEntry.content}
                onChange={(e) => setNewEntry({ ...newEntry, content: e.target.value })}
              />
            </div>

            <div className="shrink-0 pt-4 border-t border-sky-900/10 flex items-center gap-4 overflow-x-auto pb-4">
              <span className="text-xs uppercase tracking-widest text-sky-900/40 shrink-0">Mood:</span>
              {(['calm', 'happy', 'overwhelmed', 'sad', 'peaceful'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setNewEntry({ ...newEntry, mood: m })}
                  className={`px-3 py-1.5 rounded-full text-[10px] uppercase tracking-widest border border-sky-900/20 transition-colors shrink-0 ${newEntry.mood === m ? 'bg-sky-500 text-white border-sky-500 shadow-[0_0_15px_rgba(56,189,248,0.4)]' : 'text-sky-900 opacity-60 hover:opacity-100 hover:bg-sky-900/5'}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
