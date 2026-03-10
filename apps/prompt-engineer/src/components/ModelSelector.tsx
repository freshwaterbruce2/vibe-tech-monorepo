import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from '@/components/ui/select';
import { models } from '@/config/models';
import type { AIModel } from '@/types';
import { Code, Sparkles, Zap } from 'lucide-react';

interface ModelSelectorProps {
  value: AIModel;
  onChange: (value: AIModel) => void;
}

const modelGroups = {
  Anthropic: {
    models: ['claude-opus-4-6', 'claude-sonnet-4-5', 'claude-haiku-4-5'] as AIModel[],
    icon: Sparkles,
    color: 'text-orange-500',
    bg: 'bg-orange-50',
  },
  Google: {
    models: ['gemini-3-pro', 'gemini-2-5-flash', 'gemini-2-5-pro'] as AIModel[],
    icon: Zap,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50',
  },
  OpenAI: {
    models: ['codex-5-3', 'codex-5-3-spark'] as AIModel[],
    icon: Code,
    color: 'text-sky-500',
    bg: 'bg-sky-50',
  },
};

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const currentModel = models[value];
  const currentProvider =
    Object.entries(modelGroups).find(([, config]) => config.models.includes(value))?.[0] ??
    'Unknown';
  const providerConfig = modelGroups[currentProvider as keyof typeof modelGroups];
  const ProviderIcon = providerConfig?.icon || Sparkles;

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
        🎯 Target Model
      </label>
      <Select value={value} onValueChange={(v) => onChange(v as AIModel)}>
        <SelectTrigger className="w-[240px] h-auto py-2.5 select-fancy border-violet-200/50 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 group">
          <div className="flex items-center gap-3">
            <div
              className={`p-1.5 rounded-lg ${providerConfig?.bg} ${providerConfig?.color} transition-transform group-hover:scale-110`}
            >
              <ProviderIcon className="h-4 w-4" />
            </div>
            <div className="flex flex-col items-start">
              <span className="font-medium text-foreground">{currentModel?.name}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">
                  {currentModel?.context.toLocaleString()}k
                </span>
                {currentModel?.thinking && (
                  <span className="pill text-[10px] py-0">🧠 thinking</span>
                )}
              </div>
            </div>
          </div>
        </SelectTrigger>
        <SelectContent className="rounded-xl border-violet-200/50 shadow-xl backdrop-blur-xl bg-white/95 p-1">
          {Object.entries(modelGroups).map(([provider, config]) => {
            const Icon = config.icon;
            return (
              <SelectGroup key={provider}>
                <SelectLabel className="flex items-center gap-2 px-2 py-2">
                  <div className={`p-1 rounded-md ${config.bg} ${config.color}`}>
                    <Icon className="h-3 w-3" />
                  </div>
                  <span className="font-semibold text-sm">{provider}</span>
                </SelectLabel>
                {config.models.map((modelId) => {
                  const model = models[modelId];
                  const isSelected = modelId === value;
                  return (
                    <SelectItem
                      key={modelId}
                      value={modelId}
                      className={`rounded-lg mx-1 my-0.5 cursor-pointer transition-all duration-200 ${isSelected ? 'bg-violet-50' : 'hover:bg-violet-50/50'}`}
                    >
                      <div className="flex flex-col py-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${isSelected ? 'text-violet-700' : ''}`}>
                            {model.name}
                          </span>
                          {model.thinking && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gradient-to-r from-violet-100 to-purple-100 text-violet-600">
                              🧠
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {model.context.toLocaleString()}k context
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
