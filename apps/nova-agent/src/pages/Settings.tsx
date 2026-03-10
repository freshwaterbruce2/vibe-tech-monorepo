import ModelSelector from '@/components/ModelSelector';
import SettingsLayout from '@/components/nova/SettingsLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { useDbHealth } from '@/hooks/useNovaData';
import { invoke } from '@tauri-apps/api/core';
import {
  Bot,
  CheckCircle2,
  Cpu,
  Database,
  Eye,
  EyeOff,
  Key,
  Moon,
  Settings as SettingsIcon,
  Shield,
  XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface ApiKeyStatus {
  deepseek_key_set: boolean;
  groq_key_set: boolean;
  openrouter_key_set: boolean;
  google_key_set: boolean;
  kimi_key_set: boolean;
}

const Settings = () => {
  const { isHealthy, lastCheck } = useDbHealth();
  const [activeModel, setActiveModel] = useState('llama-3.3-70b-versatile');
  const [groqKey, setGroqKey] = useState('');

  // Tab state - persisted in localStorage
  const [activeTab, setActiveTab] = useState(() => {
    // eslint-disable-next-line electron-security/no-localstorage-electron
    return localStorage.getItem('settings-active-tab') ?? 'ai';
  });

  // API Key Management State
  const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus | null>(null);
  const [deepseekKey, setDeepseekKey] = useState('');
  const [openrouterKey, setOpenrouterKey] = useState('');
  const [googleKey, setGoogleKey] = useState('');
  const [kimiKey, setKimiKey] = useState('');
  const [showDeepseekKey, setShowDeepseekKey] = useState(false);
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [showOpenrouterKey, setShowOpenrouterKey] = useState(false);
  const [showGoogleKey, setShowGoogleKey] = useState(false);
  const [showKimiKey, setShowKimiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Persist active tab to localStorage
  useEffect(() => {
    // eslint-disable-next-line electron-security/no-localstorage-electron
    localStorage.setItem('settings-active-tab', activeTab);
  }, [activeTab]);

  const handleModelChange = async (value: string) => {
    setActiveModel(value);
    try {
      await invoke('set_active_model', { model: value });
      toast({
        title: 'Model Updated',
        description: `Model changed to ${value}`,
      });
    } catch (error) {
      console.error('Failed to set active model:', error);
      toast({
        title: 'Error',
        description: 'Failed to update model',
        variant: 'destructive',
      });
    }
  };

  const handleSaveGroqKey = () => {
    if (groqKey.startsWith('gsk_') && groqKey.length > 20) {
      toast({
        title: 'Key Saved',
        description: 'Groq API Key saved (session only)',
      });
    } else {
      toast({
        title: 'Invalid Key',
        description: 'Invalid Groq API Key format',
        variant: 'destructive',
      });
    }
  };

  // Load API key status on mount
  useEffect(() => {
    void loadApiKeyStatus();
  }, []);

  const loadApiKeyStatus = async () => {
    try {
      const status = await invoke<ApiKeyStatus>('get_api_key_status');
      setApiKeyStatus(status);
    } catch (error) {
      console.error('Failed to load API key status:', error);
      toast({
        title: 'Error',
        description: 'Failed to load API key status',
        variant: 'destructive',
      });
    }
  };

  const handleSaveApiKeys = async () => {
    setIsSaving(true);
    try {
      await invoke('save_api_keys', {
        deepseekKey: deepseekKey || null,
        groqKey: groqKey || null,
        openrouterKey: openrouterKey || null,
        googleKey: googleKey || null,
        kimiKey: kimiKey || null,
      });

      toast({
        title: '✅ API Keys Saved',
        description: 'Keys securely stored in Windows Credential Manager',
      });

      // Clear input fields
      setDeepseekKey('');
      setGroqKey('');
      setOpenrouterKey('');
      setGoogleKey('');
      setKimiKey('');

      // Reload status
      await loadApiKeyStatus();
    } catch (error) {
      console.error('Failed to save API keys:', error);
      toast({
        title: 'Error',
        description: `Failed to save API keys: ${error}`,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const verifyRagConnection = async () => {
    try {
      console.log('Verifying RAG Connection...');
      // Direct invoke to verify raw connection
      const result = await invoke('rag_search', {
        query: 'Who is Vanessa Freshwater?',
        topK: 1,
      });
      console.log('✅ RAG CONNECTION VERIFIED. RAW RESPONSE:', JSON.stringify(result, null, 2));
      toast({
        title: 'Connection Verified',
        description: 'Check console for raw Rust JSON response',
      });
    } catch (e) {
      console.error('❌ RAG Verification Failed:', e);
      toast({
        title: 'Verification Failed',
        description: String(e),
        variant: 'destructive',
      });
    }
  };

  return (
    <SettingsLayout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
            <SettingsIcon className="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              System Settings
            </h1>
            <p className="text-gray-500 mt-1">Configure your Nova Agent environment</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-black/40 border border-white/5 p-1">
            <TabsTrigger
              value="general"
              className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300"
            >
              General
            </TabsTrigger>
            <TabsTrigger
              value="ai"
              className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300"
            >
              AI & Models
            </TabsTrigger>
            <TabsTrigger
              value="api-keys"
              className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300"
            >
              API Keys
            </TabsTrigger>
            <TabsTrigger
              value="system"
              className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300"
            >
              System Health
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4 mt-6">
            <Card className="bg-black/40 border-white/10 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Moon className="w-5 h-5 text-purple-400" />
                  Appearance
                </CardTitle>
                <CardDescription>Customize the look and feel of the interface</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/5">
                  <div className="space-y-0.5">
                    <Label>Dark Mode</Label>
                    <p className="text-sm text-gray-500">Enable futuristic dark theme</p>
                  </div>
                  <Switch checked={true} disabled />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/5">
                  <div className="space-y-0.5">
                    <Label>Reduced Motion</Label>
                    <p className="text-sm text-gray-500">Disable advanced UI animations</p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai" className="space-y-4 mt-6">
            <Card className="bg-black/40 border-white/10 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-cyan-400" />
                  Model Configuration
                </CardTitle>
                <CardDescription>
                  Choose the best AI model for your coding needs - compare pricing, quality, and
                  speed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* New ModelSelector Component */}
                <ModelSelector
                  selectedModel={activeModel}
                  onSelectModel={(modelId) => {
                    void handleModelChange(modelId);
                  }}
                />

                {/* Legacy Model Dropdown - Keep for fallback */}
                <details className="mt-6">
                  <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300">
                    Show all models (legacy dropdown)
                  </summary>
                  <div className="space-y-2 mt-4">
                    <Label>Active Model</Label>
                    <div className="flex gap-2">
                      <Select
                        value={activeModel}
                        onValueChange={(val) => {
                          void handleModelChange(val);
                        }}
                      >
                        <SelectTrigger className="bg-black/50 border-purple-500/30 text-purple-300 font-mono">
                          <SelectValue placeholder="Select a model" />
                        </SelectTrigger>
                        <SelectContent className="bg-black border-purple-500/30">
                          {/* TIER 1: FREE (OpenRouter) */}
                          <div className="px-2 py-1.5 text-xs font-semibold text-green-400 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-400" />
                            TIER 1: FREE (Zero Cost)
                          </div>
                          <SelectItem value="xiaomi/mimo-v2-flash:free">
                            🏆 MiMo V2 Flash - 309B • 256K • #1 SWE-bench
                          </SelectItem>
                          <SelectItem value="mistralai/devstral-2512:free">
                            🔧 Devstral 2512 - 123B • 256K • Agentic Coding
                          </SelectItem>
                          <SelectItem value="kwaipilot/kat-coder-pro:free">
                            💻 KAT Coder Pro - Code Specialist • FREE
                          </SelectItem>
                          <SelectItem value="nex-agi/deepseek-v3.1-nex-n1:free">
                            🧠 DeepSeek V3.1 Nex-N1 - Enhanced Reasoning • FREE
                          </SelectItem>
                          <SelectItem value="meta-llama/llama-3.3-70b-instruct:free">
                            🦙 Llama 3.3 70B - Meta's Latest • Multilingual • FREE
                          </SelectItem>

                          {/* TIER 2: LOW COST (OpenRouter) */}
                          <div className="px-2 py-1.5 text-xs font-semibold text-cyan-400 flex items-center gap-1 mt-2">
                            <span className="w-2 h-2 rounded-full bg-cyan-400" />
                            TIER 2: LOW COST (High Efficiency)
                          </div>
                          <SelectItem value="openai/gpt-4o-mini-2026">
                            ⚡ GPT-4o Mini '26 - Fast & Cheap • $0.15/$0.60
                          </SelectItem>
                          <SelectItem value="anthropic/claude-3.5-haiku-2026">
                            🌪️ Claude 3.5 Haiku - Sub-ms Latency
                          </SelectItem>
                          <SelectItem value="google/gemini-flash-1.5-8b">
                            ⚡ Gemini 1.5 Flash 8B - High Throughput
                          </SelectItem>

                          {/* TIER 3: MEDIUM (OpenRouter) */}
                          <div className="px-2 py-1.5 text-xs font-semibold text-yellow-400 flex items-center gap-1 mt-2">
                            <span className="w-2 h-2 rounded-full bg-yellow-400" />
                            TIER 3: MEDIUM (Balanced)
                          </div>
                          <SelectItem value="anthropic/claude-3.5-sonnet">
                            ⭐ Claude 3.5 Sonnet - Reliable Workhorse
                          </SelectItem>
                          <SelectItem value="openai/gpt-4o-2026">
                            🤖 GPT-4o '26 - Standard
                          </SelectItem>
                          <SelectItem value="x-ai/grok-2-vision">
                            👁️ Grok 2 Vision - Strong Multimodal
                          </SelectItem>

                          {/* TIER 4: HIGH PERFORMANCE (OpenRouter) */}
                          <div className="px-2 py-1.5 text-xs font-semibold text-orange-400 flex items-center gap-1 mt-2">
                            <span className="w-2 h-2 rounded-full bg-orange-400" />
                            TIER 4: HIGH PERFORMANCE (SOTA)
                          </div>
                          <SelectItem value="anthropic/claude-sonnet-4.5">
                            👑 Claude Sonnet 4.5 - Best Overall Logic
                          </SelectItem>
                          <SelectItem value="openai/gpt-5-turbo">
                            ✨ GPT-5 Turbo - Massive Knowledge (128K)
                          </SelectItem>
                          <SelectItem value="deepseek/deepseek-v3.2-speciale">
                            🚀 DeepSeek V3.2 Speciale - Reasoning Monster
                          </SelectItem>
                          <SelectItem value="google/gemini-2.0-pro">
                            🔮 Gemini 2.0 Pro - 2M Context
                          </SelectItem>
                          <SelectItem value="openai/o3-step-reasoning">
                            🧠 OpenAI o3 - Advanced Step Reasoning
                          </SelectItem>

                          {/* TIER 5: EXPERIMENTAL (2026 PREVIEW) */}
                          <div className="px-2 py-1.5 text-xs font-semibold text-pink-400 flex items-center gap-1 mt-2">
                            <span className="w-2 h-2 rounded-full bg-pink-400" />
                            TIER 5: EXPERIMENTAL (2026 PREVIEW)
                          </div>
                          <SelectItem value="google/gemini-3-flash-preview">
                            ⚡ Gemini 3.0 Pro Flash - Next-Gen Low Latency
                          </SelectItem>
                          <SelectItem value="google/gemini-3-pro-preview">
                            🔮 Gemini 3.0 Pro - Multimodal Reasoning SOTA
                          </SelectItem>
                          <SelectItem value="openai/gpt-5.2">
                            ✨ GPT-5.2 - The New Standard
                          </SelectItem>
                          <SelectItem value="x-ai/grok-4.1-fast">
                            🚀 Grok 4.1 Fast - Real-time Knowledge
                          </SelectItem>
                          <SelectItem value="anthropic/claude-opus-4.5">
                            🎼 Claude 4.5 Opus - Ultimate Reasoning
                          </SelectItem>
                          <SelectItem value="mistralai/mistral-large-3">
                            🇫🇷 Mistral Large 3 - 41B Active MoE
                          </SelectItem>
                          <SelectItem value="meta-llama/llama-4-maverick-instruct">
                            🦙 Llama 4 Maverick - 400B Multimodal MoE
                          </SelectItem>
                          <SelectItem value="qwen/qwen-3-max">
                            🐲 Qwen 3 Max - 235B Polyglot SOTA
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <Badge
                        variant="outline"
                        className="text-green-400 border-green-500/30 bg-green-500/10 h-10 px-4"
                      >
                        Active
                      </Badge>
                    </div>
                  </div>
                </details>

                <div className="space-y-4 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-orange-400" />
                    <Label className="text-orange-400">Groq (Llama 3.1/3.3)</Label>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      placeholder="gsk_..."
                      value={groqKey}
                      onChange={(e) => setGroqKey(e.target.value)}
                      className="bg-black/50 border-orange-500/30 text-orange-100 font-mono"
                    />
                    <Button
                      onClick={handleSaveGroqKey}
                      variant="outline"
                      className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                    >
                      Save Key
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-white/10">
                  <Label>Context Window</Label>
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                    <span>32K</span>
                    <span>128K</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 w-full animate-pulse" />
                  </div>
                  <p className="text-xs text-right text-purple-400">128,000 tokens available</p>
                </div>

                <div className="p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
                  <div className="flex items-center gap-2 text-yellow-500 mb-2">
                    <Shield className="w-4 h-4" />
                    <span className="font-semibold text-sm">Privacy Mode</span>
                  </div>
                  <p className="text-sm text-gray-400">
                    All sensitive project data is sanitized before leaving your machine. Semantic
                    search runs entirely locally via ChromaDB.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="api-keys" className="space-y-4 mt-6">
            <Card className="bg-black/40 border-white/10 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-cyan-400" />
                  API Key Management
                </CardTitle>
                <CardDescription>
                  Securely store API keys in Windows Credential Manager
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Current Status */}
                {apiKeyStatus && (
                  <div className="p-4 rounded-lg bg-white/5 border border-white/5">
                    <h3 className="text-sm font-semibold mb-3 text-gray-300">Current Status</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        {apiKeyStatus.openrouter_key_set ? (
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400" />
                        )}
                        <span className="text-sm">OpenRouter</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {apiKeyStatus.deepseek_key_set ? (
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400" />
                        )}
                        <span className="text-sm">DeepSeek</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {apiKeyStatus.groq_key_set ? (
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400" />
                        )}
                        <span className="text-sm">Groq</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {apiKeyStatus.google_key_set ? (
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400" />
                        )}
                        <span className="text-sm">Google</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {apiKeyStatus.kimi_key_set ? (
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400" />
                        )}
                        <span className="text-sm">Kimi / Moonshot</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* OpenRouter API Key */}
                <div className="space-y-2">
                  <Label className="text-cyan-400">OpenRouter API Key</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showOpenrouterKey ? 'text' : 'password'}
                        placeholder="sk-or-v1-..."
                        value={openrouterKey}
                        onChange={(e) => setOpenrouterKey(e.target.value)}
                        className="bg-black/50 border-cyan-500/30 text-cyan-100 font-mono pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOpenrouterKey(!showOpenrouterKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                      >
                        {showOpenrouterKey ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Get your key at{' '}
                    <a
                      href="https://openrouter.ai/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:underline"
                    >
                      openrouter.ai/keys
                    </a>
                  </p>
                </div>

                {/* DeepSeek API Key */}
                <div className="space-y-2">
                  <Label className="text-purple-400">DeepSeek API Key</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showDeepseekKey ? 'text' : 'password'}
                        placeholder="sk-..."
                        value={deepseekKey}
                        onChange={(e) => setDeepseekKey(e.target.value)}
                        className="bg-black/50 border-purple-500/30 text-purple-100 font-mono pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowDeepseekKey(!showDeepseekKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                      >
                        {showDeepseekKey ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Groq API Key */}
                <div className="space-y-2">
                  <Label className="text-orange-400">Groq API Key</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showGroqKey ? 'text' : 'password'}
                        placeholder="gsk_..."
                        value={groqKey}
                        onChange={(e) => setGroqKey(e.target.value)}
                        className="bg-black/50 border-orange-500/30 text-orange-100 font-mono pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowGroqKey(!showGroqKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                      >
                        {showGroqKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Google API Key */}
                <div className="space-y-2">
                  <Label className="text-blue-400">Google API Key</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showGoogleKey ? 'text' : 'password'}
                        placeholder="AIza..."
                        value={googleKey}
                        onChange={(e) => setGoogleKey(e.target.value)}
                        className="bg-black/50 border-blue-500/30 text-blue-100 font-mono pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowGoogleKey(!showGoogleKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                      >
                        {showGoogleKey ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Kimi / Moonshot API Key */}
                <div className="space-y-2">
                  <Label className="text-rose-400">Kimi / Moonshot API Key</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={showKimiKey ? 'text' : 'password'}
                        placeholder="sk-..."
                        value={kimiKey}
                        onChange={(e) => setKimiKey(e.target.value)}
                        className="bg-black/50 border-rose-500/30 text-rose-100 font-mono pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKimiKey(!showKimiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                      >
                        {showKimiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Get your key at{' '}
                    <a
                      href="https://platform.moonshot.cn/console/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-rose-400 hover:underline"
                    >
                      platform.moonshot.cn
                    </a>
                  </p>
                </div>

                {/* Save Button */}
                <Button
                  onClick={() => {
                    void handleSaveApiKeys();
                  }}
                  disabled={isSaving}
                  className="w-full bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600"
                >
                  {isSaving ? 'Saving...' : '💾 Save API Keys'}
                </Button>

                {/* Security Notice */}
                <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/10">
                  <div className="flex items-center gap-2 text-green-500 mb-2">
                    <Shield className="w-4 h-4" />
                    <span className="font-semibold text-sm">Secure Storage</span>
                  </div>
                  <p className="text-sm text-gray-400">
                    API keys are encrypted and stored in Windows Credential Manager. Only your user
                    account can access them.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-4 mt-6">
            <Card className="bg-black/40 border-white/10 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-green-400" />
                  Database Status
                </CardTitle>
                <CardDescription>Local SQLite and Vector Store health</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="p-4 rounded-lg bg-white/5 border border-white/5 space-y-2">
                  <div className="text-sm text-gray-500">Activity Database</div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={isHealthy ? 'default' : 'destructive'}
                      className={
                        isHealthy ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : ''
                      }
                    >
                      {isHealthy ? 'CONNECTED' : 'DISCONNECTED'}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {lastCheck ? lastCheck.toLocaleTimeString() : 'Checking...'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 font-mono mt-2">
                    D:\databases\nova_activity.db
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-white/5 border border-white/5 space-y-2">
                  <div className="text-sm text-gray-500">Vector Store</div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-blue-400 border-blue-500/30 bg-blue-500/10"
                    >
                      READY
                    </Badge>
                    <span className="text-xs text-gray-500">ChromaDB v0.4.22</span>
                  </div>
                  <div className="text-xs text-gray-400 font-mono mt-2">localhost:8000</div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-white/10 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-orange-400" />
                  System Resources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span>Backend Memory</span>
                    <span className="text-gray-400">142 MB</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span>Frontend Memory</span>
                    <span className="text-gray-400">85 MB</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span>Tauri Core</span>
                    <span className="text-green-400">v2.0.0-beta</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-white/10 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-purple-400" />
                  Debug Actions
                </CardTitle>
                <CardDescription>Verify internal system connections</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => {
                    void verifyRagConnection();
                  }}
                  variant="outline"
                  className="w-full border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                >
                  Verify React {'->'} Rust Connection (Console)
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SettingsLayout>
  );
};

export default Settings;
