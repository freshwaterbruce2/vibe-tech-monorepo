import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { useUserSettings } from '@/hooks/useUserSettings'
import { VoiceActivationMode, VoiceEngine } from '@/types/shipping'
import * as Collapsible from '@radix-ui/react-collapsible'
import { ChevronDown, Mic } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

const VoiceSettings = () => {
  const { settings, updateSetting } = useUserSettings()
  useSpeechRecognition({ engine: 'browser' })
  const [showAdvancedSettings, setShowAdvancedSettings] =
    useState<boolean>(false)

  const handleSettingChange = <K extends keyof typeof settings>(
    key: K,
    value: (typeof settings)[K]
  ) => {
    updateSetting(key, value)
    toast.success(`${String(key)} preference saved!`, {
      description: 'Your setting will be remembered next time you use the app',
      duration: 2000,
    })
  }

  return (
    <div className="pt-4 border-t mt-4">
      <div className="flex items-center mb-2">
        <Mic className="mr-2 h-4 w-4 text-walmart-blue" />
        <Label className="text-base">Voice Commands</Label>
      </div>

      <div className="flex items-center space-x-2 mt-4">
        <Switch
          id="voice-enabled"
          checked={settings.voiceRecognitionEnabled !== false}
          onCheckedChange={checked =>
            handleSettingChange('voiceRecognitionEnabled', checked)
          }
        />
        <Label htmlFor="voice-enabled">Enable Voice Commands</Label>
      </div>

      {settings.voiceRecognitionEnabled !== false && (
        <div className="mt-4 pl-6 space-y-4">
          <div>
            <Label
              htmlFor="voice-activation-mode"
              className="text-sm block mb-2"
            >
              Activation Mode
            </Label>
            <Select
              value={settings.voiceActivationMode ?? 'button'}
              onValueChange={value =>
                handleSettingChange(
                  'voiceActivationMode',
                  value as VoiceActivationMode
                )
              }
            >
              <SelectTrigger id="voice-activation-mode" className="w-[200px]">
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="button">Button Press (Default)</SelectItem>
                <SelectItem value="continuous">Continuous</SelectItem>
                <SelectItem value="hotword">Hotword ("Add Door")</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              {settings.voiceActivationMode === 'hotword'
                ? 'Say "Add Door" to activate voice recognition'
                : settings.voiceActivationMode === 'continuous'
                  ? 'Voice recognition stays active'
                  : 'Press button to activate voice recognition'}
            </p>
          </div>

          <div>
            <Label htmlFor="voice-engine" className="text-sm block mb-2">
              Voice Recognition Engine
            </Label>
            <Select
              value={settings.voiceEngine ?? 'browser'}
              onValueChange={value =>
                handleSettingChange('voiceEngine', value as VoiceEngine)
              }
            >
              <SelectTrigger id="voice-engine" className="w-[200px]">
                <SelectValue placeholder="Select engine" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="browser">Browser (Default)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Browser-based speech recognition works online and provides good
              accuracy.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="noise-suppression"
              checked={settings.noiseSuppression !== false}
              onCheckedChange={checked =>
                handleSettingChange('noiseSuppression', checked)
              }
            />
            <Label htmlFor="noise-suppression" className="text-sm">
              Noise Suppression
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="auto-stop"
              checked={settings.autoStop !== false}
              onCheckedChange={checked =>
                handleSettingChange('autoStop', checked)
              }
            />
            <Label htmlFor="auto-stop" className="text-sm">
              Auto-stop on Success
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="partial-results"
              checked={settings.voiceAcceptPartialResults !== false}
              onCheckedChange={checked =>
                handleSettingChange('voiceAcceptPartialResults', checked)
              }
            />
            <Label htmlFor="partial-results" className="text-sm">
              Accept Partial Results (Faster Response)
            </Label>
          </div>
          <p className="text-xs text-muted-foreground mt-1 ml-6">
            Process commands before speech is complete (may increase errors)
          </p>

          <div>
            <Label
              htmlFor="confidence-threshold"
              className="text-sm block mb-2"
            >
              Confidence Threshold
            </Label>
            <Slider
              id="confidence-threshold"
              min={0.5}
              max={1.0}
              step={0.05}
              value={[settings.confidenceThreshold ?? 0.75]}
              onValueChange={([value]) =>
                handleSettingChange('confidenceThreshold', value)
              }
              className="w-[200px]"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Higher values reduce errors but may require clearer speech
            </p>
          </div>

          <div className="flex items-center space-x-2 mt-2 pt-2 border-t">
            <Switch
              id="speak-back"
              checked={settings.speakBackCommands === true}
              onCheckedChange={checked =>
                handleSettingChange('speakBackCommands', checked)
              }
            />
            <Label htmlFor="speak-back" className="text-sm">
              Voice Feedback
            </Label>
          </div>

          {settings.speakBackCommands && (
            <div className="pl-6 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="voice-volume" className="text-sm">
                    Voice Volume
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {Math.round((settings.voiceVolume ?? 0.8) * 100)}%
                  </span>
                </div>
                <Slider
                  id="voice-volume"
                  defaultValue={[(settings.voiceVolume ?? 0.8) * 100]}
                  max={100}
                  step={5}
                  onValueChange={value =>
                    handleSettingChange('voiceVolume', (value?.[0] ?? 0) / 100)
                  }
                  className="w-full"
                  aria-label="Voice volume control"
                />
              </div>
            </div>
          )}
        </div>
      )}

      <Collapsible.Root
        open={showAdvancedSettings}
        onOpenChange={setShowAdvancedSettings}
        className="mt-4 pt-2"
      >
        <Collapsible.Trigger asChild>
          <button
            type="button"
            className="text-xs px-3 py-2 border rounded hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 transition-colors duration-200"
          >
            <span>
              {showAdvancedSettings
                ? 'Hide Advanced Settings'
                : 'Show Advanced Settings'}
            </span>
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-300 ease-in-out ${
                showAdvancedSettings ? 'transform rotate-180' : ''
              }`}
            />
          </button>
        </Collapsible.Trigger>

        <Collapsible.Content className="overflow-hidden transition-all duration-300 ease-in-out">
          <div
            className={`mt-4 space-y-3 border-t pt-4 transform transition-transform duration-300 ease-in-out ${
              showAdvancedSettings
                ? 'translate-y-0 opacity-100'
                : '-translate-y-2 opacity-0'
            }`}
          >
            <p className="text-sm font-medium">Advanced Voice Settings</p>

            <div className="flex items-center justify-between animate-in fade-in slide-in-from-left-5 duration-300">
              <Label htmlFor="command-timeout" className="text-sm">
                Command Timeout
              </Label>
              <Select
                value={String(settings.commandTimeout ?? 3000)}
                onValueChange={value =>
                  handleSettingChange('commandTimeout', parseInt(value))
                }
              >
                <SelectTrigger
                  id="command-timeout"
                  className="w-[120px] text-sm h-8"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2000">2 seconds</SelectItem>
                  <SelectItem value="3000">3 seconds</SelectItem>
                  <SelectItem value="5000">5 seconds</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2 animate-in fade-in slide-in-from-left-5 duration-300 delay-100">
              <Switch
                id="use-grammar"
                checked={settings.useGrammar !== false}
                onCheckedChange={checked =>
                  handleSettingChange('useGrammar', checked)
                }
              />
              <Label htmlFor="use-grammar" className="text-sm">
                Use Custom Grammar
              </Label>
            </div>
            <p className="text-xs text-muted-foreground animate-in fade-in slide-in-from-left-5 duration-300 delay-200">
              Restricts recognition to warehouse-specific vocabulary
            </p>
          </div>
        </Collapsible.Content>
      </Collapsible.Root>
    </div>
  )
}

export default VoiceSettings
