import React, { useState, useEffect } from 'react';
import { usageMonitor, type UsageData, type UsageLimits } from '../../services/usageMonitor';

import { appStore } from '../../utils/electronStore';

const ScreenTimeSettings = () => {
  const [usage, setUsage] = useState<UsageData>(usageMonitor.getUsageStats());
  const [limits, setLimits] = useState<UsageLimits>(usageMonitor.getLimits());
  const [isAdminMode, setIsAdminMode] = useState<boolean>(() => {
    return appStore.get('adminModeEnabled') === 'true';
  });
  const [showReport, setShowReport] = useState(false);

  useEffect(() => {
    // Refresh usage stats every 10 seconds
    const interval = setInterval(() => {
      setUsage(usageMonitor.getUsageStats());
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleLimitChange = (key: keyof UsageLimits, value: number) => {
    const newLimits = { ...limits, [key]: value };
    setLimits(newLimits);
  };

  const handleSave = () => {
    usageMonitor.updateLimits(limits);
    alert('Screen time limits saved successfully!');
  };

  const handleAdminModeToggle = () => {
    const newMode = !isAdminMode;
    setIsAdminMode(newMode);
    appStore.set('adminModeEnabled', String(newMode));

    if (newMode) {
      // Set very high limits to effectively disable
      const disabledLimits: UsageLimits = {
        maxDailyRequests: 999999,
        maxDailyScreenTime: 999999,
        maxConsecutiveTime: 999999,
        breakDuration: 0,
        quietHoursStart: 0,
        quietHoursEnd: 0
      };
      usageMonitor.updateLimits(disabledLimits);
      setLimits(disabledLimits);
      alert('Admin mode enabled - all limits disabled for testing');
    } else {
      // Restore default limits
      const defaultLimits: UsageLimits = {
        maxDailyRequests: 50,
        maxDailyScreenTime: 120,
        maxConsecutiveTime: 30,
        breakDuration: 10,
        quietHoursStart: 21,
        quietHoursEnd: 7
      };
      usageMonitor.updateLimits(defaultLimits);
      setLimits(defaultLimits);
      alert('Admin mode disabled - default limits restored');
    }
  };

  const handleResetStats = () => {
    if (confirm('Reset today\'s usage statistics? This cannot be undone.')) {
      appStore.delete('usageData');
      window.location.reload();
    }
  };

  const calculatePercentage = (current: number, max: number): number => {
    if (max === 0 || max > 99999) return 0; // Admin mode
    return Math.min((current / max) * 100, 100);
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-violet-500';
  };

  return (
    <div className="glass-card p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary-accent)] to-[var(--secondary-accent)]">
          Screen Time & Usage Controls
        </h2>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isAdminMode}
              onChange={handleAdminModeToggle}
              className="w-5 h-5 rounded cursor-pointer"
            />
            <span className="text-sm font-semibold text-yellow-400">
              Admin Mode (Disable All Limits)
            </span>
          </label>
        </div>
      </div>

      {/* Current Usage Stats */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Today's Usage</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Screen Time */}
          <div className="bg-background-secondary/30 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-text-secondary">Screen Time</span>
              <span className="text-sm font-bold">
                {usage.dailyScreenTime} / {limits.maxDailyScreenTime > 99999 ? '∞' : limits.maxDailyScreenTime} min
              </span>
            </div>
            <div className="w-full bg-background-main rounded-full h-3 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${getProgressColor(calculatePercentage(usage.dailyScreenTime, limits.maxDailyScreenTime))}`}
                style={{ width: `${calculatePercentage(usage.dailyScreenTime, limits.maxDailyScreenTime)}%` }}
              />
            </div>
          </div>

          {/* AI Requests */}
          <div className="bg-background-secondary/30 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-text-secondary">AI Requests</span>
              <span className="text-sm font-bold">
                {usage.dailyRequests} / {limits.maxDailyRequests > 99999 ? '∞' : limits.maxDailyRequests}
              </span>
            </div>
            <div className="w-full bg-background-main rounded-full h-3 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${getProgressColor(calculatePercentage(usage.dailyRequests, limits.maxDailyRequests))}`}
                style={{ width: `${calculatePercentage(usage.dailyRequests, limits.maxDailyRequests)}%` }}
              />
            </div>
          </div>

          {/* Focus Sessions */}
          <div className="bg-background-secondary/30 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-secondary">Focus Sessions</span>
              <span className="text-2xl font-bold text-[var(--primary-accent)]">{usage.focusSessions}</span>
            </div>
          </div>

          {/* Homework Completed */}
          <div className="bg-background-secondary/30 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-secondary">Homework Completed</span>
              <span className="text-2xl font-bold text-[var(--secondary-accent)]">{usage.homeworkCompleted}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Limit Configuration */}
      {!isAdminMode && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4">Limit Configuration</h3>
          <div className="space-y-6">
            {/* Daily Screen Time */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Max Daily Screen Time: {limits.maxDailyScreenTime} minutes ({(limits.maxDailyScreenTime / 60).toFixed(1)} hours)
              </label>
              <input
                type="range"
                min="15"
                max="480"
                step="15"
                value={limits.maxDailyScreenTime}
                onChange={(e) => handleLimitChange('maxDailyScreenTime', parseInt(e.target.value))}
                className="w-full h-2 bg-background-main rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-xs text-text-secondary mt-1">
                <span>15 min</span>
                <span>8 hours</span>
              </div>
            </div>

            {/* Consecutive Time */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Max Consecutive Time: {limits.maxConsecutiveTime} minutes (break reminder)
              </label>
              <input
                type="range"
                min="15"
                max="120"
                step="15"
                value={limits.maxConsecutiveTime}
                onChange={(e) => handleLimitChange('maxConsecutiveTime', parseInt(e.target.value))}
                className="w-full h-2 bg-background-main rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-xs text-text-secondary mt-1">
                <span>15 min</span>
                <span>2 hours</span>
              </div>
            </div>

            {/* Break Duration */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Recommended Break Duration: {limits.breakDuration} minutes
              </label>
              <input
                type="range"
                min="5"
                max="30"
                step="5"
                value={limits.breakDuration}
                onChange={(e) => handleLimitChange('breakDuration', parseInt(e.target.value))}
                className="w-full h-2 bg-background-main rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-xs text-text-secondary mt-1">
                <span>5 min</span>
                <span>30 min</span>
              </div>
            </div>

            {/* Max AI Requests */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Max Daily AI Requests: {limits.maxDailyRequests}
              </label>
              <input
                type="range"
                min="10"
                max="200"
                step="10"
                value={limits.maxDailyRequests}
                onChange={(e) => handleLimitChange('maxDailyRequests', parseInt(e.target.value))}
                className="w-full h-2 bg-background-main rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-xs text-text-secondary mt-1">
                <span>10 requests</span>
                <span>200 requests</span>
              </div>
            </div>

            {/* Quiet Hours */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Quiet Hours Start: {limits.quietHoursStart}:00
                </label>
                <input
                  type="range"
                  min="0"
                  max="23"
                  step="1"
                  value={limits.quietHoursStart}
                  onChange={(e) => handleLimitChange('quietHoursStart', parseInt(e.target.value))}
                  className="w-full h-2 bg-background-main rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-xs text-text-secondary mt-1">
                  <span>12 AM</span>
                  <span>11 PM</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Quiet Hours End: {limits.quietHoursEnd}:00
                </label>
                <input
                  type="range"
                  min="0"
                  max="23"
                  step="1"
                  value={limits.quietHoursEnd}
                  onChange={(e) => handleLimitChange('quietHoursEnd', parseInt(e.target.value))}
                  className="w-full h-2 bg-background-main rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-xs text-text-secondary mt-1">
                  <span>12 AM</span>
                  <span>11 PM</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        {!isAdminMode && (
          <button
            onClick={handleSave}
            className="glass-button px-6 py-3 font-semibold rounded-lg transition-all"
          >
            Save Limits
          </button>
        )}
        <button
          onClick={() => setShowReport(!showReport)}
          className="px-6 py-3 font-semibold bg-background-secondary/50 rounded-lg hover:bg-background-secondary transition-all"
        >
          {showReport ? 'Hide' : 'Show'} Detailed Report
        </button>
        <button
          onClick={handleResetStats}
          className="px-6 py-3 font-semibold bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all"
        >
          Reset Today's Stats
        </button>
      </div>

      {/* Detailed Report */}
      {showReport && (
        <div className="mt-6 bg-background-secondary/30 rounded-lg p-4">
          <h4 className="text-lg font-semibold mb-3">Detailed Usage Report</h4>
          <pre className="text-sm text-text-secondary whitespace-pre-wrap font-mono">
            {usageMonitor.generateReport()}
          </pre>
          {usage.violations && usage.violations.length > 0 && (
            <div className="mt-4">
              <h5 className="text-sm font-semibold text-yellow-400 mb-2">Recent Violations:</h5>
              <ul className="text-xs text-text-secondary space-y-1">
                {usage.violations.slice(-5).map((violation, idx) => (
                  <li key={idx}>{violation}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Admin Mode Warning */}
      {isAdminMode && (
        <div className="mt-6 bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4">
          <p className="text-yellow-400 text-sm">
            <strong>Admin Mode Active:</strong> All screen time limits are currently disabled.
            This is intended for testing and parent use only. Remember to disable admin mode when your child uses the app.
          </p>
        </div>
      )}
    </div>
  );
};

export default ScreenTimeSettings;
