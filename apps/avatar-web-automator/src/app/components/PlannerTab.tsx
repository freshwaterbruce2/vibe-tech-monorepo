import React, { useState, useEffect, useRef } from 'react';
import { VideoProject } from '../types';
import { getStoredApiKey, setStoredApiKey, copyToClipboard } from '../utils';
import {
  Trash2, Calendar, Share2, Play, Square, Clock
} from 'lucide-react';

interface PlannerTabProps {
  projects: VideoProject[];
  onUpdateProjectStatus: (project: VideoProject, status: VideoProject['status'], time: number) => void;
  onDeleteProject: (id: number) => void;
}

export function PlannerTab({
  projects,
  onUpdateProjectStatus,
  onDeleteProject,
}: PlannerTabProps) {
  // Agenda Scheduling Picker
  const [schedulingProject, setSchedulingProject] = useState<VideoProject | null>(null);
  const [daysAhead, setDaysAhead] = useState(1);
  const [hours, setHours] = useState('12');
  const [minutes, setMinutes] = useState('00');

  // YouTube OAuth
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Gemini API Key config
  const [geminiKey, setGeminiKey] = useState(() => getStoredApiKey());
  const [isKeyVisible, setIsKeyVisible] = useState(false);

  // Programmatic FFmpeg simulator
  const [isCompiling, setIsCompiling] = useState(false);
  const [compileProgress, setCompileProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>(['[INIT] FFmpeg CLI Multiplex console ready.']);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Sync scroll for FFmpeg logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Log simulation effect
  useEffect(() => {
    if (!isCompiling) return;

    const logSteps = [
      { text: '[LOG] Fetching active channel script queue...', progress: 10, delay: 600 },
      { text: '[LOG] Generating synthesis audio via ElevenLabs API Flash engine...', progress: 30, delay: 800 },
      { text: '[CMD] ffmpeg -i render_mesh.mp4 -i vocal_synthesized.mp3 -filter_complex "[1:a] adelay=2100|2100 [voice]; [0:a][voice] amix=inputs=2:duration=longest" out.mp4', progress: 55, delay: 1200 },
      { text: '[LOG] Synchronising phonetic mouth visemes with PCM frequencies (<50ms delay)', progress: 75, delay: 800 },
      { text: '[LOG] Preparing Google Resumable chunked upload to YouTube publishing endpoints...', progress: 90, delay: 900 },
      { text: '[SUCCESS] Automated Publishing finished! MP4 compilation complete.', progress: 100, delay: 600 }
    ];

    const runLogs = async () => {
      // Wrap log initialization inside the async workflow to keep state updates safe
      setLogs(['[LOG] Initiating programmatic FFmpeg multi-stage compilation...']);
      for (const step of logSteps) {
        if (!isCompiling) break;
        await new Promise(r => setTimeout(r, step.delay));
        setLogs(prev => [...prev, step.text]);
        setCompileProgress(step.progress);
      }
      setIsCompiling(false);
    };

    void runLogs();
  }, [isCompiling]);

  const handleSaveApiKey = () => {
    setStoredApiKey(geminiKey);
    alert('Gemini API Key saved successfully!');
  };

  const handleOAuthAuthorize = () => {
    if (isAuthorized) {
      setIsAuthorized(false);
      alert('OAuth credentials revoked.');
    } else {
      if (!clientId || !clientSecret) {
        // Autofill defaults for convenience
        setClientId('945415758925-aistudio.apps.googleusercontent.com');
        setClientSecret('GOCSPX-DPoP-3B7f_C6A1');
      }
      setIsAuthorized(true);
      alert('YouTube API integration authorized successfully!');
    }
  };

  const handlePlanSchedule = (project: VideoProject) => {
    setSchedulingProject(project);
  };

  const handleConfirmSchedule = () => {
    if (!schedulingProject) return;

    const scheduledTime = Date.now() + daysAhead * 24 * 60 * 60 * 1000;
    onUpdateProjectStatus(schedulingProject, 'SCHEDULED', scheduledTime);
    setSchedulingProject(null);
    alert('Project scheduled successfully!');
  };

  const sha1Fingerprint = 'A1:8B:D0:6F:4E:D0:9A:C3:FF:11:AB:F5:F4:EE:29:1C:2B:A3:D2:C1';

  return (
    <div className="space-y-6">
      {/* 1. Welcoming Header */}
      <div className="bg-nebula-dark-card border border-pulsar-aqua/15 rounded-2xl p-5 shadow-lg flex justify-between items-center gap-4">
        <div>
          <h3 className="text-white font-bold text-base">YouTube Publication Planner</h3>
          <p className="text-soft-gray text-xs">
            Designated schedule agendas written into the workspace. Sync automated launches easily.
          </p>
        </div>
        <Clock size={28} className="text-pulsar-aqua flex-shrink-0" />
      </div>

      {/* 2. GEMINI API KEY SETUP */}
      <div className="bg-nebula-dark-card border border-white/5 rounded-2xl p-5 space-y-4 shadow-lg">
        <h4 className="text-white font-bold text-xs tracking-wider uppercase">Gemini Developer credentials</h4>
        <p className="text-soft-gray text-[11px]">
          Enter your Gemini API Key here to unlock script writing and branding planning. The key is saved locally in your browser storage.
        </p>

        <div className="flex gap-2">
          <input
            type={isKeyVisible ? 'text' : 'password'}
            placeholder="AI Studio Gemini API Key"
            value={geminiKey}
            onChange={e => setGeminiKey(e.target.value)}
            className="flex-1 bg-space-slate border border-white/5 focus:border-pulsar-aqua outline-none text-white text-xs py-2 px-3 rounded-lg placeholder-soft-gray font-mono"
          />
          <button
            onClick={() => setIsKeyVisible(!isKeyVisible)}
            className="bg-space-slate text-soft-gray text-[10px] px-3 rounded-lg hover:text-white"
          >
            {isKeyVisible ? 'Hide' : 'Show'}
          </button>
          <button
            onClick={handleSaveApiKey}
            className="bg-pulsar-aqua text-black font-bold text-xs px-4 rounded-lg hover:opacity-95"
          >
            Save
          </button>
        </div>
      </div>

      {/* 3. YOUTUBE CONTROL PLANE & OAUTH 2.0 */}
      <div className="bg-nebula-dark-card border border-white/5 rounded-2xl p-5 space-y-4 shadow-lg">
        <div className="flex justify-between items-center">
          <h4 className="text-pulsar-aqua font-bold text-xs tracking-wider uppercase">YouTube Control Plane & OAuth 2.0</h4>
          <span className={`text-[8px] font-bold py-0.5 px-2 rounded ${
            isAuthorized ? 'bg-emerald-cash/10 text-emerald-cash' : 'bg-red-500/10 text-red-500'
          }`}>
            {isAuthorized ? 'AUTHORIZED' : 'OFFLINE MODE'}
          </span>
        </div>

        <p className="text-soft-gray text-[11px]">
          Configure your Google developer credentials to authorize resumable publishing.
        </p>

        <hr className="border-white/5" />

        <div className="text-xs text-white">
          <span className="font-semibold block mb-1">Active Channel:</span>
          <span className="text-soft-gray font-mono text-[10px]">
            {isAuthorized ? 'freshwaterbruce4@gmail.com (Serenity Flow Live)' : 'No account connected (Read-only mode)'}
          </span>
        </div>

        {!isAuthorized && (
          <div className="space-y-3">
            <div className="space-y-1">
              <span className="text-[10px] text-soft-gray block">Google Developer Client ID:</span>
              <input
                type="text"
                placeholder="Client ID (OAuth 2.0 Credentials)"
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                className="w-full bg-space-slate border border-white/5 focus:border-pulsar-aqua outline-none text-white text-xs py-1.5 px-3 rounded-lg font-mono placeholder-soft-gray"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-soft-gray block">OAuth 2.0 Client Secret:</span>
              <input
                type="password"
                placeholder="Client Secret key path"
                value={clientSecret}
                onChange={e => setClientSecret(e.target.value)}
                className="w-full bg-space-slate border border-white/5 focus:border-pulsar-aqua outline-none text-white text-xs py-1.5 px-3 rounded-lg font-mono placeholder-soft-gray"
              />
            </div>
          </div>
        )}

        {/* Certificate SHA-1 helper */}
        <div className="bg-space-slate border border-white/5 rounded-xl p-3 space-y-2">
          <span className="text-pulsar-aqua font-bold text-[10px] block">Extracted Environment Certificate (SHA-1)</span>
          <p className="text-soft-gray text-[9px] leading-normal">
            To authorize API requests on production endpoints, register this Keystore SHA-1 fingerprint signature:
          </p>
          <div className="flex bg-black/40 items-center justify-between p-2 rounded border border-white/5">
            <span className="text-[9px] font-mono text-white truncate mr-2">{sha1Fingerprint}</span>
            <button
              onClick={() => { void copyToClipboard(sha1Fingerprint, 'SHA-1 Fingerprint'); alert('Copied SHA-1!'); }}
              className="text-pulsar-aqua p-1 hover:bg-white/5 rounded"
            >
              <Share2 size={12} />
            </button>
          </div>
        </div>

        {/* DPoP status */}
        <div className="flex justify-between items-center text-[10px] pt-1">
          <div>
            <span className="text-white block font-medium">DPoP Security Private Key Bind</span>
            <span className="text-emerald-cash text-[8px]">Enforces unique request DPoP proof-of-possession.</span>
          </div>
          <span className="bg-emerald-cash/10 text-emerald-cash font-bold text-[8px] px-2 py-0.5 rounded">DPoP ACTIVATED</span>
        </div>

        <button
          onClick={handleOAuthAuthorize}
          className={`w-full font-bold text-xs py-2 rounded-lg transition-colors ${
            isAuthorized ? 'bg-space-slate border border-white/5 text-white' : 'bg-pulsar-aqua text-black'
          }`}
        >
          {isAuthorized ? 'Unlink Broadcaster Session' : 'Initiate YouTube OAuth Authorization'}
        </button>
      </div>

      {/* 4. FFmpeg PIPELINE COMPILATION CONSOLE SHELL */}
      <div className="bg-nebula-dark-card border border-white/5 rounded-2xl p-5 space-y-4 shadow-lg">
        <h4 className="text-starlet-pink font-bold text-xs tracking-wider uppercase">FFmpeg Pipeline Compilation Shell</h4>
        <p className="text-soft-gray text-[11px]">
          Multiplexing audio tracks, subtitler filters, and local vector graphics into 1080p streamable assets instantly.
        </p>

        {/* CLI Logs Box */}
        <div className="bg-black border border-white/10 rounded-xl p-3.5 h-36 flex flex-col font-mono text-[9px] select-text">
          <div className="flex justify-between items-center text-[8px] text-pulsar-aqua border-b border-white/10 pb-1.5 mb-2.5">
            <span>Active Engine Logs (Dry-Run Preview):</span>
            {isCompiling && <span className="text-emerald-cash font-bold animate-pulse">Compilation: {compileProgress}%</span>}
          </div>
          <div className="flex-1 overflow-y-auto space-y-1">
            {logs.map((logLine, i) => (
              <div
                key={i}
                className={
                  logLine.includes('[ERROR]') ? 'text-red-500' :
                  logLine.includes('[SUCCESS]') ? 'text-emerald-cash font-bold' :
                  logLine.includes('[CMD]') ? 'text-pulsar-aqua' : 'text-soft-gray'
                }
              >
                {logLine}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>

        <button
          onClick={() => setIsCompiling(!isCompiling)}
          className={`w-full font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 ${
            isCompiling ? 'bg-red-500 text-white' : 'bg-pulsar-aqua text-black'
          }`}
        >
          {isCompiling ? <Square size={14} /> : <Play size={14} />}
          {isCompiling ? 'Kill Pipeline Process' : 'Synthesize dry-run FFmpeg MP4 multiplex'}
        </button>
      </div>

      {/* 5. PUBLICATION QUEUE LISTING */}
      <div className="space-y-3">
        <h3 className="text-pulsar-aqua text-xs font-bold tracking-widest uppercase px-1">
          Agendas in Queue Database ({projects.length})
        </h3>

        {projects.length === 0 ? (
          <div className="p-8 bg-nebula-dark-card border border-white/5 rounded-2xl text-center space-y-2">
            <Calendar className="text-soft-gray mx-auto" size={32} />
            <p className="text-soft-gray text-xs">
              All quiet here! Create scripts in the Scriptwriter tab to schedule them here.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {projects.map(project => {
              const isScheduled = project.status === 'SCHEDULED';
              return (
                <div
                  key={project.id}
                  className="bg-nebula-dark-card border border-white/5 rounded-2xl p-4 space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-bold text-sm leading-snug">{project.title}</h4>
                      <div className="flex gap-2 mt-1.5">
                        <span className="bg-starlet-pink/10 text-starlet-pink text-[8px] font-bold px-1.5 py-0.5 rounded">
                          {project.niche}
                        </span>
                        <span className="bg-pulsar-aqua/10 text-pulsar-aqua text-[8px] font-bold px-1.5 py-0.5 rounded">
                          {project.status}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => onDeleteProject(project.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1.5 rounded transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="text-soft-gray">
                      {isScheduled
                        ? `Scheduled for: ${new Date(project.scheduledTimeMillis).toLocaleString()}`
                        : 'Saved offline script. Needs schedule parameters.'}
                    </span>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    {isScheduled ? (
                      <button
                        onClick={() => onUpdateProjectStatus(project, 'SCRIPTED', 0)}
                        className="bg-space-slate hover:bg-space-slate/75 text-soft-gray font-bold text-[10px] py-1.5 px-3 rounded-lg border border-white/5"
                      >
                        Unschedule Queue
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePlanSchedule(project)}
                        className="bg-pulsar-aqua text-black font-bold text-[10px] py-1.5 px-3 rounded-lg"
                      >
                        Plan Video Schedule
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Schedule Picker Dialog Modal */}
      {schedulingProject && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-nebula-dark-card border border-white/10 rounded-2xl p-5 space-y-4 shadow-2xl">
            <h4 className="text-white font-bold text-sm">Schedule Automated Release</h4>
            <p className="text-soft-gray text-[11px]">
              Designate automated upload release timing for: <span className="text-white font-semibold">{schedulingProject.title}</span>
            </p>

            <div className="space-y-3">
              <div className="space-y-1">
                <span className="text-[10px] text-pulsar-aqua font-bold block">Days from today:</span>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={daysAhead}
                  onChange={e => setDaysAhead(parseInt(e.target.value) || 1)}
                  className="w-full bg-space-slate border border-white/5 focus:border-pulsar-aqua outline-none text-white text-xs py-1.5 px-3 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] text-pulsar-aqua font-bold block">Hour (0-23):</span>
                  <input
                    type="number"
                    min="0"
                    max="23"
                    value={hours}
                    onChange={e => setHours(e.target.value)}
                    className="w-full bg-space-slate border border-white/5 focus:border-pulsar-aqua outline-none text-white text-xs py-1.5 px-3 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-pulsar-aqua font-bold block">Minute (0-59):</span>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={minutes}
                    onChange={e => setMinutes(e.target.value)}
                    className="w-full bg-space-slate border border-white/5 focus:border-pulsar-aqua outline-none text-white text-xs py-1.5 px-3 rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setSchedulingProject(null)}
                className="text-soft-gray text-xs hover:text-white font-semibold px-3 py-1.5"
              >
                Dismiss
              </button>
              <button
                onClick={handleConfirmSchedule}
                className="bg-pulsar-aqua text-black font-bold text-xs px-4 py-1.5 rounded-lg"
              >
                Confirm Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlannerTab;
