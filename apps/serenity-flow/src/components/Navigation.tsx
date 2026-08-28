import { Home, Quote, Heart, Music2, LogOut, Palette } from 'lucide-react';
import { motion } from 'motion/react';

interface NavigationProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onSignOut: () => void;
  isGuest?: boolean;
}

export default function Navigation({ currentView, onNavigate, onSignOut, isGuest = false }: NavigationProps) {
  const tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'lessons', icon: Quote, label: 'Wisdom' },
    { id: 'color', icon: Palette, label: 'Color' },
    { id: 'journal', icon: Heart, label: 'Sanctuary' },
    { id: 'sounds', icon: Music2, label: 'Waves' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md glass rounded-full shadow-2xl flex items-center justify-between px-2 py-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onNavigate(tab.id)}
            className="relative flex flex-col items-center py-2 px-4 group"
          >
            {currentView === tab.id && (
              <motion.div
                layoutId="nav-pill"
                className="absolute inset-0 bg-sky-500 rounded-full -z-10"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
            <tab.icon
              className={`w-5 h-5 transition-colors ${
                currentView === tab.id ? 'text-white' : 'text-sky-800/60 group-hover:text-sky-800'
              }`}
            />
            <span className={`text-[8px] uppercase tracking-tighter mt-1 font-bold ${
              currentView === tab.id ? 'text-white' : 'text-sky-800/50'
            }`}>
              {tab.label}
            </span>
          </button>
        ))}

        <div className="w-[1px] h-6 bg-black/5 mx-2" />

        <button
          onClick={onSignOut}
          className="flex flex-col items-center py-2 px-4 text-rose-600/60 hover:text-rose-600 group transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-[8px] uppercase font-bold mt-1">{isGuest ? 'Leave' : 'Exit'}</span>
        </button>
      </div>
    </div>
  );
}
