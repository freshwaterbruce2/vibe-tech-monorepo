import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, signIn, signOut } from './lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, Sparkles, Wind, UserRound } from 'lucide-react';

// Components
import ZenBackground from './components/ZenBackground';
import AudioLayer from './components/AudioLayer';
import Navigation from './components/Navigation';
import DailyInspiration from './components/DailyInspiration';
import Breathing from './components/Breathing';
import JournalSecure from './components/JournalSecure';
import Logo from './components/Logo';
import { ZenColoring } from './components/ZenColoring';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('home');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        setIsGuest(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleGuestEntry = () => {
    setIsGuest(true);
    setCurrentView('home');
  };

  const handleExit = async () => {
    if (isGuest) {
      setIsGuest(false);
      setCurrentView('home');
      return;
    }

    await signOut();
    setCurrentView('home');
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#faf7fc]">
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3], scale: [0.98, 1, 0.98] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-sky-900/40 font-serif italic"
        >
          Flowing...
        </motion.div>
      </div>
    );
  }

  if (!user && !isGuest) {
    return (
      <div className="h-screen w-screen relative overflow-hidden flex flex-col items-center justify-center p-6 bg-[#faf7fc]">
        <ZenBackground />

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center"
        >
          <Logo />
          <p className="mt-8 mb-12 text-sm font-light italic opacity-60 text-sky-900 max-w-xs leading-relaxed">
            Welcome to your private space of peace. A gift for the soul, a haven for the heart.
          </p>

          <div className="flex flex-col items-center gap-3">
            <button
              onClick={signIn}
              className="flex items-center gap-3 px-8 py-4 bg-sky-500 text-white rounded-full font-medium shadow-2xl hover:scale-105 active:scale-95 transition-all group"
            >
              <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              Enter Your Sanctuary
            </button>
            <button
              onClick={handleGuestEntry}
              className="flex items-center gap-3 px-7 py-3 bg-white/70 text-sky-900 rounded-full font-medium shadow-lg border border-white/80 hover:bg-white hover:scale-105 active:scale-95 transition-all"
            >
              <UserRound className="w-4 h-4" />
              Continue as Guest
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent relative pb-32">
      <ZenBackground />
      <AudioLayer />

      <main className="max-w-md mx-auto relative z-10 pt-12">
        <AnimatePresence mode="wait">
          {currentView === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="px-6 space-y-12"
            >
              <div className="flex flex-col items-center">
                <Logo />
              </div>

              <DailyInspiration />

              <div className="text-center">
                <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-30 mb-8 flex items-center justify-center gap-4">
                  <span className="h-[1px] w-8 bg-black/10" />
                  Center Your Spirit
                  <span className="h-[1px] w-8 bg-black/10" />
                </h4>
                <Breathing />
              </div>

              <div className="pt-8">
                <div className="bg-sky-100/40 p-6 rounded-3xl border border-sky-200/50 flex items-start gap-4">
                  <div className="p-2 bg-white/60 rounded-xl shadow-sm">
                    <Sparkles className="w-5 h-5 text-sky-600" />
                  </div>
                  <div>
                    <h5 className="font-serif text-lg text-sky-900">Feeling Overwhelmed?</h5>
                    <p className="text-sm text-sky-900/60 leading-relaxed italic mt-1">
                      Pause and explore the background. Let the colors follow your touch.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {currentView === 'journal' && (
            <motion.div
              key="journal"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
            >
              <JournalSecure isGuest={isGuest} />
            </motion.div>
          )}

          {currentView === 'lessons' && (
            <motion.div
              key="lessons"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="px-6 py-12"
            >
              <div className="flex items-center gap-3 mb-8">
                <Sparkles className="w-6 h-6 text-sky-400" />
                <h2 className="text-3xl font-serif">Daily Wisdom</h2>
              </div>

              <div className="space-y-6">
                <DailyInspiration />
                <div className="p-6 rounded-3xl glass opacity-60">
                   <p className="text-sm font-serif italic mb-2">Reflect:</p>
                   <p className="text-base font-light italic">"The strongest hearts are those that allow themselves to soften."</p>
                </div>
                <div className="p-6 rounded-3xl glass border-sky-500/20">
                   <p className="text-xs uppercase tracking-widest opacity-40 mb-4">CBT Foundation</p>
                   <h4 className="text-xl font-serif mb-2">Wise Mind</h4>
                   <p className="text-sm leading-relaxed opacity-70">
                     The balance between your Reasonable Mind and your Emotional Mind. It's the place where you can feel your emotions but also think clearly.
                   </p>
                </div>
              </div>
            </motion.div>
          )}

          {currentView === 'sounds' && (
            <motion.div
              key="sounds"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-6 py-12"
            >
              <div className="flex items-center gap-3 mb-12">
                <Wind className="w-6 h-6 text-sky-400" />
                <h2 className="text-3xl font-serif">Sound Waves</h2>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {['Ocean Mist', 'Tibetan Bowls', 'White Noise', 'Forest Whisper'].map((sound) => (
                  <button
                    key={sound}
                    className="p-8 rounded-3xl glass flex flex-col items-start gap-4 hover:bg-black/5 transition-colors border-white/60 text-left"
                  >
                    <div className="w-12 h-12 rounded-full border border-black/10 flex items-center justify-center">
                       <Wind className="w-5 h-5 opacity-40" />
                    </div>
                    <div>
                      <h4 className="text-xl font-serif">{sound}</h4>
                      <p className="text-xs uppercase tracking-widest opacity-40 mt-1">Calming Soundscape</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {currentView === 'color' && (
          <motion.div
            key="color"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 pointer-events-auto"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
          >
            <ZenColoring />
          </motion.div>
        )}
      </AnimatePresence>

      <Navigation
        currentView={currentView}
        onNavigate={setCurrentView}
        onSignOut={handleExit}
        isGuest={isGuest}
      />
    </div>
  );
}
