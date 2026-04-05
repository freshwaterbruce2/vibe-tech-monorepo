import ProgressBar from '../ui/ProgressBar';
import type { HomeworkItem } from '../../types';
import { useSmartSchedule } from './useSmartSchedule';

interface SmartScheduleProps {
  homework?: HomeworkItem[];
  onTaskComplete?: (taskId: string, points: number) => void;
  onEarnTokens?: (amount: number) => void;
  userTokens?: number;
}

/**
 * Blake's Smart Schedule - Automated, predictable, and ADHD/Autism-friendly
 * Automatically creates daily schedule based on patterns and preferences
 */
export const SmartSchedule = ({
  homework = [],
  onTaskComplete,
  onEarnTokens,
  userTokens = 0,
}: SmartScheduleProps) => {
  const {
    schedule, currentTime, autoMode, setAutoMode,
    currentActivity, nextActivity, completeActivity,
    getActivityColor, getActivityIcon,
  } = useSmartSchedule({ homework, onTaskComplete, onEarnTokens, userTokens });

  return (
    <div className="smart-schedule glass-card p-6">
      {/* Header */}
      <div className="header flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Blake's Daily Schedule</h2>
          <p className="text-gray-400">
            {currentTime.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-3xl font-bold text-cyan-400">
            {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <button
            onClick={() => setAutoMode(!autoMode)}
            className={`px-4 py-2 rounded-lg font-bold transition-all ${
              autoMode ? 'bg-violet-600 text-white' : 'bg-gray-600 text-gray-300'
            }`}
          >
            {autoMode ? '🤖 Auto' : '👤 Manual'}
          </button>
        </div>
      </div>

      {/* Current & Next Activity */}
      <div className="current-next grid grid-cols-2 gap-4 mb-6">
        <div className="current-activity p-4 bg-fuchsia-900/30 border-2 border-fuchsia-400 rounded-lg">
          <div className="text-sm text-fuchsia-400 mb-1">Now</div>
          {currentActivity ? (
            <>
              <div className="text-xl font-bold text-white">{currentActivity.title}</div>
              <div className="text-sm text-gray-400">
                Ends at{' '}
                {(() => {
                  const [h = '0', m = '0'] = currentActivity.time.split(':');
                  const end = new Date();
                  end.setHours(parseInt(h, 10), parseInt(m, 10) + currentActivity.duration);
                  return end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                })()}
              </div>
              {currentActivity.points && (
                <div className="mt-2 text-yellow-400 font-bold">
                  Earn {currentActivity.points} Robux! 💎
                </div>
              )}
            </>
          ) : (
            <div className="text-xl text-gray-500">Free Time</div>
          )}
        </div>

        <div className="next-activity p-4 bg-blue-900/30 border-2 border-blue-400 rounded-lg">
          <div className="text-sm text-blue-400 mb-1">Next Up</div>
          {nextActivity ? (
            <>
              <div className="text-xl font-bold text-white">{nextActivity.title}</div>
              <div className="text-sm text-gray-400">At {nextActivity.time}</div>
              {nextActivity.points && (
                <div className="mt-2 text-yellow-400 font-bold">
                  Worth {nextActivity.points} Robux! 💎
                </div>
              )}
            </>
          ) : (
            <div className="text-xl text-gray-500">All Done!</div>
          )}
        </div>
      </div>

      {/* Schedule Timeline */}
      <div className="timeline space-y-2 max-h-96 overflow-y-auto">
        {schedule.map((item, _index) => {
          const isPast = (() => {
            const [h = '0', m = '0'] = item.time.split(':');
            const itemTime = new Date();
            itemTime.setHours(parseInt(h), parseInt(m) + item.duration);
            return itemTime < currentTime;
          })();

          const isCurrent = item === currentActivity;

          return (
            <div
              key={item.id}
              className={`schedule-item flex items-center space-x-4 p-3 rounded-lg border-2 transition-all ${
                item.completed
                  ? 'bg-violet-900/20 border-violet-600 opacity-50'
                  : isCurrent
                    ? 'bg-yellow-900/30 border-yellow-400 scale-105'
                    : getActivityColor(item.type)
              }`}
            >
              {/* Time */}
              <div className="time text-lg font-bold text-gray-400 w-16">{item.time}</div>

              {/* Icon */}
              <div className="icon text-2xl">{getActivityIcon(item.type)}</div>

              {/* Content */}
              <div className="flex-1">
                <div className="font-bold text-white">{item.title}</div>
                <div className="text-sm text-gray-400">
                  {item.duration} min
                  {item.points && ` • ${item.points} Robux`}
                  {item.recurring && ' • Daily'}
                  {item.autoComplete && ' • Auto'}
                </div>
              </div>

              {/* Action */}
              {!item.completed && !isPast && (
                <button
                  onClick={() => completeActivity(item.id)}
                  className="glass-button px-4 py-2 text-sm hover:scale-110"
                >
                  Complete
                </button>
              )}

              {item.completed && <div className="text-fuchsia-400 text-2xl">✅</div>}
            </div>
          );
        })}
      </div>

      {/* Progress Summary */}
      <div className="summary mt-6 p-4 bg-purple-900/30 rounded-lg">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm text-purple-400">Today's Progress</div>
            <div className="text-2xl font-bold text-white">
              {schedule.filter((s) => s.completed).length} / {schedule.length} Complete
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-yellow-400">Robux Earned Today</div>
            <div className="text-2xl font-bold text-yellow-400">
              💎{' '}
              {schedule
                .filter((s) => s.completed && s.points)
                .reduce((sum, s) => sum + (s.points ?? 0), 0)}
            </div>
            <div className="text-sm text-gray-400 mt-1">Total: {userTokens} Robux</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <ProgressBar
            percent={(schedule.filter((s) => s.completed).length / schedule.length) * 100}
            barClassName="bg-gradient-to-r from-purple-400 to-pink-400"
            trackClassName="h-4 bg-gray-700 rounded-full overflow-hidden"
            label="Daily schedule progress"
          />
        </div>
      </div>
    </div>
  );
};

export default SmartSchedule;
