import React, { useEffect, useRef } from 'react';
import type { HomeworkItem } from '../../types';
import { BellIcon } from '../ui/icons/BellIcon';

interface NotificationPanelProps {
  items: HomeworkItem[];
  onClose: () => void;
}

const formatDateGroup = (dateString: string): 'Due Today' | 'Due Tomorrow' => {
    // FIX: Use UTC for date comparisons to avoid timezone-related bugs.
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    
    const itemDate = new Date(dateString); // 'YYYY-MM-DD' is parsed as UTC

    const diffTime = itemDate.getTime() - todayUTC.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Due Today';
    }
    // Items passed to this component are pre-filtered to be due today or tomorrow.
    return 'Due Tomorrow';
};


const NotificationPanel = ({ items, onClose }: NotificationPanelProps) => {
    const panelRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    return (
        <div ref={panelRef} className="absolute top-14 right-0 w-80 bg-background-surface rounded-lg shadow-2xl shadow-black/50 border border-[var(--border-color)] z-50 animate-fade-in-down">
            <div className="p-4 border-b border-[var(--border-color)] flex items-center">
                <h3 className="font-semibold text-[var(--primary-accent)] neon-text-primary">Upcoming Deadlines</h3>
            </div>
            <div className="max-h-80 overflow-y-auto">
                {items.length > 0 ? (
                    <ul>
                        {items.map(item => (
                            <li key={item.id} className="p-4 border-b border-slate-800 hover:bg-slate-700/50 transition-colors">
                                <p className="font-medium text-text-primary">{item.title}</p>
                                <p className="text-sm text-text-secondary mt-1">
                                    <span className="font-semibold">{item.subject}</span> - <span className="text-red-400 font-medium">{formatDateGroup(item.dueDate)}</span>
                                </p>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="p-8 text-center text-slate-500 flex flex-col items-center">
                        <BellIcon className="w-10 h-10 text-slate-600 mb-2"/>
                        <p>No immediate deadlines. Great job!</p>
                    </div>
                )}
            </div>
             <style>{`
                @keyframes fade-in-down {
                    0% {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    100% {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-fade-in-down {
                    animation: fade-in-down 0.2s ease-out forwards;
                }
            `}</style>
        </div>
    );
}

export default NotificationPanel;