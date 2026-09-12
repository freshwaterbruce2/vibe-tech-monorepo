import React, { useEffect, useState } from 'react';
import { usageMonitor, type UsageData, type UsageLimits } from '../../services/usageMonitor';

const ScreenTimeSettings = () => {
  const [usage, setUsage] = useState<UsageData>(usageMonitor.getUsageStats());
  const [limits, setLimits] = useState<UsageLimits>(usageMonitor.getLimits());
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [devBypassActive, setDevBypassActive] = useState(
    typeof usageMonitor.isDevBypassActive === 'function' ? usageMonitor.isDevBypassActive() : false,
  );
  const [devBypassRemaining, setDevBypassRemaining] = useState(
    typeof usageMonitor.getDevBypassRemainingMinutes === 'function'
      ? usageMonitor.getDevBypassRemainingMinutes()
      : 0,
  );
  useEffect(() => {
    const interval = setInterval(() => {
      setUsage(usageMonitor.getUsageStats());
      if (typeof usageMonitor.isDevBypassActive === 'function') {
        setDevBypassActive(usageMonitor.isDevBypassActive());
        setDevBypassRemaining(usageMonitor.getDevBypassRemainingMinutes());
      }
    }, 10_000);
    return () => clearInterval(interval);
  }, []);
  const change = (key: keyof UsageLimits, value: number) => setLimits((current) => ({ ...current, [key]: value }));
  const save = async () => { setSaving(true); setStatus(''); try { await usageMonitor.updateLimits(limits); setLimits(usageMonitor.getLimits()); setStatus('Limits saved.'); } catch { setStatus('Could not save limits. Check storage and try again.'); } finally { setSaving(false); } };
  const reset = async () => { if (!window.confirm("Reset today's AI reply and visible app time totals?")) return; setResetting(true); setStatus(''); try { await usageMonitor.resetToday(); setUsage(usageMonitor.getUsageStats()); setStatus("Today's usage reset."); } catch { setStatus("Could not reset today's usage. Check storage and try again."); } finally { setResetting(false); } };
  const toggleDevBypass = () => {
    if (devBypassActive) {
      usageMonitor.disableDevBypass?.();
      setDevBypassActive(false);
      setDevBypassRemaining(0);
      setStatus('Developer bypass disabled.');
    } else {
      usageMonitor.enableDevBypass?.(3600000);
      setDevBypassActive(true);
      setDevBypassRemaining(60);
      setStatus('Developer bypass active for 1 hour. Quiet hours paused.');
    }
  };
  const percent = (value: number, limit: number) => Math.min((value / limit) * 100, 100);
  const color = (value: number) => value >= 90 ? 'bg-red-500' : value >= 75 ? 'bg-yellow-500' : 'bg-violet-500';
  const ranges: Array<[keyof UsageLimits, string, number, number, number, string]> = [['maxDailyScreenTime', 'Daily visible app time before new AI replies pause', 15, 480, 15, 'minutes'], ['maxConsecutiveTime', 'Consecutive visible use before a break reminder', 15, 120, 15, 'minutes'], ['breakDuration', 'Recommended break duration', 5, 30, 5, 'minutes'], ['maxDailyRequests', 'Daily Tutor/Buddy AI replies', 1, 30, 1, 'replies']];
  return <div className="glass-card p-6">
    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary-accent)] to-[var(--secondary-accent)]">Tutor & Buddy Reply Controls</h2>
    <p className="mt-2 text-sm text-text-secondary">These parent controls pause new AI Tutor/Buddy replies. They do not lock the rest of the app.</p>
    <p className="mt-1 text-sm text-text-secondary">A parent limit may pause replies sooner and never raises the separate 30/UTC-day, 200/UTC-month allowance.</p>
    <div className="mb-8 mt-6"><h3 className="text-lg font-semibold mb-4">Today's AI reply and visible app time</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {([[usage.dailyScreenTime, limits.maxDailyScreenTime, 'Visible app time', 'min'], [usage.dailyRequests, limits.maxDailyRequests, 'Tutor/Buddy AI replies', 'replies']] as const).map(([value, limit, label, unit]) => <div key={label} className="bg-background-secondary/30 rounded-lg p-4"><div className="flex justify-between items-center mb-2"><span className="text-sm text-text-secondary">{label}</span><span className="text-sm font-bold">{value} / {limit} {unit}</span></div><div className="w-full bg-background-main rounded-full h-3 overflow-hidden"><div className={`h-full transition-all duration-500 ${color(percent(value, limit))}`} style={{ width: `${percent(value, limit)}%` }} /></div></div>)}
    </div></div>
    <div className="mb-8"><h3 className="text-lg font-semibold mb-4">Parent reply limits</h3><div className="space-y-6">
      {ranges.map(([key, label, min, max, step, unit]) => <div key={key}><label className="block text-sm font-medium mb-2">{label}: {limits[key]} {unit}</label><input aria-label={label} disabled={saving || resetting} type="range" min={min} max={max} step={step} value={limits[key]} onChange={(event) => change(key, Number(event.target.value))} className="w-full h-2 bg-background-main rounded-lg cursor-pointer" /></div>)}
      <div className="grid grid-cols-2 gap-4">{(['quietHoursStart', 'quietHoursEnd'] as const).map((key) => <div key={key}><label className="block text-sm font-medium mb-2">Quiet hours {key.endsWith('Start') ? 'start' : 'end'}: {limits[key]}:00</label><input aria-label={`Quiet hours ${key.endsWith('Start') ? 'start' : 'end'}`} disabled={saving || resetting} type="range" min="0" max="23" step="1" value={limits[key]} onChange={(event) => change(key, Number(event.target.value))} className="w-full h-2 bg-background-main rounded-lg cursor-pointer" /></div>)}</div>
    </div></div>
    <div className="mb-8 rounded-lg border border-[var(--glass-border)] bg-background-secondary/20 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h4 className="font-semibold text-sm text-[var(--text-primary)]">Developer Bypass (1 hour)</h4>
          <p className="text-xs text-text-secondary mt-0.5">
            {devBypassActive
              ? `Active: ${devBypassRemaining} min remaining. Quiet hours and reply limits are paused.`
              : 'Temporarily pause quiet hours and local reply limits for nocturnal QA.'}
          </p>
        </div>
        <button
          type="button"
          onClick={toggleDevBypass}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            devBypassActive
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'bg-background-secondary/60 text-text-secondary hover:text-text-primary border border-[var(--glass-border)]'
          }`}
        >
          {devBypassActive ? 'Disable Bypass' : 'Enable 1-Hour Bypass'}
        </button>
      </div>
    </div>
    <div className="flex flex-wrap gap-3"><button onClick={save} disabled={saving || resetting} className="glass-button px-6 py-3 font-semibold rounded-lg transition-all">{saving ? 'Saving limits…' : 'Save Limits'}</button><button onClick={() => setShowReport((visible) => !visible)} className="px-6 py-3 font-semibold bg-background-secondary/50 rounded-lg hover:bg-background-secondary transition-all">{showReport ? 'Hide' : 'Show'} Usage Summary</button><button onClick={reset} disabled={saving || resetting} className="px-6 py-3 font-semibold bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all">{resetting ? 'Resetting today…' : "Reset Today's Usage"}</button></div>
    <p role="status" aria-live="polite" className="mt-4 text-sm text-text-secondary">{status}</p>
    {showReport && <pre className="mt-6 bg-background-secondary/30 rounded-lg p-4 text-sm text-text-secondary whitespace-pre-wrap font-mono">{usageMonitor.generateReport()}</pre>}
  </div>;
};
export default ScreenTimeSettings;
