import ModelSelector from '@/components/ModelSelector';
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
import { Bot, Key, Shield } from 'lucide-react';

interface AiModelsTabProps {
  activeModel: string;
  groqKey: string;
  onModelChange: (value: string) => void;
  onGroqKeyChange: (value: string) => void;
  onSaveGroqKey: () => void;
}

const AiModelsTab = ({
  activeModel,
  groqKey,
  onModelChange,
  onGroqKeyChange,
  onSaveGroqKey,
}: AiModelsTabProps) => {
  return (
    <div className="space-y-4 mt-6">
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
              void onModelChange(modelId);
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
                    void onModelChange(val);
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
                      MiMo V2 Flash - 309B 256K #1 SWE-bench
                    </SelectItem>
                    <SelectItem value="mistralai/devstral-2512:free">
                      Devstral 2512 - 123B 256K Agentic Coding
                    </SelectItem>
                    <SelectItem value="kwaipilot/kat-coder-pro:free">
                      KAT Coder Pro - Code Specialist FREE
                    </SelectItem>
                    <SelectItem value="nex-agi/deepseek-v3.1-nex-n1:free">
                      DeepSeek V3.1 Nex-N1 - Enhanced Reasoning FREE
                    </SelectItem>
                    <SelectItem value="meta-llama/llama-3.3-70b-instruct:free">
                      Llama 3.3 70B - Meta Latest Multilingual FREE
                    </SelectItem>

                    {/* TIER 2: LOW COST (OpenRouter) */}
                    <div className="px-2 py-1.5 text-xs font-semibold text-cyan-400 flex items-center gap-1 mt-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      TIER 2: LOW COST (High Efficiency)
                    </div>
                    <SelectItem value="openai/gpt-4o-mini-2026">
                      GPT-4o Mini 26 - Fast Cheap $0.15/$0.60
                    </SelectItem>
                    <SelectItem value="anthropic/claude-3.5-haiku-2026">
                      Claude 3.5 Haiku - Sub-ms Latency
                    </SelectItem>
                    <SelectItem value="google/gemini-flash-1.5-8b">
                      Gemini 1.5 Flash 8B - High Throughput
                    </SelectItem>

                    {/* TIER 3: MEDIUM (OpenRouter) */}
                    <div className="px-2 py-1.5 text-xs font-semibold text-yellow-400 flex items-center gap-1 mt-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-400" />
                      TIER 3: MEDIUM (Balanced)
                    </div>
                    <SelectItem value="anthropic/claude-3.5-sonnet">
                      Claude 3.5 Sonnet - Reliable Workhorse
                    </SelectItem>
                    <SelectItem value="openai/gpt-4o-2026">
                      GPT-4o 26 - Standard
                    </SelectItem>
                    <SelectItem value="x-ai/grok-2-vision">
                      Grok 2 Vision - Strong Multimodal
                    </SelectItem>

                    {/* TIER 4: HIGH PERFORMANCE (OpenRouter) */}
                    <div className="px-2 py-1.5 text-xs font-semibold text-orange-400 flex items-center gap-1 mt-2">
                      <span className="w-2 h-2 rounded-full bg-orange-400" />
                      TIER 4: HIGH PERFORMANCE (SOTA)
                    </div>
                    <SelectItem value="anthropic/claude-sonnet-4.5">
                      Claude Sonnet 4.5 - Best Overall Logic
                    </SelectItem>
                    <SelectItem value="openai/gpt-5-turbo">
                      GPT-5 Turbo - Massive Knowledge (128K)
                    </SelectItem>
                    <SelectItem value="deepseek/deepseek-v3.2-speciale">
                      DeepSeek V3.2 Speciale - Reasoning Monster
                    </SelectItem>
                    <SelectItem value="google/gemini-2.0-pro">
                      Gemini 2.0 Pro - 2M Context
                    </SelectItem>
                    <SelectItem value="openai/o3-step-reasoning">
                      OpenAI o3 - Advanced Step Reasoning
                    </SelectItem>

                    {/* TIER 5: EXPERIMENTAL (2026 PREVIEW) */}
                    <div className="px-2 py-1.5 text-xs font-semibold text-pink-400 flex items-center gap-1 mt-2">
                      <span className="w-2 h-2 rounded-full bg-pink-400" />
                      TIER 5: EXPERIMENTAL (2026 PREVIEW)
                    </div>
                    <SelectItem value="google/gemini-3-flash-preview">
                      Gemini 3.0 Pro Flash - Next-Gen Low Latency
                    </SelectItem>
                    <SelectItem value="google/gemini-3-pro-preview">
                      Gemini 3.0 Pro - Multimodal Reasoning SOTA
                    </SelectItem>
                    <SelectItem value="openai/gpt-5.2">
                      GPT-5.2 - The New Standard
                    </SelectItem>
                    <SelectItem value="x-ai/grok-4.1-fast">
                      Grok 4.1 Fast - Real-time Knowledge
                    </SelectItem>
                    <SelectItem value="anthropic/claude-opus-4.5">
                      Claude 4.5 Opus - Ultimate Reasoning
                    </SelectItem>
                    <SelectItem value="mistralai/mistral-large-3">
                      Mistral Large 3 - 41B Active MoE
                    </SelectItem>
                    <SelectItem value="meta-llama/llama-4-maverick-instruct">
                      Llama 4 Maverick - 400B Multimodal MoE
                    </SelectItem>
                    <SelectItem value="qwen/qwen-3-max">
                      Qwen 3 Max - 235B Polyglot SOTA
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
                onChange={(e) => onGroqKeyChange(e.target.value)}
                className="bg-black/50 border-orange-500/30 text-orange-100 font-mono"
              />
              <Button
                onClick={onSaveGroqKey}
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
    </div>
  );
};

export default AiModelsTab;
