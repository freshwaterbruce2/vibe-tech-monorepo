import { invoke } from '@tauri-apps/api/core';
import { useEffect, useState } from 'react';

interface SystemStats {
  cpu: number;
  ram_used_gb: number;
  ram_total_gb: number;
  ram_percent: number;
  disk_used_gb: number;
  disk_total_gb: number;
  disk_percent: number;
}

const INITIAL: SystemStats = {
  cpu: 0,
  ram_used_gb: 0,
  ram_total_gb: 0,
  ram_percent: 0,
  disk_used_gb: 0,
  disk_total_gb: 0,
  disk_percent: 0,
};

function CircularProgress({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="sysmon__gauge">
      <svg className="sysmon__gauge-svg" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          className="sysmon__gauge-track"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke={color}
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="sysmon__gauge-fill"
          strokeLinecap="round"
        />
      </svg>
      <div className="sysmon__gauge-label">
        <span className="sysmon__gauge-value">{value.toFixed(0)}%</span>
        <span className="sysmon__gauge-name">{label}</span>
      </div>
    </div>
  );
}

export function SystemMonitor({ onClose }: { onClose: () => void }) {
  const [stats, setStats] = useState<SystemStats>(INITIAL);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let unmounted = false;

    const fetchStats = async () => {
      try {
        const data = await invoke<SystemStats>('get_system_stats');
        if (!unmounted) {
          setStats(data);
          setLoaded(true);
        }
      } catch (err) {
        console.error('Failed to get system stats:', err);
      }
    };

    void fetchStats();
    const interval = setInterval(() => {
      void fetchStats();
    }, 1500);

    return () => {
      unmounted = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="sysmon">
      <div className="sysmon__header">
        <span className="sysmon__title">⚡ System Monitor</span>
        <button onClick={onClose} className="sysmon__close" title="Close">
          ✕
        </button>
      </div>

      <div className="sysmon__body">
        {loaded ? (
          <div className="sysmon__content">
            <div className="sysmon__gauges">
              <CircularProgress
                value={stats.cpu}
                label="CPU"
                color={stats.cpu > 85 ? '#ef4444' : stats.cpu > 60 ? '#eab308' : '#3b82f6'}
              />
              <CircularProgress
                value={stats.ram_percent}
                label="RAM"
                color={
                  stats.ram_percent > 85
                    ? '#ef4444'
                    : stats.ram_percent > 60
                      ? '#eab308'
                      : '#8b5cf6'
                }
              />
            </div>

            <div className="sysmon__details">
              <div className="sysmon__detail-row">
                <span className="sysmon__detail-label">Memory Usage</span>
                <span className="sysmon__detail-value">
                  {stats.ram_used_gb.toFixed(1)} GB / {stats.ram_total_gb.toFixed(1)} GB
                </span>
              </div>
              <div className="sysmon__bar">
                <div
                  className="sysmon__bar-fill sysmon__bar-fill--ram"
                  style={{ width: `${stats.ram_percent}%` }}
                />
              </div>

              <div className="sysmon__detail-row">
                <span className="sysmon__detail-label">Disk Usage</span>
                <span className="sysmon__detail-value">
                  {stats.disk_used_gb.toFixed(1)} GB / {stats.disk_total_gb.toFixed(1)} GB
                </span>
              </div>
              <div className="sysmon__bar">
                <div
                  className="sysmon__bar-fill sysmon__bar-fill--disk"
                  style={{ width: `${stats.disk_percent}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="sysmon__loading">Gathering telemetry...</div>
        )}
      </div>
    </div>
  );
}
