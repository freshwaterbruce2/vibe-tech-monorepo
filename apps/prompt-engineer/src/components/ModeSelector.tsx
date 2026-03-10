import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import type { PromptMode } from '@/types';
import { type LucideIcon, Map, MessageCircle, Pencil, Search } from 'lucide-react';

interface ModeSelectorProps {
  value: PromptMode;
  onChange: (value: PromptMode) => void;
}

interface ModeConfig {
  value: PromptMode;
  label: string;
  description: string;
  icon: LucideIcon;
  emoji: string;
  gradient: string;
}

const modes: ModeConfig[] = [
  {
    value: 'plan',
    label: 'Plan',
    description: 'Architecture & design',
    icon: Map,
    emoji: '🗺️',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    value: 'edit',
    label: 'Edit',
    description: 'Code modifications',
    icon: Pencil,
    emoji: '✏️',
    gradient: 'from-violet-500 to-purple-500',
  },
  {
    value: 'review',
    label: 'Review',
    description: 'Analysis & feedback',
    icon: Search,
    emoji: '🔍',
    gradient: 'from-amber-500 to-orange-500',
  },
  {
    value: 'ask',
    label: 'Ask',
    description: 'Questions & help',
    icon: MessageCircle,
    emoji: '💬',
    gradient: 'from-emerald-500 to-teal-500',
  },
];

export function ModeSelector({ value, onChange }: ModeSelectorProps) {
  const currentMode = (modes.find((m) => m.value === value) ?? modes[0])!;
  const CurrentIcon = currentMode.icon;

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
        ⚡ Mode
      </label>
      <Select value={value} onValueChange={(v) => onChange(v as PromptMode)}>
        <SelectTrigger className="w-[180px] h-auto py-2.5 select-fancy border-cyan-200/50 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 group">
          <div className="flex items-center gap-3">
            <div
              className={`p-1.5 rounded-lg bg-gradient-to-br ${currentMode.gradient} text-white transition-transform group-hover:scale-110 group-hover:rotate-3`}
            >
              <CurrentIcon className="h-4 w-4" />
            </div>
            <div className="flex flex-col items-start">
              <span className="font-medium text-foreground">{currentMode.label}</span>
              <span className="text-xs text-muted-foreground">{currentMode.description}</span>
            </div>
          </div>
        </SelectTrigger>
        <SelectContent className="rounded-xl border-cyan-200/50 shadow-xl backdrop-blur-xl bg-white/95 p-1 w-[220px]">
          {modes.map((mode) => {
            const Icon = mode.icon;
            const isSelected = mode.value === value;
            return (
              <SelectItem
                key={mode.value}
                value={mode.value}
                className={`rounded-lg mx-1 my-0.5 cursor-pointer transition-all duration-200 ${isSelected ? 'bg-cyan-50' : 'hover:bg-cyan-50/50'}`}
              >
                <div className="flex items-center gap-3 py-1">
                  <div
                    className={`p-1.5 rounded-lg bg-gradient-to-br ${mode.gradient} text-white shadow-sm`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-medium ${isSelected ? 'text-cyan-700' : ''}`}>
                        {mode.label}
                      </span>
                      <span className="text-sm">{mode.emoji}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{mode.description}</span>
                  </div>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
