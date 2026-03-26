import {
  CheckCircle2,
  Circle,
  Home,
  Shirt,
  Sparkles,
  Utensils,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import ProgressBar from '../ui/ProgressBar';

import { appStore } from '../../utils/electronStore';

interface LifeSkill {
  id: string;
  category: 'morning' | 'chores' | 'hygiene' | 'evening';
  task: string;
  icon: LucideIcon;
}

const LIFE_SKILLS: LifeSkill[] = [
  // Morning Routine
  { id: 'wake', category: 'morning', task: 'Wake up on time', icon: Home },
  { id: 'shower', category: 'morning', task: 'Shower/bathe', icon: Sparkles },
  { id: 'brush', category: 'morning', task: 'Brush teeth', icon: Sparkles },
  { id: 'breakfast', category: 'morning', task: 'Eat breakfast', icon: Utensils },
  { id: 'dressed', category: 'morning', task: 'Get dressed', icon: Shirt },

  // Hygiene
  { id: 'deodorant', category: 'hygiene', task: 'Apply deodorant', icon: Sparkles },
  { id: 'hair', category: 'hygiene', task: 'Comb/style hair', icon: Sparkles },

  // Chores
  { id: 'bed', category: 'chores', task: 'Make bed', icon: Home },
  { id: 'room-pickup', category: 'chores', task: 'Pick up room (5 min)', icon: Home },
  { id: 'dishes', category: 'chores', task: 'Put dishes in sink/dishwasher', icon: Utensils },
  { id: 'trash', category: 'chores', task: 'Take out trash if full', icon: Home },

  // Evening
  { id: 'homework-check', category: 'evening', task: 'Check homework dashboard', icon: Home },
  { id: 'evening-brush', category: 'evening', task: 'Brush teeth (evening)', icon: Sparkles },
  {
    id: 'tomorrow-prep',
    category: 'evening',
    task: 'Prep for tomorrow (backpack/clothes)',
    icon: Shirt,
  },
];

interface LifeSkillsChecklistProps {
  onTaskComplete?: (taskId: string) => void;
}

const LifeSkillsChecklist = ({ onTaskComplete }: LifeSkillsChecklistProps) => {
  const [completedToday, setCompletedToday] = useState<Set<string>>(() => {
    const saved = appStore.get<string[]>('lifeSkillsToday');
    const savedDate = appStore.get('lifeSkillsDate');
    const today = new Date().toDateString();

    if (saved && savedDate === today) {
      return new Set(saved);
    }

    appStore.set('lifeSkillsDate', today);
    return new Set();
  });
  const [selectedCategory, setSelectedCategory] = useState<
    'all' | 'morning' | 'chores' | 'hygiene' | 'evening'
  >('all');

  // Save to localStorage
  useEffect(() => {
    appStore.set('lifeSkillsToday', JSON.stringify(Array.from(completedToday)));
  }, [completedToday]);

  const toggleTask = (taskId: string) => {
    setCompletedToday((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
        if (onTaskComplete) onTaskComplete(taskId);
      }
      return newSet;
    });
  };

  const filteredSkills =
    selectedCategory === 'all'
      ? LIFE_SKILLS
      : LIFE_SKILLS.filter((s) => s.category === selectedCategory);

  const completionRate = Math.round((completedToday.size / LIFE_SKILLS.length) * 100);

  const categories = [
    { id: 'all', label: 'All', icon: '📋' },
    { id: 'morning', label: 'Morning', icon: '🌅' },
    { id: 'hygiene', label: 'Hygiene', icon: '🧼' },
    { id: 'chores', label: 'Chores', icon: '🏠' },
    { id: 'evening', label: 'Evening', icon: '🌙' },
  ];

  return (
    <div className="glass-card p-6 rounded-2xl border border-white/10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-semibold text-white">Daily Life Skills</h3>
          <p className="text-sm text-gray-400">
            {completedToday.size} of {LIFE_SKILLS.length} completed ({completionRate}%)
          </p>
        </div>
        <div className={`text-3xl ${completionRate === 100 ? 'animate-bounce' : ''}`}>
          {completionRate === 100 ? '🎉' : '💪'}
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() =>
              setSelectedCategory(cat.id as 'all' | 'morning' | 'chores' | 'hygiene' | 'evening')
            }
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              selectedCategory === cat.id
                ? 'bg-purple-500 text-white'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <ProgressBar
          percent={completionRate}
          barClassName="bg-gradient-to-r from-purple-500 to-pink-500"
          trackClassName="h-3 bg-white/10 rounded-full overflow-hidden"
          label="Life skills completion progress"
        />
      </div>

      {/* Task List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredSkills.map((skill) => {
          const isCompleted = completedToday.has(skill.id);
          return (
            <button
              key={skill.id}
              onClick={() => toggleTask(skill.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                isCompleted
                  ? 'bg-fuchsia-500/10 border border-fuchsia-500/30'
                  : 'bg-white/5 border border-white/10 hover:bg-white/10'
              }`}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-5 h-5 text-fuchsia-400 flex-shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-gray-400 flex-shrink-0" />
              )}
              <skill.icon
                className={`w-4 h-4 flex-shrink-0 ${isCompleted ? 'text-fuchsia-400' : 'text-gray-400'}`}
              />
              <span
                className={`text-sm flex-1 text-left ${isCompleted ? 'text-fuchsia-300 line-through' : 'text-white'}`}
              >
                {skill.task}
              </span>
            </button>
          );
        })}
      </div>

      {completionRate === 100 && (
        <div className="mt-4 p-4 bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-lg text-center">
          <p className="text-fuchsia-400 font-semibold">Amazing! All tasks complete today! 🎉</p>
          <p className="text-sm text-gray-300 mt-1">You're building great life habits!</p>
        </div>
      )}
    </div>
  );
};

export default LifeSkillsChecklist;
