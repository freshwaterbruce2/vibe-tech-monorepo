import React, { useRef, useEffect } from 'react';
import type { HomeworkItem } from '../../types';
import TaskBreakdown from './TaskBreakdown';

interface BreakdownModalProps {
  item: HomeworkItem;
  onClose: () => void;
}

const BreakdownModal = ({ item, onClose }: BreakdownModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 bg-slate-900/70 backdrop-blur-lg flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="breakdown-modal-title"
    >
      <div ref={modalRef} className="bg-background-surface border border-[var(--border-color)] rounded-2xl shadow-2xl shadow-black/50 p-6 md:p-8 w-full max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto transform transition-all animate-fade-in-up">
        <div className="flex justify-between items-start mb-4">
            <div>
                 <h2 id="breakdown-modal-title" className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[var(--secondary-accent)] to-[var(--primary-accent)]">Task Breakdown</h2>
                 <p className="text-text-secondary mt-1">AI-generated steps to tackle your assignment.</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close task breakdown" className="min-h-[44px] min-w-[44px] text-slate-500 hover:text-white text-2xl leading-none px-2 rounded-lg">&times;</button>
        </div>
       
        <TaskBreakdown taskTitle={item.title} subject={item.subject} />

        <div className="mt-8 text-right">
            <button type="button" onClick={onClose} className="min-h-[48px] px-6 py-3 rounded-lg text-slate-300 bg-slate-700/50 hover:bg-slate-700">Close</button>
        </div>
      </div>
       <style>{`
          @keyframes fade-in-up {
              0% { opacity: 0; transform: translateY(20px); }
              100% { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
        `}</style>
    </div>
  );
};

export default BreakdownModal;
