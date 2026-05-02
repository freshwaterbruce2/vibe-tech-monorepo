import { useState } from 'react';
import { DailyEntry } from './components/DailyEntry';
import { HistoryView } from './components/HistoryView';
import { HabitSettings } from './components/HabitSettings';
import { NavBar, type View } from './components/NavBar';
import { SymptomTracker } from './components/SymptomTracker';

export default function App() {
  const [view, setView] = useState<View>('today');
  return (
    <div className="app-shell text-slate-900">
      <NavBar current={view} onChange={setView} />
      <main className="app-content">
        {view === 'today' && <DailyEntry />}
        {view === 'symptoms' && <SymptomTracker />}
        {view === 'history' && <HistoryView />}
        {view === 'settings' && <HabitSettings />}
      </main>
    </div>
  );
}
