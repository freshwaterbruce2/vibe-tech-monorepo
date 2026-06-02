import React, { useState, useEffect } from 'react';
import { CustomAvatar } from '../types';
import AvatarCanvas from './AvatarCanvas';
import AvaturnCreator from './AvaturnCreator';
import AvaturnViewer from './AvaturnViewer';
import { parseTagBlocks, copyToClipboard, getStoredApiKey } from '../utils';
import { Sparkles, Trash2, Check, Volume2, ShieldAlert } from 'lucide-react';
import { convertGlbToVrm } from '@vibetech/avatar-processor';

interface AvatarLabTabProps {
  avatars: CustomAvatar[];
  onSaveAvatar: (avatar: Omit<CustomAvatar, 'id' | 'createdAt'>) => void;
  onDeleteAvatar: (id: number) => void;
  readyPlayerMeModelId: string;
  onSaveRpmModelId: (url: string) => void;
}

export function AvatarLabTab({
  avatars,
  onSaveAvatar,
  onDeleteAvatar,
  readyPlayerMeModelId,
  onSaveRpmModelId,
}: AvatarLabTabProps) {
  // Custom states for 2D/3D host builder parameters
  const [customName, setCustomName] = useState('Cyber Host');
  const [baseStyle, setBaseStyle] = useState('COSMIC_GAMER'); // TECH_GURU, COSMIC_GAMER, WEALTH_MENTOR, ZEN_COACH
  const [primaryColor, setPrimaryColor] = useState('#00E5FF');
  const [accentColor, setAccentColor] = useState('#FF2A85');
  const [bgColor] = useState('#141929');
  const [frameStyle, setFrameStyle] = useState('NEON_RING'); // CIRCULAR, HEXAGON, SHARP_BOX, NEON_RING
  const [accessory, setAccessory] = useState('NONE'); // NONE, GLASSES, HEADPHONES, MICROPHONE, HALO_RING
  const [aiPrompt, setAiPrompt] = useState('');

  // 3D parameters
  const [is3DActive, setIs3DActive] = useState(false);
  const [showAvaturnEditor, setShowAvaturnEditor] = useState(false);
  const [isExportingVrm, setIsExportingVrm] = useState(false);

  // Viseme mouth simulator states
  const [visemeState, setVisemeState] = useState(0);
  const [isLipSyncActive, setIsLipSyncActive] = useState(false);
  const [micAmplitude, setMicAmplitude] = useState(0);

  // AI Generator fields
  const [nicheInput, setNicheInput] = useState('');
  const [aiStylePref, setAiStylePref] = useState('Tech Guru');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<Record<string, string> | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // Morph values update based on state update
  useEffect(() => {
    setAiPrompt(
      `AI Avatar portrait: ${customName}, style: ${baseStyle}, frames: ${frameStyle}, primary accent: ${primaryColor}, accessory: ${accessory}`
    );
  }, [customName, baseStyle, frameStyle, primaryColor, accessory]);

  // Viseme sound cycles (120fps simulate)
  useEffect(() => {
    if (!isLipSyncActive) {
      setVisemeState(0);
      setMicAmplitude(0);
      return;
    }

    const interval = setInterval(() => {
      // Cycle visemes: 0 to 7
      setVisemeState(Math.floor(Math.random() * 8));
      setMicAmplitude(0.15 + Math.random() * 0.85);
    }, 120);

    return () => clearInterval(interval);
  }, [isLipSyncActive]);

  // Handle AI generator call to Gemini REST endpoint
  const handleGenerateBranding = async () => {
    if (!nicheInput.trim()) {
      alert('Please enter a YouTube niche topic!');
      return;
    }

    const apiKey = getStoredApiKey();
    if (!apiKey) {
      setApiError('Gemini API key is missing. Please save your API Key in the Planner tab first.');
      return;
    }

    setIsAiGenerating(true);
    setApiError(null);
    setAiResult(null);

    const prompt = `
Write an engaging and creative AI Avatar design proposal for a YouTube Channel.
Topic: "${nicheInput}"
Preferred Theme Style: "${aiStylePref}"
Mood Tone: "Energetic"

You must format your entire response using the following tag blocks exactly, and nothing else:

[AVATAR_NAME]
(Write a cool, viral 1-2 word name for this host)

[VISUAL_THEME]
(Describe visual features, colors, hair, fashion, expressions)

[GENERATIVE_AI_PROMPT]
(Write a detailed, photographic style prompt for Midjourney/DALL-E 3)

[CHANNEL_BRANDING]
(Suggest branding guidelines, thumbnail elements, and banner details matching this host)
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
      setAiResult(parsed);

      // Auto-populate generated name if present
      if (parsed.AVATAR_NAME) {
        setCustomName(parsed.AVATAR_NAME);
      }
    } catch (err: unknown) {
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during Gemini API generation.';
      setApiError(errorMessage);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleSavePreset = () => {
    onSaveAvatar({
      name: customName,
      baseStyle,
      primaryColor,
      accentColor,
      bgColor,
      frameStyle,
      accessory,
      aiPrompt,
    });
    alert('Visual preset saved successfully!');
  };

  const handleExportVrm = async () => {
    if (!readyPlayerMeModelId) {
      alert('No 3D Model URL available to export.');
      return;
    }

    setIsExportingVrm(true);
    try {
      let url = readyPlayerMeModelId;
      if (url === 'Astronaut') {
        url = 'https://modelviewer.dev/shared-assets/models/Astronaut.glb';
      }

      console.log('[AvatarLabTab] Fetching GLB for VRM conversion:', url);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch model from ${url} (status: ${response.status})`);
      }

      const glbBuffer = new Uint8Array(await response.arrayBuffer());
      
      console.log('[AvatarLabTab] Compiling GLB to VRM...');
      const vrmBuffer = convertGlbToVrm(glbBuffer, {
        title: customName,
        version: '1.0.0',
        authors: [customName + ' Creator']
      });

      // Create download link
      const blob = new Blob([vrmBuffer], { type: 'application/octet-stream' });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${customName.replace(/\s+/g, '_')}.vrm`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      alert('VRM Avatar compiled and downloaded successfully!');
    } catch (err) {
      console.error('[AvatarLabTab] VRM compilation failed:', err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      alert(`VRM Conversion failed: ${msg}`);
    } finally {
      setIsExportingVrm(false);
    }
  };

  const primaryPresets = ['#00E5FF', '#FF3D00', '#FFD700', '#FF00FF', '#00E676'];
  const accentPresets = ['#FF2A85', '#00E5FF', '#B2FF59', '#EA80FC', '#212121'];

  return (
    <div className="space-y-6">
      {/* 1. AI Avatar Designer Card */}
      <div className="bg-nebula-dark-card border border-starlet-pink/15 rounded-2xl p-5 shadow-lg">
        <h3 className="text-white font-bold text-base mb-1">AI Avatar Designer</h3>
        <p className="text-soft-gray text-xs mb-4">
          Input your YouTube niche. Gemini will recommend matching branding schemes, visual traits, and details to configure.
        </p>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Topic e.g., Sci-Fi Storytelling, Bitcoin Investing"
            value={nicheInput}
            onChange={e => setNicheInput(e.target.value)}
            className="w-full bg-space-slate border border-white/5 focus:border-pulsar-aqua outline-none text-white text-sm py-2 px-3 rounded-lg placeholder-soft-gray"
          />

          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-white">Avatar Style preference:</span>
            <div className="flex gap-2 flex-wrap">
              {['Tech Guru', 'Cosmic Gamer', 'Wealth Mentor', 'Zen Coach'].map(pref => (
                <button
                  key={pref}
                  onClick={() => setAiStylePref(pref)}
                  className={`text-[10px] font-bold py-1 px-3 rounded-full border border-none transition-colors ${
                    aiStylePref === pref
                      ? 'bg-starlet-pink text-white'
                      : 'bg-space-slate text-soft-gray hover:bg-white/5'
                  }`}
                >
                  {pref}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => { void handleGenerateBranding(); }}
            disabled={isAiGenerating}
            className="w-full bg-starlet-pink text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <Sparkles size={16} />
            {isAiGenerating ? 'Generating Proposal...' : 'Generate Branding Strategy'}
          </button>
        </div>

        {/* AI Result Area */}
        {isAiGenerating && (
          <div className="mt-4 p-5 bg-space-slate rounded-xl flex flex-col items-center justify-center gap-2 text-soft-gray text-xs">
            <div className="w-6 h-6 border-2 border-starlet-pink border-t-transparent rounded-full animate-spin"></div>
            Developing host profile, palettes & Midjourney prompt parameters...
          </div>
        )}

        {apiError && (
          <div className="mt-4 p-3 bg-red-950/30 border border-red-500/20 text-red-400 text-xs rounded-lg flex gap-2">
            <ShieldAlert size={16} className="flex-shrink-0" />
            <div>
              <p className="font-semibold">Generation Failed</p>
              <p>{apiError}</p>
            </div>
          </div>
        )}

        {aiResult && (
          <div className="mt-4 bg-space-slate border border-pulsar-aqua/20 rounded-xl p-4 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-pulsar-aqua font-bold text-xs uppercase tracking-wider">Proposed Host Identity</span>
              <button onClick={() => setAiResult(null)} className="text-soft-gray text-xs hover:text-white">✕</button>
            </div>
            
            <div>
              <h4 className="text-white font-bold text-sm">Host Name Suggestion: {aiResult.AVATAR_NAME}</h4>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-starlet-pink font-bold">Visual Theme Description</span>
              <p className="text-[11px] text-soft-gray leading-relaxed">{aiResult.VISUAL_THEME}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-starlet-pink font-bold">Station Branding Guidelines</span>
              <p className="text-[11px] text-soft-gray leading-relaxed">{aiResult.CHANNEL_BRANDING}</p>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] text-pulsar-aqua font-bold">Generative Prompt (Tap to Copy)</span>
              <div
                onClick={() => {
                  void copyToClipboard(aiResult.GENERATIVE_AI_PROMPT, 'Midjourney Prompt');
                  alert('Copied Midjourney Prompt!');
                }}
                className="bg-black/30 border border-white/5 rounded-lg p-2.5 font-mono text-[10px] text-soft-gray hover:text-white cursor-pointer hover:bg-black/50 transition-all select-all"
              >
                {aiResult.GENERATIVE_AI_PROMPT}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Interactive Host Builder UI */}
      <div className="space-y-3">
        <h3 className="text-pulsar-aqua text-xs font-bold tracking-widest uppercase px-1">
          Interactive Vector Host Builder
        </h3>

        <div className="flex flex-col md:flex-row gap-5 items-stretch">
          {/* Avatar Canvas Card */}
          <div className="bg-nebula-dark-card border border-white/5 rounded-2xl p-4 flex-shrink-0 flex items-center justify-center relative w-full md:w-48 h-48 md:h-auto shadow-md">
            {is3DActive ? (
              <AvaturnViewer
                modelId={readyPlayerMeModelId}
                visemeValue={visemeState}
                micAmplitude={micAmplitude}
              />
            ) : (
              <AvatarCanvas
                baseStyle={baseStyle}
                primaryColorHex={primaryColor}
                accentColorHex={accentColor}
                bgColorHex={bgColor}
                frameStyle={frameStyle}
                accessoryType={accessory}
                visemeValue={visemeState}
                className="w-full h-full max-w-[150px]"
              />
            )}

            {/* Editor launcher */}
            {is3DActive && (
              <button
                onClick={() => setShowAvaturnEditor(true)}
                className="absolute bottom-2 left-2 bg-starlet-pink hover:bg-starlet-pink/90 text-white font-bold text-[8px] py-1 px-2 rounded tracking-wider shadow"
              >
                EDIT 3D
              </button>
            )}

            {/* 2D/3D selector badge */}
            <button
              onClick={() => setIs3DActive(!is3DActive)}
              className={`absolute bottom-2 right-2 font-bold text-[8px] py-1 px-2 rounded tracking-wider shadow transition-colors ${
                is3DActive ? 'bg-starlet-pink text-white' : 'bg-space-slate text-soft-gray border border-white/5'
              }`}
            >
              {is3DActive ? '3D ACTIVE' : '2D ACTIVE'}
            </button>
          </div>

          {/* Builder Controls Card */}
          <div className="flex-1 bg-nebula-dark-card border border-white/5 rounded-2xl p-5 space-y-4">
            {/* Hostname Name */}
            <div className="space-y-1">
              <span className="text-[11px] text-soft-gray block">Host Identity Name:</span>
              <input
                type="text"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                className="w-full bg-space-slate border border-white/5 focus:border-pulsar-aqua outline-none text-white text-sm py-1.5 px-3 rounded-lg"
              />
            </div>

            {/* Base Style selector */}
            <div className="space-y-1">
              <span className="text-[11px] text-soft-gray block">Base style profile:</span>
              <div className="flex gap-1.5 flex-wrap">
                {[
                  { key: 'TECH_GURU', label: 'Tech Guru' },
                  { key: 'COSMIC_GAMER', label: 'Cosmic Gamer' },
                  { key: 'WEALTH_MENTOR', label: 'Wealth Mentor' },
                  { key: 'ZEN_COACH', label: 'Zen Coach' },
                ].map(item => (
                  <button
                    key={item.key}
                    onClick={() => setBaseStyle(item.key)}
                    className={`text-[9px] font-bold py-1 px-2 rounded border border-none transition-all ${
                      baseStyle === item.key
                        ? 'bg-pulsar-aqua text-black'
                        : 'bg-space-slate text-soft-gray hover:bg-white/5'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Frame boundary shape */}
            <div className="space-y-1">
              <span className="text-[11px] text-soft-gray block">Frame Boundary shape:</span>
              <div className="flex gap-1.5 flex-wrap">
                {['NEON_RING', 'HEXAGON', 'CIRCULAR', 'SHARP_BOX'].map(shape => (
                  <button
                    key={shape}
                    onClick={() => setFrameStyle(shape)}
                    className={`text-[9px] font-bold py-1 px-2 rounded border border-none transition-all ${
                      frameStyle === shape
                        ? 'bg-pulsar-aqua text-black'
                        : 'bg-space-slate text-soft-gray hover:bg-white/5'
                    }`}
                  >
                    {shape.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Colors & Accessory Builder Options */}
      <div className="bg-nebula-dark-card border border-white/5 rounded-2xl p-5 space-y-5">
        {/* Accessories */}
        <div className="space-y-1.5">
          <span className="text-white font-bold text-xs">Avatar Accessory Options</span>
          <div className="grid grid-cols-5 gap-1.5">
            {['NONE', 'GLASSES', 'HEADPHONES', 'MICROPHONE', 'HALO'].map(acc => (
              <button
                key={acc}
                onClick={() => setAccessory(acc)}
                className={`text-[9px] font-bold py-1 px-1 text-center rounded transition-all ${
                  accessory === acc ? 'bg-starlet-pink text-white' : 'bg-space-slate text-soft-gray hover:bg-white/5'
                }`}
              >
                {acc}
              </button>
            ))}
          </div>
        </div>

        {/* Digital paint palettes */}
        <div className="space-y-3">
          <span className="text-white font-bold text-xs block">Digital Paint Palettes</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <span className="text-[10px] text-soft-gray block">Primary Color Theme</span>
              <div className="flex gap-2">
                {primaryPresets.map(preset => (
                  <button
                    key={preset}
                    onClick={() => setPrimaryColor(preset)}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${
                      primaryColor === preset ? 'border-white scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: preset }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] text-soft-gray block">Secondary Highlight Color</span>
              <div className="flex gap-2">
                {accentPresets.map(preset => (
                  <button
                    key={preset}
                    onClick={() => setAccentColor(preset)}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${
                      accentColor === preset ? 'border-white scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: preset }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => { handleSavePreset(); }}
          className="w-full bg-pulsar-aqua text-black font-bold py-2 rounded-lg flex items-center justify-center gap-2 hover:opacity-95 transition-opacity"
        >
          <Check size={16} />
          Save Host Visual Preset
        </button>

        {is3DActive && (
          <button
            onClick={() => { void handleExportVrm(); }}
            disabled={isExportingVrm}
            className="w-full bg-gradient-to-r from-pulsar-aqua to-starlet-pink text-black font-bold py-2 rounded-lg flex items-center justify-center gap-2 hover:opacity-95 disabled:opacity-50 transition-opacity mt-2"
          >
            {isExportingVrm ? (
              <>
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                Compiling VTuber VRM...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Export 3D Host as VRM (VTuber Rig)
              </>
            )}
          </button>
        )}
      </div>

      {/* 3. Viseme lip sync simulation card */}
      <div className="bg-nebula-dark-card border border-white/5 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="text-white font-bold text-sm">Oral Viseme Sync Studio</h4>
            <p className="text-[10px] text-soft-gray">Simulate sound phonemes matching visual mouth shapes</p>
          </div>
          <button
            onClick={() => setIsLipSyncActive(!isLipSyncActive)}
            className={`flex items-center gap-1.5 font-bold text-[10px] py-1 px-3 rounded transition-colors ${
              isLipSyncActive ? 'bg-red-500 text-white animate-pulse' : 'bg-space-slate text-soft-gray'
            }`}
          >
            <Volume2 size={12} />
            {isLipSyncActive ? 'SYNC ACTIVE' : 'LIP SYNC STANDBY'}
          </button>
        </div>

        <div className="flex items-center gap-3 bg-space-slate p-3 rounded-lg border border-white/5">
          <div className="w-3 h-3 rounded-full bg-pulsar-aqua flex-shrink-0 animate-ping" style={{ animationDuration: '1.2s' }}></div>
          <div className="text-[11px] text-soft-gray flex-1 leading-normal">
            {isLipSyncActive
              ? `Cycles Viseme Frame: ${visemeState} | Peak Mic Amplitude: ${(micAmplitude * 100).toFixed(0)}%`
              : 'Standby mode. Enable Lip Sync to practice verbal mouth-shape matching.'}
          </div>
        </div>

        {/* Visemes slider displays */}
        <div className="grid grid-cols-8 gap-1.5 text-center">
          {['Neut', 'A', 'M', 'O', 'T', 'E', 'W', 'F'].map((name, i) => (
            <div
              key={name}
              className={`p-1.5 rounded transition-all ${
                visemeState === i && isLipSyncActive ? 'bg-pulsar-aqua text-black font-bold' : 'bg-space-slate text-soft-gray text-[9px]'
              }`}
            >
              <div className="text-[9px] mb-0.5 truncate">{name}</div>
              <div className="text-[8px] opacity-75">v{i}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Saved Host Gallery */}
      {avatars.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-pulsar-aqua text-xs font-bold tracking-widest uppercase px-1">
            Saved Host Gallery
          </h3>
          <div className="space-y-2">
            {avatars.map(avatar => (
              <div
                key={avatar.id}
                className="bg-nebula-dark-card border border-white/5 rounded-xl p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-space-slate border border-white/10 flex-shrink-0">
                    <AvatarCanvas
                      baseStyle={avatar.baseStyle}
                      primaryColorHex={avatar.primaryColor}
                      accentColorHex={avatar.accentColor}
                      bgColorHex={avatar.bgColor}
                      frameStyle={avatar.frameStyle}
                      accessoryType={avatar.accessory}
                    />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm">{avatar.name}</h4>
                    <p className="text-[10px] text-soft-gray">
                      Style: {avatar.baseStyle.replace('_', ' ')} | Frame: {avatar.frameStyle}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onDeleteAvatar(avatar.id)}
                  className="text-red-400 hover:text-red-300 p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Avaturn Creator Dialog Overlay */}
      {showAvaturnEditor && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-0 md:p-10">
          <div className="w-full h-full max-w-5xl bg-space-slate md:rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <AvaturnCreator
              onAvatarCreated={url => {
                onSaveRpmModelId(url);
                setShowAvaturnEditor(false);
                alert('3D Avatar loaded and configured successfully!');
              }}
              onClose={() => setShowAvaturnEditor(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AvatarLabTab;
