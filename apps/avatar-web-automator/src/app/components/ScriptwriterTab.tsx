import React, { useState, useEffect } from 'react';
import { VideoProject, StoryScene } from '../types';
import { getStoredApiKey, parseTagBlocks } from '../utils';
import {
  Sparkles, CheckCircle2, AlertTriangle, Play, Pause,
  ShieldAlert, Cpu, Download, Youtube
} from 'lucide-react';

interface ScriptwriterTabProps {
  onAddProject: (project: Omit<VideoProject, 'id' | 'createdAt'>) => void;
}

export function ScriptwriterTab({ onAddProject }: ScriptwriterTabProps) {
  const [topicOfVideo, setTopicOfVideo] = useState('');
  const [channelNiche, setChannelNiche] = useState('Tech Trends');
  const [toneSelection, setToneSelection] = useState('Humorous');
  const [runningTime, setRunningTime] = useState(5);

  // ElevenLabs vocal synthesis state fields
  const [elevenLabsModel, setElevenLabsModel] = useState('Eleven Flash v2.5');
  const [stabilityParam, setStabilityParam] = useState(0.5);
  const [similarityParam, setSimilarityParam] = useState(0.75);
  const [contextContinuityActive, setContextContinuityActive] = useState(true);

  // Rehearsal timer fields
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  // Generation status
  const [isGenerating, setIsGenerating] = useState(false);
  const [parsedBlocks, setParsedBlocks] = useState<Record<string, string> | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // MoneyPrinter Phase 3 states (Review board)
  const [isGeneratingReview, setIsGeneratingReview] = useState(false);
  const [isReviewBoardVisible, setIsReviewBoardVisible] = useState(false);
  const [reviewScenes, setReviewScenes] = useState<StoryScene[]>([]);

  // MoneyPrinter Phase 4 states (Compositing render)
  const [isRenderJobActive, setIsRenderJobActive] = useState(false);
  const [renderStatusText, setRenderStatusText] = useState('Initializing Build...');
  const [renderProgressPercent, setRenderProgressPercent] = useState(0);
  const [completedRenderUrl, setCompletedRenderUrl] = useState<string | null>(null);

  // YouTube publishing states
  const [isUploadingToYouTube, setIsUploadingToYouTube] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [uploadProgressPercent, setUploadProgressPercent] = useState(0);

  // Timer effect
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    if (isTimerActive) {
      timer = setInterval(() => {
        setSecondsElapsed(prev => prev + 1);
      }, 1000);
    } else {
      setSecondsElapsed(0);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isTimerActive]);

  // Cloud Review Story scenes generator
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (isGeneratingReview) {
      timer = setTimeout(() => {
        setReviewScenes([
          {
            sceneId: 1,
            narration: "Artificial intelligence isn't coming... it's already here, running our power grids and markets.",
            keywords: "future city lights, ai neural network",
            thumbnailUrl: "https://picsum.photos/seed/ai1/300/200"
          },
          {
            sceneId: 2,
            narration: "But what happens when these systems hit a critical threshold of autonomy?",
            keywords: "cyberpunk dark, server farm",
            thumbnailUrl: "https://picsum.photos/seed/ai2/300/200"
          },
          {
            sceneId: 3,
            narration: "Some call it the singularity. Others call it an extinction-level threat.",
            keywords: "dystopian skyline, ominous clouds",
            thumbnailUrl: "https://picsum.photos/seed/ai3/300/200"
          }
        ]);
        setIsReviewBoardVisible(true);
        setIsGeneratingReview(false);
      }, 2500);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isGeneratingReview]);

  // Programmatic cloud rendering simulator
  useEffect(() => {
    let progressTimer: ReturnType<typeof setTimeout> | undefined;
    if (isRenderJobActive) {
      setRenderStatusText('Synthesizing Audio via ElevenLabs API...');
      setRenderProgressPercent(15);

      progressTimer = setTimeout(() => {
        setRenderStatusText('Generating Whisper Transcriptions...');
        setRenderProgressPercent(35);

        progressTimer = setTimeout(() => {
          setRenderStatusText('Compositing B-roll & Burning ImageMagick Subtitles...');
          setRenderProgressPercent(50);

          let current = 50;
          const interval = setInterval(() => {
            current += 10;
            if (current >= 100) {
              clearInterval(interval);
              setRenderStatusText('1080p MP4 Ready!');
              setRenderProgressPercent(100);
              setCompletedRenderUrl('https://storage.googleapis.com/serenity-storage/renders/final_output.mp4');
              setIsRenderJobActive(false);
            } else {
              setRenderProgressPercent(current);
            }
          }, 1000);

        }, 2000);

      }, 2000);
    }
    return () => {
      if (progressTimer) clearTimeout(progressTimer);
    };
  }, [isRenderJobActive]);

  // YouTube uploading simulation with exponential retry
  useEffect(() => {
    if (!isUploadingToYouTube) return;

    let cancel = false;
    const runUpload = async () => {
      setUploadStatusText('Authenticating OAuth & Initiating Resumable Session...');
      await new Promise(r => setTimeout(r, 1500));
      if (cancel) return;

      const totalChunks = 5;
      for (let i = 0; i < totalChunks; i++) {
        setUploadStatusText(`Uploading Chunk ${i + 1}/${totalChunks} (Exponential Backoff Armed)...`);
        await new Promise(r => setTimeout(r, 1200));
        if (cancel) return;

        // Occasional network retry trigger
        if (i === 2) {
          setUploadStatusText(`Network disruption on Chunk 3. Backing off 2s...`);
          await new Promise(r => setTimeout(r, 2000));
          if (cancel) return;

          setUploadStatusText(`Resuming chunk 3 upload...`);
          await new Promise(r => setTimeout(r, 1000));
          if (cancel) return;
        }

        setUploadProgressPercent(((i + 1) / totalChunks) * 100);
      }

      setUploadStatusText('Status: YouTube Partner API Published & Indexed!');
      await new Promise(r => setTimeout(r, 2000));
      if (cancel) return;

      setIsUploadingToYouTube(false);
      alert('Video Published on YouTube successfully!');
    };

    void runUpload();
    return () => {
      cancel = true;
    };
  }, [isUploadingToYouTube]);

  const handleGenerateScript = async () => {
    if (!topicOfVideo.trim()) {
      alert('Please enter a video topic!');
      return;
    }

    const apiKey = getStoredApiKey();
    if (!apiKey) {
      setApiError('Gemini API key is missing. Please save your API Key in the Planner tab first.');
      return;
    }

    setIsGenerating(true);
    setApiError(null);
    setParsedBlocks(null);

    const prompt = `
Write a complete, highly optimized and engaging script for a ${runningTime} minute YouTube Video.
Topic: "${topicOfVideo}" in the "${channelNiche}" niche.
Tone: "${toneSelection}" (expert yet inviting for video automated channels).

You must format your entire response using the following precise tag blocks so the app can parse them perfectly. Do not include any other conversations, text, markdown blocks, prefix statements, or comments.

[TITLES]
(Provide 3 viral, high-CTR clickable title ideas, one per line)

[HOOK]
(Write an attention-grabbing hook for the first 15 seconds)

[BODY]
(Write the detailed, full script body. Be engaging, clear, and informative)

[OUTRO]
(Write a strong closing outro with a clean Call To Action to like, subscribe and comment)

[DESCRIPTION]
(Write a search-engine optimized YouTube video description with structured layout)

[TAGS]
(Provide 10-15 comma-separated high-traffic search terms/tags)

[THUMBNAIL_PROMPT]
(Explain a beautiful, high-click design for the thumbnail and write a detailed generative AI prompt to create it)
    `.trim();

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API returned error code ${response.status}`);
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error('Empty response received from Gemini model.');
      }

      const parsed = parseTagBlocks(rawText);
      setParsedBlocks(parsed);

      // Auto-save script offline to planner database
      const titles = parsed.TITLES ?? '';
      const firstTitle = titles.split('\n')[0]?.replace(/^\d+[\.\-\s]*/, '');
      const primaryTitle = firstTitle && firstTitle.trim() !== '' ? firstTitle : topicOfVideo;

      onAddProject({
        title: primaryTitle,
        niche: channelNiche,
        tone: toneSelection,
        scriptText: parsed.BODY && parsed.BODY.trim() !== '' ? parsed.BODY : rawText,
        description: parsed.DESCRIPTION ?? '',
        tags: parsed.TAGS ?? '',
        thumbnailPrompt: parsed.THUMBNAIL_PROMPT ?? '',
        status: 'IDEA',
        scheduledTimeMillis: 0,
      });

    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'An error occurred during script generation.';
      setApiError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEscalateCloudWorker = () => {
    if (!topicOfVideo.trim()) {
      alert('Please enter a video topic!');
      return;
    }
    setIsGeneratingReview(true);
    setIsReviewBoardVisible(false);
  };

  return (
    <div className="space-y-6">
      {/* Configuration parameters card */}
      <div className="bg-nebula-dark-card border border-pulsar-aqua/15 rounded-2xl p-5 space-y-4 shadow-lg">
        <h3 className="text-white font-bold text-base">AI Automation Scriptwriter</h3>
        <p className="text-soft-gray text-xs">
          Select parameters to trigger Gemini text models. It writes video drafts tailored to viral YouTube patterns.
        </p>

        {/* Video Topic input */}
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-white block">Video Topic or Main Idea:</span>
          <input
            type="text"
            placeholder="e.g., Rise of Quantum Computing, Secrets of Warren Buffett"
            value={topicOfVideo}
            onChange={e => setTopicOfVideo(e.target.value)}
            className="w-full bg-space-slate border border-white/5 focus:border-pulsar-aqua outline-none text-white text-sm py-2 px-3 rounded-lg placeholder-soft-gray"
          />
        </div>

        {/* Niche & Tone Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Niches */}
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-white block">Niche Group:</span>
            <div className="space-y-1">
              {['Tech Trends', 'Crypto/Wealth', 'Self Help', 'Historic Lore'].map(niche => (
                <label key={niche} className="flex items-center gap-2 text-xs text-white cursor-pointer select-none">
                  <input
                    type="radio"
                    checked={channelNiche === niche}
                    onChange={() => setChannelNiche(niche)}
                    className="accent-pulsar-aqua"
                  />
                  {niche}
                </label>
              ))}
            </div>
          </div>

          {/* Tone */}
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-white block">Narrative Tone:</span>
            <div className="space-y-1">
              {['Humorous', 'Energetic', 'Explanatory', 'Dramatic'].map(tone => (
                <label key={tone} className="flex items-center gap-2 text-xs text-white cursor-pointer select-none">
                  <input
                    type="radio"
                    checked={toneSelection === tone}
                    onChange={() => setToneSelection(tone)}
                    className="accent-pulsar-aqua"
                  />
                  {tone}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Duration slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-bold text-white">
            <span>Duration:</span>
            <span>{runningTime} min (estimated words)</span>
          </div>
          <input
            type="range"
            min="1"
            max="15"
            value={runningTime}
            onChange={e => setRunningTime(parseInt(e.target.value))}
            className="w-full h-1 bg-space-slate accent-pulsar-aqua rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* ElevenLabs TTS config block */}
        <div className="bg-space-slate border border-white/5 rounded-xl p-3 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-starlet-pink font-bold text-[10px] tracking-wider uppercase">ElevenLabs TTS Params</span>
            <span className="bg-emerald-cash/10 text-emerald-cash text-[8px] font-bold px-1.5 py-0.5 rounded">Latency &lt;50ms</span>
          </div>

          <div className="space-y-1.5">
            <span className="text-[9px] text-soft-gray block">Synthesis Model (Optimized):</span>
            <div className="flex gap-1.5">
              {['Eleven Flash v2.5', 'Multilingual v2', 'Eleven v3'].map(model => (
                <button
                  key={model}
                  onClick={() => setElevenLabsModel(model)}
                  className={`text-[9px] font-bold py-1 px-2 rounded transition-colors ${
                    elevenLabsModel === model ? 'bg-pulsar-aqua text-black' : 'bg-nebula-dark-card text-white hover:bg-white/5'
                  }`}
                >
                  {model}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-[9px] text-soft-gray">
            <div className="space-y-1">
              <span>Stability ({stabilityParam.toFixed(2)})</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={stabilityParam}
                onChange={e => setStabilityParam(parseFloat(e.target.value))}
                className="w-full h-1 bg-nebula-dark-card accent-pulsar-aqua rounded appearance-none"
              />
            </div>
            <div className="space-y-1">
              <span>Clarity/Similarity ({similarityParam.toFixed(2)})</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={similarityParam}
                onChange={e => setSimilarityParam(parseFloat(e.target.value))}
                className="w-full h-1 bg-nebula-dark-card accent-pulsar-aqua rounded appearance-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-[9px] text-soft-gray pt-1">
            <span>Prosody Context Continuity</span>
            <input
              type="checkbox"
              checked={contextContinuityActive}
              onChange={e => setContextContinuityActive(e.target.checked)}
              className="accent-pulsar-aqua"
            />
          </div>

          <div className="text-[8px] text-soft-gray italic font-mono pt-1">
            Projected Synthesis Budget: ${(runningTime * (elevenLabsModel.includes('Flash') ? 0.06 : 0.12)).toFixed(2)}
          </div>
        </div>

        {/* Dispatch Action buttons */}
        <div className="space-y-2 pt-2">
          <button
            onClick={() => { handleEscalateCloudWorker(); }}
            className="w-full bg-emerald-cash text-black font-bold py-2 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity text-sm"
          >
            <Cpu size={16} />
            Escalate to Cloud Worker (MoneyPrinter Turbo)
          </button>
          <button
            onClick={() => { void handleGenerateScript(); }}
            disabled={isGenerating}
            className="w-full bg-pulsar-aqua text-black font-bold py-2 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity text-sm"
          >
            <Sparkles size={16} />
            {isGenerating ? 'Drafting script...' : 'Draft Offline Video Script'}
          </button>
        </div>
      </div>

      {/* Cloud Generation Indicator */}
      {isGenerating && (
        <div className="p-5 bg-nebula-dark-card border border-pulsar-aqua/20 rounded-2xl flex flex-col items-center justify-center gap-2 text-soft-gray text-xs">
          <div className="w-6 h-6 border-2 border-pulsar-aqua border-t-transparent rounded-full animate-spin"></div>
          Gemini is developing hook, narrative structure and tagging lists...
        </div>
      )}

      {apiError && (
        <div className="p-4 bg-red-950/30 border border-red-500/20 text-red-400 text-xs rounded-lg flex gap-2">
          <ShieldAlert size={16} className="flex-shrink-0" />
          <div>
            <p className="font-semibold">Generation Failed</p>
            <p>{apiError}</p>
          </div>
        </div>
      )}

      {isGeneratingReview && (
        <div className="p-5 bg-nebula-dark-card border border-emerald-cash/30 rounded-2xl flex flex-col items-center justify-center gap-2 text-emerald-cash text-xs">
          <div className="w-6 h-6 border-2 border-emerald-cash border-t-transparent rounded-full animate-spin"></div>
          Cloud Worker: Orchestrating LLM scene generation & Pexels HD B-Roll API fetching...
        </div>
      )}

      {/* RENDER & PUBLISHING BOARD */}
      {(isRenderJobActive || completedRenderUrl) && (
        <div className="bg-nebula-dark-card border border-pulsar-aqua/30 rounded-2xl p-5 space-y-4 shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-pulsar-aqua font-bold text-sm">RENDER & PUBLISHING ENGINE</h4>
              <p className="text-[10px] text-soft-gray">Phase 4 - Cloud Compositing & Delivery</p>
            </div>
            {completedRenderUrl && !isUploadingToYouTube && (
              <button onClick={() => setCompletedRenderUrl(null)} className="text-soft-gray hover:text-white">✕</button>
            )}
          </div>

          {isRenderJobActive ? (
            <div className="flex flex-col items-center py-4 text-center">
              <div className="w-12 h-12 relative flex items-center justify-center mb-3">
                <div className="absolute inset-0 border-2 border-pulsar-aqua/20 rounded-full"></div>
                <div className="absolute inset-0 border-2 border-pulsar-aqua border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[10px] font-bold text-pulsar-aqua">{renderProgressPercent}%</span>
              </div>
              <p className="text-pulsar-aqua font-bold text-xs">{renderStatusText}</p>
              <p className="text-soft-gray text-[9px] mt-1">Polling FFmpeg Python Worker...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-emerald-cash/10 border border-emerald-cash/30 rounded-lg p-3 flex gap-3 items-center">
                <CheckCircle2 size={24} className="text-emerald-cash flex-shrink-0" />
                <div className="overflow-hidden">
                  <p className="text-emerald-cash font-bold text-xs">MP4 File Compiled Successfully</p>
                  <p className="text-soft-gray text-[8px] truncate">{completedRenderUrl}</p>
                </div>
              </div>

              <button
                onClick={() => alert('Download triggered successfully.')}
                className="w-full bg-space-slate border border-pulsar-aqua text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-space-slate/60"
              >
                <Download size={14} className="text-pulsar-aqua" />
                Download Render to Device Gallery
              </button>

              {isUploadingToYouTube ? (
                <div className="space-y-2 py-2">
                  <div className="w-full h-1 bg-space-slate rounded-full overflow-hidden">
                    <div className="h-full bg-red-500" style={{ width: `${uploadProgressPercent}%` }}></div>
                  </div>
                  <p className="text-red-500 font-bold text-xs text-center">{uploadStatusText}</p>
                </div>
              ) : (
                <button
                  onClick={() => setIsUploadingToYouTube(true)}
                  className="w-full bg-red-600 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-red-700 transition-colors text-sm"
                >
                  <Youtube size={18} />
                  Publish to YouTube (OAuth 2.0 Upload)
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* SCRIPT & SCENE REVIEW BOARD */}
      {isReviewBoardVisible && reviewScenes.length > 0 && (
        <div className="bg-nebula-dark-card border border-emerald-cash/30 rounded-2xl p-5 space-y-4 shadow-lg">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-emerald-cash font-bold text-sm">SCRIPT & ASSET REVIEW BOARD</h4>
              <p className="text-[10px] text-soft-gray">Phase 3 - MoneyPrinterTurbo Workflow</p>
            </div>
            <button onClick={() => { setIsReviewBoardVisible(false); setReviewScenes([]); }} className="text-soft-gray hover:text-white">✕</button>
          </div>

          <div className="bg-space-slate border border-red-500/30 rounded-lg p-3 flex gap-3 items-center">
            <AlertTriangle size={24} className="text-red-500 flex-shrink-0" />
            <div>
              <p className="text-white font-bold text-xs">YPP AI Slop Compliance</p>
              <p className="text-soft-gray text-[9px]">Please manually tweak the text below to inject your authentic voice. Avoid purely declarative factual regurgitation.</p>
            </div>
          </div>

          {/* Scenes maps */}
          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {reviewScenes.map((scene, idx) => (
              <div key={scene.sceneId} className="bg-space-slate border border-white/5 rounded-xl p-3 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-white font-bold text-xs">Scene {scene.sceneId}</span>
                  <span className="bg-white/5 text-emerald-cash text-[8px] font-bold px-1.5 py-0.5 rounded">{scene.keywords}</span>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-20 h-20 bg-black rounded-lg overflow-hidden flex-shrink-0 relative">
                    <img src={scene.thumbnailUrl} alt="B-roll preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                      <Play size={20} className="text-white/80" />
                    </div>
                  </div>
                  <textarea
                    value={scene.narration}
                    onChange={e => {
                      const copy = [...reviewScenes];
                      copy[idx].narration = e.target.value;
                      setReviewScenes(copy);
                    }}
                    className="flex-1 bg-transparent border border-pulsar-aqua/20 focus:border-emerald-cash outline-none rounded p-1.5 text-[10px] text-white h-20 resize-none"
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              setIsReviewBoardVisible(false);
              setIsRenderJobActive(true);
              setCompletedRenderUrl(null);
            }}
            className="w-full bg-emerald-cash text-black font-bold py-2 rounded-lg text-sm"
          >
            Approve & Escalate to Render
          </button>
        </div>
      )}

      {/* Script Generation Offline Result displaying parsed tag blocks */}
      {parsedBlocks && (
        <div className="bg-nebula-dark-card border border-pulsar-aqua/20 rounded-2xl p-5 space-y-4 shadow-lg">
          <div className="flex justify-between items-center">
            <span className="text-pulsar-aqua font-bold text-sm">Automated Output Success</span>
            <button onClick={() => setParsedBlocks(null)} className="text-soft-gray hover:text-white">✕</button>
          </div>

          {/* Rehearsal tool */}
          <div className="bg-space-slate rounded-xl p-3 flex items-center gap-3">
            <button
              onClick={() => setIsTimerActive(!isTimerActive)}
              className={`p-2 rounded-full text-white ${isTimerActive ? 'bg-red-500' : 'bg-white/5 hover:bg-white/10'}`}
            >
              {isTimerActive ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <div>
              <p className="text-pulsar-aqua font-bold text-[10px] uppercase">Teleprompter Audio Rehearsal</p>
              <p className="text-white text-[10px]">
                {isTimerActive ? `Timer: ${secondsElapsed}s | Practice reading script aloud!` : 'Tap Play to rehearse voiceover timing'}
              </p>
            </div>
          </div>

          <hr className="border-white/5" />

          {/* Parsed blocks displays */}
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
            {parsedBlocks.TITLES && (
              <div className="space-y-1">
                <span className="text-[11px] text-starlet-pink font-bold block">TITLE IDEAS</span>
                <p className="text-xs text-white italic whitespace-pre-wrap leading-relaxed">{parsedBlocks.TITLES}</p>
              </div>
            )}

            {parsedBlocks.HOOK && (
              <div className="space-y-1">
                <span className="text-[11px] text-starlet-pink font-bold block">VIDEO INTRO & HOOK (FIRST 15 SEC)</span>
                <p className="text-xs text-white whitespace-pre-wrap leading-relaxed">{parsedBlocks.HOOK}</p>
              </div>
            )}

            {parsedBlocks.BODY && (
              <div className="space-y-1">
                <span className="text-[11px] text-starlet-pink font-bold block">SCRIPT BODY CONTENT</span>
                <p className="text-xs text-soft-gray whitespace-pre-wrap leading-relaxed">{parsedBlocks.BODY}</p>
              </div>
            )}

            {parsedBlocks.OUTRO && (
              <div className="space-y-1">
                <span className="text-[11px] text-starlet-pink font-bold block">OUTRO & CALL TO ACTION</span>
                <p className="text-xs text-white whitespace-pre-wrap leading-relaxed">{parsedBlocks.OUTRO}</p>
              </div>
            )}

            {/* YPP Warning tag */}
            <div className="bg-space-slate border border-pulsar-aqua/20 rounded-xl p-3 space-y-1.5">
              <span className="text-pulsar-aqua font-bold text-[10px] block">July 2025 YPP AI Slop Safeguards</span>
              <p className="text-[9px] text-soft-gray leading-normal">
                By ticking compile, you authorize that the scripts contain customized structural revisions to ensure monetization compliance.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScriptwriterTab;
