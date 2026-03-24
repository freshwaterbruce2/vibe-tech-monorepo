import { useCallback, useEffect, useRef, useState } from 'react';
import { executePipeline } from '../pipeline/orchestrator';
import { useAVGEStore } from '../stores/avge-store';
import { ChatPanel } from './ChatPanel';
import type { HatchResult } from './HatchSequence';
import { HatchSequence } from './HatchSequence';
import { IntelligenceBrowser } from './IntelligenceBrowser';
import { PersonalityConfig } from './PersonalityConfig';
import { PipelineStatus } from './PipelineStatus';
import { ProjectConfig } from './ProjectConfig';

const NAV_ITEMS = [
  { id: 'pipeline' as const, icon: '⚡', label: 'Pipeline' },
  { id: 'intelligence' as const, icon: '📚', label: 'Intelligence' },
  { id: 'chat' as const, icon: '💬', label: 'Chat' },
  { id: 'config' as const, icon: '⚙️', label: 'Config' },
  { id: 'personality' as const, icon: '🎭', label: 'Persona' },
];

const SERVICES = [
  { label: 'NotebookLM', key: 'nlm' },
  { label: 'Google TTS', key: 'tts' },
  { label: 'Flux Schnell', key: 'flux' },
  { label: 'D:\\ Storage', key: 'storage' },
] as const;

