import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Circle,
  Clock,
  Coins,
  ListTodo,
  Plus,
  Target,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { useSchedules, type ScheduleItem, type GoalItem } from '../../hooks/useSchedules';

interface SchedulesHubProps {
  onEarnTokens: (amount: number, reason: string) => void;
  onClose: () => void;
}

type Tab = 'schedules' | 'chores' | 'goals';
type ScheduleType = ScheduleItem['type'];

const SCHEDULE_TYPES: { id: ScheduleType; label: string; icon: typeof Clock }[] = [
  { id: 'custom', label: 'Custom', icon: Clock },
  { id: 'weekly', label: 'Weekly', icon: Calendar },
  { id: 'weekend', label: 'Weekend', icon: Calendar },
  { id: 'daytime', label: 'Daytime', icon: Clock },
  { id: 'afternoon', label: 'Afternoon', icon: Clock },
  { id: 'nighttime', label: 'Nighttime', icon: Clock },
];

export default function SchedulesHub({ onEarnTokens, onClose }: SchedulesHubProps) {
  const [activeTab, setActiveTab] = useState<Tab>('schedules');
  const [activeScheduleType, setActiveScheduleType] = useState<ScheduleType>('daytime');
  const schedules = useSchedules();

  // Local state for inputs
  const [newScheduleAcitivity, setNewScheduleActivity] = useState('');
  const [newScheduleTime, setNewScheduleTime] = useState('08:00');
  const [newScheduleMeridian, setNewScheduleMeridian] = useState<'AM' | 'PM'>('AM');

  const [newChore, setNewChore] = useState('');
  const [newChoreReward, setNewChoreReward] = useState(10);

  const [newGoal, setNewGoal] = useState('');
  const [newGoalType, setNewGoalType] = useState<'short-term' | 'long-term'>('short-term');

  /* Handlers */
  const handleAddSchedule = () => {
    if (!newScheduleAcitivity.trim()) return;
    schedules.addScheduleItem({
      activity: newScheduleAcitivity.trim(),
      time: newScheduleTime,
      meridian: newScheduleMeridian,
      type: activeScheduleType,
    });
    setNewScheduleActivity('');
  };

  const handleAddChore = () => {
    if (!newChore.trim()) return;
    schedules.addChore({
      task: newChore.trim(),
      rewardTokens: newChoreReward,
    });
    setNewChore('');
  };

  const handleToggleChore = (id: string, currentlyCompleted: boolean) => {
    const earned = schedules.toggleChore(id);
    if (!currentlyCompleted && earned > 0) {
      onEarnTokens(earned, 'Chore completed');
    }
  };

  const handleAddGoal = () => {
    if (!newGoal.trim()) return;
    schedules.addGoal({
      title: newGoal.trim(),
      type: newGoalType,
    });
    setNewGoal('');
  };

  return (
    <div className="flex flex-col h-full bg-[var(--background-main)] overflow-hidden">
      {/* Header */}
      <div className="flex-none p-4 md:p-6 border-b border-[var(--glass-border)] bg-[var(--glass-surface)] backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--text-primary)] transition-colors focus-glow"
            aria-label="Back to Dashboard"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
              <Calendar className="w-8 h-8 text-[var(--primary-accent)]" />
              Schedules & Goals
            </h1>
            <p className="text-[var(--text-secondary)] text-sm md:text-base mt-1">
              Organize your days, track chores, and smash your goals!
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mt-6 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setActiveTab('schedules')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap ${
              activeTab === 'schedules'
                ? 'bg-[var(--primary-accent)] text-white shadow-[var(--neon-glow-primary)]'
                : 'glass-card text-[var(--text-secondary)] hover:text-white'
            }`}
          >
            <Clock className="w-5 h-5" />
            Routines & Schedules
          </button>
          <button
            onClick={() => setActiveTab('chores')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap ${
              activeTab === 'chores'
                ? 'bg-[#10b981] text-white shadow-[var(--neon-glow-secondary)]'
                : 'glass-card text-[var(--text-secondary)] hover:text-white'
            }`}
          >
            <ListTodo className="w-5 h-5" />
            Chores List
          </button>
          <button
            onClick={() => setActiveTab('goals')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap ${
              activeTab === 'goals'
                ? 'bg-[#8b5cf6] text-white shadow-[var(--neon-glow-accent)]'
                : 'glass-card text-[var(--text-secondary)] hover:text-white'
            }`}
          >
            <Target className="w-5 h-5" />
            Goals Tracker
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
        <div className="max-w-4xl mx-auto">
          {activeTab === 'schedules' && (
            <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
              {/* Type Selector */}
              <div className="flex flex-wrap gap-2">
                {SCHEDULE_TYPES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveScheduleType(t.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeScheduleType === t.id
                        ? 'bg-[var(--glass-border)] text-[var(--primary-accent)] border border-[var(--primary-accent)]'
                        : 'bg-transparent text-[var(--text-secondary)] border border-[var(--glass-border)] hover:bg-[var(--glass-border)]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Add New Schedule */}
              <div className="glass-card p-4 rounded-xl border border-[var(--glass-border)] flex flex-col md:flex-row gap-4 md:items-end items-stretch">
                <div className="flex-1 w-full">
                  <label className="block text-sm text-[var(--text-secondary)] mb-1">Activity</label>
                  <input
                    type="text"
                    value={newScheduleAcitivity}
                    onChange={(e) => setNewScheduleActivity(e.target.value)}
                    placeholder="E.g., Morning reading, Breakfast..."
                    className="w-full bg-[var(--background-card)] border border-[var(--glass-border)] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[var(--primary-accent)]"
                  />
                </div>
                <div className="flex border border-[var(--glass-border)] rounded-lg overflow-hidden bg-[var(--background-card)] w-full md:w-auto">
                  <input
                    type="time"
                    value={newScheduleTime}
                    onChange={(e) => setNewScheduleTime(e.target.value)}
                    className="bg-transparent text-white px-3 py-2 outline-none w-full md:w-auto"
                  />
                  <select
                    value={newScheduleMeridian}
                    onChange={(e) => setNewScheduleMeridian(e.target.value as 'AM' | 'PM')}
                    className="bg-[var(--glass-border)] text-white px-3 py-2 outline-none border-l border-[var(--glass-border)]"
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>
                <button
                  onClick={handleAddSchedule}
                  className="bg-[var(--primary-accent)] text-white p-3 md:p-2 rounded-lg hover:brightness-110 transition-all focus-glow w-full md:w-auto flex justify-center items-center font-semibold"
                >
                  <span className="md:hidden mr-2">Add Schedule</span>
                  <Plus className="w-6 h-6 md:w-6 md:h-6" />
                </button>
              </div>

              {/* Schedule List */}
              <div className="space-y-3">
                {schedules.items
                  .filter((item) => item.type === activeScheduleType)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="glass-card p-4 rounded-xl border border-[var(--glass-border)] flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="bg-[var(--background-main)] px-3 py-1.5 rounded-lg border border-[var(--glass-border)] text-sm font-mono text-[var(--primary-accent)]">
                          {item.time} {item.meridian}
                        </div>
                        <span className="text-white text-lg">{item.activity}</span>
                      </div>
                      <button
                        onClick={() => schedules.removeScheduleItem(item.id)}
                        className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-400/20 rounded-lg"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                {schedules.items.filter((item) => item.type === activeScheduleType).length === 0 && (
                  <div className="text-center p-8 text-[var(--text-secondary)] border border-dashed border-[var(--glass-border)] rounded-xl">
                    No items in this schedule yet. Add one above!
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'chores' && (
            <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
              <div className="glass-card p-4 rounded-xl border border-[var(--glass-border)] flex flex-col md:flex-row gap-4 md:items-end items-stretch">
                <div className="flex-1 w-full">
                  <label className="block text-sm text-[var(--text-secondary)] mb-1">New Chore</label>
                  <input
                    type="text"
                    value={newChore}
                    onChange={(e) => setNewChore(e.target.value)}
                    placeholder="E.g., Clean my room, Walk the dog..."
                    className="w-full bg-[var(--background-card)] border border-[var(--glass-border)] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#10b981]"
                  />
                </div>
                <div className="w-full md:w-auto">
                  <label className="block text-sm text-[var(--text-secondary)] mb-1">Tokens Reward</label>
                  <div className="relative">
                    <Coins className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-yellow-400" />
                    <input
                      type="number"
                      min="1"
                      value={newChoreReward}
                      onChange={(e) => setNewChoreReward(parseInt(e.target.value) || 0)}
                      className="w-full md:w-28 bg-[var(--background-card)] border border-[var(--glass-border)] rounded-lg pl-9 pr-3 py-2 text-white outline-none focus:border-[#10b981]"
                    />
                  </div>
                </div>
                <button
                  onClick={handleAddChore}
                  className="bg-[#10b981] text-white px-6 py-2.5 md:py-2 rounded-lg hover:brightness-110 transition-all font-semibold w-full md:w-auto"
                >
                  Add Chore
                </button>
              </div>

              <div className="space-y-3">
                {schedules.chores.map((chore) => (
                  <div
                    key={chore.id}
                    className={`glass-card p-4 rounded-xl border flex items-center justify-between group transition-all ${
                      chore.completed ? 'border-[#10b981]/50 bg-[#10b981]/5' : 'border-[var(--glass-border)]'
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <button onClick={() => handleToggleChore(chore.id, chore.completed)}>
                        {chore.completed ? (
                          <CheckCircle2 className="w-6 h-6 text-[#10b981]" />
                        ) : (
                          <Circle className="w-6 h-6 text-[var(--text-secondary)]" />
                        )}
                      </button>
                      <span className={`text-lg ${chore.completed ? 'line-through text-[var(--text-secondary)]' : 'text-white'}`}>
                        {chore.task}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5 text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-full text-sm font-medium">
                        <Coins className="w-4 h-4" /> +{chore.rewardTokens}
                      </span>
                      <button
                        onClick={() => schedules.removeChore(chore.id)}
                        className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-400/20 rounded-lg"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
                {schedules.chores.length === 0 && (
                  <div className="text-center p-8 text-[var(--text-secondary)] border border-dashed border-[var(--glass-border)] rounded-xl">
                    No chores on the list!
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'goals' && (
            <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
              <div className="glass-card p-4 rounded-xl border border-[var(--glass-border)] flex flex-col md:flex-row gap-4 md:items-end items-stretch">
                <div className="flex-1 w-full">
                  <label className="block text-sm text-[var(--text-secondary)] mb-1">New Goal</label>
                  <input
                    type="text"
                    value={newGoal}
                    onChange={(e) => setNewGoal(e.target.value)}
                    placeholder="E.g., Read 10 books this year..."
                    className="w-full bg-[var(--background-card)] border border-[var(--glass-border)] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#8b5cf6]"
                  />
                </div>
                <div className="w-full md:w-auto">
                  <label className="block text-sm text-[var(--text-secondary)] mb-1">Type</label>
                  <select
                    value={newGoalType}
                    onChange={(e) => setNewGoalType(e.target.value as 'short-term' | 'long-term')}
                    className="w-full md:w-auto bg-[var(--background-card)] border border-[var(--glass-border)] rounded-lg px-3 py-2.5 text-white outline-none focus:border-[#8b5cf6]"
                  >
                    <option value="short-term">Short-term</option>
                    <option value="long-term">Long-term</option>
                  </select>
                </div>
                <button
                  onClick={handleAddGoal}
                  className="bg-[#8b5cf6] text-white px-6 py-2.5 md:py-2 rounded-lg hover:brightness-110 transition-all font-semibold w-full md:w-auto"
                >
                  Set Goal
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Short term */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b border-[var(--glass-border)] pb-2 flex items-center justify-between">
                    <span>Short-term Goals</span>
                    <span className="text-sm font-normal text-[var(--text-secondary)] bg-[var(--background-card)] px-2 py-0.5 rounded-full border border-[var(--glass-border)]">
                      {schedules.goals.filter((g) => g.type === 'short-term' && g.completed).length} / {schedules.goals.filter((g) => g.type === 'short-term').length}
                    </span>
                  </h3>
                  <div className="space-y-3">
                    {schedules.goals.filter((g) => g.type === 'short-term').map((goal) => (
                       <GoalCard key={goal.id} goal={goal} toggleGoal={schedules.toggleGoal} removeGoal={schedules.removeGoal} />
                    ))}
                  </div>
                </div>

                {/* Long term */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b border-[var(--glass-border)] pb-2 flex items-center justify-between">
                    <span>Long-term Goals</span>
                    <span className="text-sm font-normal text-[var(--text-secondary)] bg-[var(--background-card)] px-2 py-0.5 rounded-full border border-[var(--glass-border)]">
                      {schedules.goals.filter((g) => g.type === 'long-term' && g.completed).length} / {schedules.goals.filter((g) => g.type === 'long-term').length}
                    </span>
                  </h3>
                  <div className="space-y-3">
                    {schedules.goals.filter((g) => g.type === 'long-term').map((goal) => (
                      <GoalCard key={goal.id} goal={goal} toggleGoal={schedules.toggleGoal} removeGoal={schedules.removeGoal} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GoalCard({ goal, toggleGoal, removeGoal }: { goal: GoalItem; toggleGoal: (id: string) => void; removeGoal: (id: string) => void }) {
  return (
    <div className={`glass-card p-4 rounded-xl border flex gap-3 group transition-all ${goal.completed ? 'border-[#8b5cf6]/50 bg-[#8b5cf6]/5' : 'border-[var(--glass-border)]'}`}>
      <button onClick={() => toggleGoal(goal.id)} className="mt-0.5 shrink-0">
        {goal.completed ? (
          <CheckCircle2 className="w-5 h-5 text-[#8b5cf6]" />
        ) : (
          <Circle className="w-5 h-5 text-[var(--text-secondary)]" />
        )}
      </button>
      <div className="flex-1">
        <p className={`text-base leading-tight ${goal.completed ? 'line-through text-[var(--text-secondary)]' : 'text-white'}`}>
          {goal.title}
        </p>
      </div>
      <button
        onClick={() => removeGoal(goal.id)}
        className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-red-400/20 rounded-lg h-fit"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
