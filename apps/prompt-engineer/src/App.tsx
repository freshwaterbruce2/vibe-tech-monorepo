import { HistoryPanel } from '@/components/HistoryPanel';
import { ModelSelector } from '@/components/ModelSelector';
import { ModeSelector } from '@/components/ModeSelector';
import { PromptEditor } from '@/components/PromptEditor';
import { SettingsPanel } from '@/components/SettingsPanel';
import { ThinkingToggle } from '@/components/ThinkingToggle';
import { Toaster } from '@/components/ui/toaster';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useOptimize } from '@/hooks/useOptimize';
import type { AIModel, HistoryItem, PromptMode } from '@/types';
import { Loader2, Sparkles, Star, Wand2, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ReflectionApp } from '@/modes/reflection/ReflectionApp';

type AppTab = 'prompt' | 'reflect';

type ConnectionStatus = 'checking' | 'connected' | 'disconnected' | 'error';

function App() {
  const [activeTab, setActiveTab] = useLocalStorage<AppTab>('pe-tab', 'prompt');
  const [model, setModel] = useLocalStorage<AIModel>('pe-model', 'claude-sonnet-4-5');
  const [mode, setMode] = useLocalStorage<PromptMode>('pe-mode', 'edit');
  const [extendedThinking, setExtendedThinking] = useLocalStorage('pe-thinking', false);
  const [apiKey, setApiKey] = useLocalStorage('pe-apikey', '');
  const [inputPrompt, setInputPrompt] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('checking');

  const { optimizedPrompt, isOptimizing, error, retryAfter, optimize } = useOptimize();

  // Check connection and sync API key with backend
  const checkConnection = async () => {
    setConnectionStatus('checking');
    try {
      const response = await fetch('/api/health');
      if (response.ok) {
        const data = await response.json();
        setConnectionStatus(data.apiConfigured ? 'connected' : 'disconnected');
      } else {
        setConnectionStatus('error');
      }
    } catch {
      setConnectionStatus('error');
    }
  };

  // Sync API key to backend when it changes
  const handleApiKeyChange = async (newKey: string) => {
    setApiKey(newKey);
  };

  // Sync stored API key to backend and refresh connection status.
  useEffect(() => {
    const syncApiKey = async () => {
      if (apiKey) {
        try {
          await fetch('/api/settings/apikey', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey }),
          });
        } catch (err) {
          console.error('Failed to sync API key:', err);
        }
      }
      await checkConnection();
    };
    void syncApiKey();
  }, [apiKey]);

  // Load history from D:\data\prompt-engineer\history.json on mount
  useEffect(() => {
    fetch('/api/history')
      .then(async (res) => res.json())
      .then((data) => setHistory(data))
      .catch(() => setHistory([]));
  }, []);

  const handleOptimize = async () => {
    if (!inputPrompt.trim()) return;

    const result = await optimize({
      prompt: inputPrompt,
      model,
      mode,
      extendedThinking,
    });

    if (result) {
      // Add to history
      const newItem: HistoryItem = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        model,
        mode,
        inputPrompt,
        outputPrompt: result,
        extendedThinking,
      };
      setHistory((prev) => [newItem, ...prev].slice(0, 50));

      // Save to backend
      void fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      }).catch(console.error);
    }
  };

  const handleHistorySelect = (item: HistoryItem) => {
    setInputPrompt(item.inputPrompt);
    setModel(item.model);
    setMode(item.mode);
    setExtendedThinking(item.extendedThinking);
  };

  return (
    <div className="min-h-screen gradient-mesh relative overflow-hidden flex flex-col">
      {/* Animated grid pattern */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `
                        linear-gradient(rgba(124, 58, 237, 0.5) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(124, 58, 237, 0.5) 1px, transparent 1px)
                    `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Morphing blob backgrounds */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-violet-300 to-purple-400 blob mix-blend-multiply filter blur-3xl opacity-25 animate-float" />
        <div
          className="absolute top-1/3 -left-32 w-80 h-80 bg-gradient-to-br from-cyan-300 to-blue-400 blob mix-blend-multiply filter blur-3xl opacity-25 animate-float-slow"
          style={{ animationDelay: '2s' }}
        />
        <div
          className="absolute -bottom-32 right-1/4 w-72 h-72 bg-gradient-to-br from-pink-300 to-rose-400 blob mix-blend-multiply filter blur-3xl opacity-20 animate-float-fast"
          style={{ animationDelay: '4s' }}
        />
        <div
          className="absolute top-2/3 left-1/3 w-64 h-64 bg-gradient-to-br from-amber-200 to-orange-300 blob mix-blend-multiply filter blur-3xl opacity-15 animate-float"
          style={{ animationDelay: '6s' }}
        />
      </div>

      {/* Floating sparkle particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <Star
            key={i}
            className="absolute text-violet-300/30 animate-float"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              width: `${12 + (i % 3) * 4}px`,
              height: `${12 + (i % 3) * 4}px`,
              animationDelay: `${i * 1.2}s`,
              animationDuration: `${5 + i}s`,
            }}
          />
        ))}
      </div>

      <header className="relative border-b border-white/20 backdrop-blur-xl bg-white/60 px-6 py-5 sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto flex items-center gap-4">
          <div className="relative">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 text-white shadow-xl glow-pulse">
              <Wand2 className="h-7 w-7" />
            </div>
            <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-amber-400 animate-pulse" />
          </div>
          <div>
            <h1 className="text-3xl font-bold gradient-text tracking-tight">Prompt Engineer</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              Transform your prompts with AI-powered optimization
              <span className="inline-flex gap-0.5">
                <Sparkles className="h-3 w-3 text-violet-400" />
                <Sparkles className="h-3 w-3 text-pink-400" />
                <Sparkles className="h-3 w-3 text-cyan-400" />
              </span>
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex items-center gap-1 ml-6 p-1 rounded-xl bg-white/40 border border-white/30">
            <button
              onClick={() => setActiveTab('prompt')}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === 'prompt'
                  ? 'bg-white shadow text-violet-700'
                  : 'text-muted-foreground hover:text-violet-600'
              }`}
            >
              Prompt Engineer
            </button>
            <button
              onClick={() => setActiveTab('reflect')}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activeTab === 'reflect'
                  ? 'bg-white shadow text-violet-700'
                  : 'text-muted-foreground hover:text-violet-600'
              }`}
            >
              ⟳ Reflect
            </button>
          </div>

          <div className="ml-auto hidden md:flex items-center gap-3">
            {/* Connection Status Indicator */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-300 ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : connectionStatus === 'checking'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-red-50 text-red-700 border-red-200'
              }`}
            >
              {connectionStatus === 'connected' ? (
                <>
                  <Wifi className="h-3.5 w-3.5" />
                  <span>Connected</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </>
              ) : connectionStatus === 'checking' ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Checking...</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5" />
                  <span>Not Connected</span>
                </>
              )}
            </div>
            <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-violet-100 to-purple-100 text-violet-700 border border-violet-200/50">
              ✨ Multi-Model AI
            </span>
          </div>
        </div>
      </header>

      {/* Reflection tab — full-height, outside main container */}
      {activeTab === 'reflect' && (
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <ReflectionApp />
        </div>
      )}

      <main className="relative container mx-auto px-6 py-8" style={{ display: activeTab === 'prompt' ? undefined : 'none' }}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main editor panel */}
          <div className="lg:col-span-3 space-y-6">
            {/* Controls row */}
            <div className="flex flex-wrap gap-6 items-start p-6 rounded-2xl glass-card">
              <ModelSelector value={model} onChange={setModel} />
              <ModeSelector value={mode} onChange={setMode} />
              <ThinkingToggle enabled={extendedThinking} onChange={setExtendedThinking} />
            </div>

            {/* Prompt editor */}
            <PromptEditor
              inputPrompt={inputPrompt}
              onInputChange={setInputPrompt}
              optimizedPrompt={optimizedPrompt}
              isOptimizing={isOptimizing}
              error={error}
              retryAfter={retryAfter}
              onOptimize={() => void handleOptimize()}
            />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Settings Panel */}
            <SettingsPanel apiKey={apiKey} onApiKeyChange={(key) => void handleApiKeyChange(key)} />

            {/* History Panel */}
            <HistoryPanel history={history} onSelect={handleHistorySelect} />
          </div>
        </div>
      </main>

      <Toaster />
    </div>
  );
}

export default App;