export function Dashboard() {
  const activePanel = useAVGEStore((s) => s.activePanel);
  const setActivePanel = useAVGEStore((s) => s.setActivePanel);
  const isRunning = useAVGEStore((s) => s.isRunning);
  const setCurrentRun = useAVGEStore((s) => s.setCurrentRun);
  const addRunToHistory = useAVGEStore((s) => s.addRunToHistory);
  const addLogEntry = useAVGEStore((s) => s.addLogEntry);
  const sourceUrls = useAVGEStore((s) => s.sourceUrls);
  const brainContext = useAVGEStore((s) => s.brainContext);
  const runHistory = useAVGEStore((s) => s.runHistory);
  const activeProject = useAVGEStore((s) => s.activeProject);
  const voiceConfig = useAVGEStore((s) => s.voiceConfig);
  const visualIdentity = useAVGEStore((s) => s.visualIdentity);
  const projectName = useAVGEStore((s) => s.projectName);
  const setProjectName = useAVGEStore((s) => s.setProjectName);
  const setVoiceConfig = useAVGEStore((s) => s.setVoiceConfig);
  const setBrainContext = useAVGEStore((s) => s.setBrainContext);
  const clockRef = useRef<HTMLSpanElement>(null);

  const [showHatch, setShowHatch] = useState(false);

  // Auto-load brain.md from D:\avge\ on mount
  useEffect(() => {
    if (brainContext) return; // Already loaded
    fetch('/api/fs/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: 'brain.md' }),
    })
      .then(async (r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.content) {
          setBrainContext(data.content);
          console.log('[Dashboard] brain.md auto-loaded');
        }
      })
      .catch(() => console.warn('[Dashboard] brain.md not found — will use empty context'));
  }, [brainContext, setBrainContext]);

  useEffect(() => {
    const tick = () => {
      if (!clockRef.current) return;
      const d = new Date();
      clockRef.current.textContent = d.toLocaleTimeString('en-US', { hour12: false });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const handleHatchComplete = useCallback(
    (config: HatchResult) => {
      setShowHatch(false);
      addLogEntry('done', `Project hatched: "${config.projectTitle}"`);
      addLogEntry('info', `Voice: ${config.voice}, Pacing: ${config.pacing}`);
      addLogEntry('info', `Niche: ${config.niche}, Audience: ${config.audience}`);

      setProjectName(config.projectTitle);

      const voiceMap: Record<string, string> = {
        Casual: 'casual',
        Professional: 'professional',
        Storyteller: 'casual',
        Educator: 'academic',
      };
      const pacingMap: Record<string, string> = {
        'Fast-Cut': 'fast-cut',
        Steady: 'steady',
        Cinematic: 'cinematic',
      };
      setVoiceConfig({
        formality: voiceMap[config.voice] ?? 'casual',
        pacing: pacingMap[config.pacing] ?? 'steady',
        emotion: 'energetic',
        perspective: 'second-person',
      });

      const brainBlock = [
        `# ${config.projectTitle}`,
        '',
        `**Niche:** ${config.niche}`,
        `**Voice:** ${config.voice}`,
        `**Pacing:** ${config.pacing}`,
        `**Audience:** ${config.audience}`,
      ].join('\n');

      useAVGEStore.getState().setBrainContext(brainBlock);
    },
    [addLogEntry, setProjectName, setVoiceConfig],
  );

  const handleLaunchPipeline = async () => {
    if (isRunning) return;

    if (!activeProject && !brainContext.trim()) {
      setShowHatch(true);
      return;
    }

    addLogEntry('info', 'Pipeline launch initiated');

    try {
      const result = await executePipeline({
        projectTitle: projectName || 'AVGE Run',
        sourceUrls,
        brainContext,
        onEvent: (event) => {
          if (event.type === 'STAGE_START') {
            addLogEntry('info', `Stage starting: ${event.stage}`);
          }
          if (event.type === 'STAGE_COMPLETE') {
            addLogEntry('done', `Stage complete: ${event.stage}`);
          }
          if (event.type === 'STAGE_ERROR') {
            addLogEntry('fail', `Stage failed: ${event.stage} — ${event.error}`);
          }
          if (event.type === 'PIPELINE_COMPLETE') {
            addLogEntry('done', 'Pipeline complete');
            setCurrentRun(event.run);
            addRunToHistory(event.run);
          }
          if (event.type === 'PIPELINE_FAILED') {
            addLogEntry('fail', `Pipeline failed: ${event.error}`);
            setCurrentRun(event.run);
            addRunToHistory(event.run);
          }
        },
      });

      setCurrentRun(result.run);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addLogEntry('fail', `Pipeline crashed: ${msg}`);
      console.error('[Dashboard] Pipeline crash:', err);
    }
  };

  const storageStatus = 'success';
  const getServiceStatus = (key: string): string => {
    if (key === 'storage') return storageStatus;
    return isRunning ? 'running' : 'idle';
  };

  const primaryColor = visualIdentity.primaryColors[0] ?? '#6366f1';

  return (
    <div className="dashboard-layout">
      <div className="scanline-overlay" />

      {showHatch && (
        <HatchSequence
          projectTitle=""
          onComplete={handleHatchComplete}
          onCancel={() => setShowHatch(false)}
        />
      )}

      {/* ── Header ── */}
      <header className="dashboard-header">
        <div className="header-left">
          <span className="header-icon">🎬</span>
          <h1 className="gradient-text header-title">AVGE</h1>
          <span className="mono header-version">v0.3.0</span>
        </div>

        <div className="header-right">
          <span ref={clockRef} className="mono header-meta" />

          <span className="mono header-meta">RUNS: {runHistory.length}</span>

          <button className="tab-btn" onClick={() => setShowHatch(true)} disabled={isRunning}>
            + New
          </button>

          <button
            className={`btn ${isRunning ? 'btn-ghost' : 'btn-launch'}`}
            onClick={handleLaunchPipeline}
            disabled={isRunning}
          >
            {isRunning ? (
              <>
                <span className="status-dot running" />
                Processing...
              </>
            ) : (
              <>🚀 Launch BLAST</>
            )}
          </button>
        </div>
      </header>

      {/* ── Sidebar ── */}
      <nav className="dashboard-sidebar">
        <div className="sidebar-nav-list">
          {NAV_ITEMS.map((item, i) => (
            <div
              key={item.id}
              className={`nav-item ${activePanel === item.id ? 'active' : ''}`}
              onClick={() => setActivePanel(item.id)}
              style={{ animationDelay: `${i * 40}ms` }} /* stagger animation */
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        {/* System Status Card */}
        <div className="system-status-card">
          <div className="system-status-title">System Status</div>
          <div className="system-status-list">
            {SERVICES.map((svc) => (
              <div key={svc.key} className="status-row">
                <span>{svc.label}</span>
                <span className={`status-dot ${getServiceStatus(svc.key)}`} />
              </div>
            ))}
          </div>
        </div>

        {/* ── C2 Personality Indicator ── */}
        <div
          className="personality-badge"
          title={`${voiceConfig.formality} · ${voiceConfig.pacing}`}
        >
          <span className="personality-badge-dot" style={{ background: primaryColor }} />
          <span className="personality-badge-name">{projectName || 'No Project'}</span>
          <span className="personality-badge-tag">
            {voiceConfig.formality.slice(0, 3).toUpperCase()}
          </span>
        </div>
      </nav>

      {/* ── Main Content ── */}
      <main className="dashboard-main">
        <PipelineStatus />
        <IntelligenceBrowser />
        <ChatPanel />
        {activePanel === 'personality' ? <PersonalityConfig /> : <ProjectConfig />}
      </main>
    </div>
  );
}
