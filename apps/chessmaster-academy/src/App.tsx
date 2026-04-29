/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { Suspense, lazy, useState } from 'react';
import { Sidebar } from './components/Sidebar';

const HomeDashboard = lazy(() =>
  import('./components/HomeDashboard').then((module) => ({ default: module.HomeDashboard })),
);
const LessonMode = lazy(() =>
  import('./components/LessonMode').then((module) => ({ default: module.LessonMode })),
);
const PlayMode = lazy(() =>
  import('./components/PlayMode').then((module) => ({ default: module.PlayMode })),
);
const PuzzleMode = lazy(() =>
  import('./components/PuzzleMode').then((module) => ({ default: module.PuzzleMode })),
);
const AITutorMode = lazy(() =>
  import('./components/AITutorMode').then((module) => ({ default: module.AITutorMode })),
);

function ViewFallback() {
  return (
    <div className="flex min-h-[calc(100dvh-8rem)] items-center justify-center px-4">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-indigo-300" />
    </div>
  );
}

export default function App() {
  const [currentView, setCurrentView] = useState('home');
  const [pieceSet, setPieceSet] = useState('fresca');

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-[#0f172a] text-white font-sans md:flex-row">
      <main className="relative z-0 flex-1 overflow-y-auto pb-6 pt-16 md:pb-0 md:pt-0">
        <Suspense fallback={<ViewFallback />}>
          {currentView === 'home' && <HomeDashboard setCurrentView={setCurrentView} />}
          {currentView === 'lessons' && <LessonMode pieceSet={pieceSet} />}
          {currentView === 'play' && <PlayMode pieceSet={pieceSet} />}
          {currentView === 'puzzles' && <PuzzleMode pieceSet={pieceSet} />}
          {currentView === 'tutor' && <AITutorMode pieceSet={pieceSet} />}
        </Suspense>
      </main>
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} pieceSet={pieceSet} setPieceSet={setPieceSet} />
    </div>
  );
}
