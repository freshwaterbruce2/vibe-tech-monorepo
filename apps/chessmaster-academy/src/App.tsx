/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { HomeDashboard } from './components/HomeDashboard';
import { LessonMode } from './components/LessonMode';
import { AITutorMode } from './components/AITutorMode';
import { PlayMode } from './components/PlayMode';
import { PuzzleMode } from './components/PuzzleMode';

export default function App() {
  const [currentView, setCurrentView] = useState('home');
  const [pieceSet, setPieceSet] = useState('fresca');

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-[#0f172a] text-white font-sans md:flex-row">
      <main className="relative z-0 flex-1 overflow-y-auto pb-6 pt-16 md:pb-0 md:pt-0">
        {currentView === 'home' && <HomeDashboard setCurrentView={setCurrentView} />}
        {currentView === 'lessons' && <LessonMode pieceSet={pieceSet} />}
        {currentView === 'play' && <PlayMode pieceSet={pieceSet} />}
        {currentView === 'puzzles' && <PuzzleMode pieceSet={pieceSet} />}
        {currentView === 'tutor' && <AITutorMode pieceSet={pieceSet} />}
      </main>
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} pieceSet={pieceSet} setPieceSet={setPieceSet} />
    </div>
  );
}
